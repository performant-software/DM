/* global jQuery, DM */

goog.provide('dm.data.Databroker');

goog.require('goog.Uri');
goog.require('goog.string');
goog.require('goog.object');
goog.require('goog.structs.Map');
goog.require('goog.structs.Set');
goog.require('goog.events.Event');
goog.require('goog.events.EventTarget');

goog.require("n3.parser");

goog.require('dm.data.Resource');
goog.require('dm.data.Quad');
goog.require('dm.data.BNode');
goog.require('dm.data.QuadStore');
goog.require('dm.data.Graph');
goog.require('dm.data.DataModel');
goog.require('dm.data.NamespaceManager');
goog.require('dm.data.ProjectController');
goog.require('dm.data.SearchClient');
goog.require('dm.data.Term');
goog.require('dm.data.TurtleSerializer');

goog.require('dm.util.DefaultDict');
goog.require('dm.util.DeferredCollection');

/**
 * @class
 *
 * Handles the storage, requesting, and querying of data
 *
 * @author tandres@drew.edu (Tim Andres)
 */
dm.data.Databroker = function(basePath, username) {
    goog.events.EventTarget.call(this);

    this.baseUri = [
        window.location.protocol, "//",
        window.location.host, basePath
    ].join("");

    this._bNodeCounter = 0;
    this.namespaces = new dm.data.NamespaceManager();

    this.quadStore = new dm.data.QuadStore();
    this.newQuadStore = new dm.data.QuadStore();
    this.deletedQuadsStore = new dm.data.QuadStore();


    this.dataModel = new dm.data.DataModel(this);
    this.projectController = new dm.data.ProjectController(this);
    this.searchClient = new dm.data.SearchClient(this);

    this.user = undefined;
    this.userDataLoad = this.getDeferredResource(
        this.userUrl(username)
    ).done(function(user) { this.user = user; }.bind(this));
};

goog.inherits(dm.data.Databroker, goog.events.EventTarget);

dm.data.Databroker.prototype.readRdf = function(data) {
    var result = jQuery.Deferred();
    var quads = [];

    if (!data) {
        // Received a successful response with no data, such as a 204
        return result.resolveWith(this, [quads]);
    }

    try {
        var bNodeMapping = new goog.structs.Map();
        (new N3Parser()).parse(data, function(error, triple) {
            if (error) {
                result.rejectWith(this, [error]);
                return;
            }

            if (triple) {
                var quad = new dm.data.Quad(
                    this.wrapTerm(triple.subject),
                    this.wrapTerm(triple.predicate),
                    this.wrapTerm(triple.object)
                );

                var mappedQuad = quad.clone();
                goog.structs.forEach(
                    ['subject', 'predicate', 'object', 'context'],
                    function(prop) {
                        if (!dm.data.Term.isBNode(quad[prop])) {
                            return;
                        }
                        if (bNodeMapping.containsKey(quad[prop])) {
                            mappedQuad[prop] = bNodeMapping.get(quad[prop]);
                        } else {
                            bNodeMapping.set(
                                quad[prop],
                                mappedQuad[prop] = new dm.data.BNode(
                                    this._bNodeCounter++
                                )
                            );
                        }
                    },
                    this
                );

                quads.push(mappedQuad);

                if (!this.deletedQuadsStore.containsQuad(mappedQuad)) {
                    this.quadStore.addQuad(mappedQuad);
                }
                return;
            }

            result.resolveWith(this, [quads]);
        }.bind(this));
    }
    catch (error) {
        result.rejectWith(this, [error]);
    }

    return result;
};

dm.data.Databroker.prototype.fetchRdf = function(url) {
    var request = jQuery.ajax({
        type: 'GET',
        url: url,
        headers: { 'Accept': 'text/turtle, text/n3' }
    });

    request = request.then(this.readRdf.bind(this));

    request = request.fail(function() {
        return jQuery.Deferred().rejectWith(this, [arguments]);
    }.bind(this));

    return request;
};

dm.data.Databroker.prototype.wrapTerm = function(str) {
    if (str.substring(0, 2) == '_:') {
        // BNode
        return str;
    }
    if (str[0] != '"') {
        // URI
        return ['<', str.replace(/>/g, '\\>'), '>'].join('');
    }


    var literalEnd = str.indexOf('"^^');
    if (literalEnd < 0) {
        literalEnd = str.length - 1;
    }

    str = [
        '"',
        dm.data.Term._escapeLiteral(str.substring(1, literalEnd)),
        str.substring(literalEnd)
    ].join("");

    return str;
};

/**
 * Adds a new locally created quad to the quad store, and keeps a reference
 * to it as new. If the quad was not locally created, the quad store's
 * addQuad method should be called instead.
 *
 * @param {dm.data.Quad} quad The quad to be added.
 */
dm.data.Databroker.prototype.addNewQuad = function(quad) {
    var isActuallyNew = !this.quadStore.containsQuad(quad);

    this.quadStore.addQuad(quad);
    if (isActuallyNew) {
        this.newQuadStore.addQuad(quad);
        this.deletedQuadsStore.removeQuad(quad);
    }

    return this;
};

dm.data.Databroker.prototype.addNewQuads = function(quads) {
    goog.structs.forEach(quads, this.addNewQuad, this);

    return this;
};

dm.data.Databroker.prototype.deleteQuad = function(quad) {
    this.quadStore.removeQuad(quad);
    this.deletedQuadsStore.addQuad(quad);
    this.newQuadStore.removeQuad(quad);

    return this;
};

dm.data.Databroker.prototype.deleteQuads = function(quads) {
    goog.structs.forEach(quads, this.deleteQuad, this);
    return this;
};

/**
 * Returns a set of urls to request for resources, including guesses if no data is known about the resources
 * @param {Array.<string>} uris
 * @return {goog.structs.Set.<string>}
 */
dm.data.Databroker.prototype.getUrlsToRequestForResources = function(uris, opt_forceReload, opt_noGuesses) {
    var urlsToRequest = new goog.structs.Set();
    var allUris = new goog.structs.Set();

    for (var i = 0, len = uris.length; i < len; i++) {
        var uri = uris[i];
        allUris.add(uri);

        allUris.addAll(this.dataModel.findResourcesForCanvas(uri));

        var resource = this.getResource(uri);
        if (resource.hasAnyType(dm.data.DataModel.VOCABULARY.canvasTypes)) {
            var manifestUris = this.dataModel.findManifestsContainingCanvas(uri);
            goog.structs.forEach(manifestUris, function(manifestUri) {
                allUris.addAll(this.dataModel.findManuscriptAggregationUris(manifestUri));
            }, this);
        }
        else if (resource.hasAnyType('oa:SpecificResource') && this.getResourceDescribers(resource.uri) === 0) {
            allUris.add(resource.getOneProperty('oa:hasSource'));
        }
    }

    uris = allUris.getValues();

    for (var i = 0, leni = uris.length; i < leni; i++) {
        var uri = uris[i];

        var describers = this.getResourceDescribers(uri);

        if (describers.length > 0) {
            for (var j = 0, lenj = describers.length; j < lenj; j++) {
                var describer = decodeURIComponent(describers[j]);
                if (!opt_forceReload || !urlsToRequest.contains(describer)) {
                    urlsToRequest.add(describer);
                }
            }
        }
        else if (uri.substring(0, 9) == 'urn:uuid:') {
            continue;
        }
        else if (!opt_noGuesses) {
            urlGuesses = this.guessResourceUrls(uri);
            for (var j = 0, lenj = urlGuesses.length; j < lenj; j++) {
                var url = decodeURIComponent(urlGuesses[j]);
                if (!opt_forceReload || !urlsToRequest.contains(url)) {
                    urlsToRequest.add(url);
                }
            }
        }
    }

    return urlsToRequest;
};

/**
 * Returns a jQuery.deferred object which will be updated as data is gathered about a resource
 * .done() and .progress() may be called on the returned object to add callback handlers for the loaded
 * resource.
 * @param {string} uri
 * @return {jQuery.deferred}
 */
dm.data.Databroker.prototype.getDeferredResource = function(uri) {
    var self = this;

    uri = (uri instanceof dm.data.Resource) ? uri.uri : dm.data.Term.unwrapUri(uri);

    var deferredResource = jQuery.Deferred();

    var urlsToRequest = this.getUrlsToRequestForResources([uri]);
    if (urlsToRequest.getCount() == 0) {
        return deferredResource.resolveWith(this, [this.getResource(uri), this]);
    }

    var deferredFetches = [""];
    var failedFetches = [];
    var successfulFetches = [];

    var checkCompletion = function() {
        if ((failedFetches.length + successfulFetches.length) == deferredFetches.length) {
            var resource = self.getResource(uri);
            if (successfulFetches.length) {
                deferredResource.notifyWith(self, [resource, self]).resolveWith(self, [resource, self]);
            } else {
                deferredResource.rejectWith(self, [resource, self]);
            }
        }
    }

    urlsToRequest.getValues().forEach(function(url) {
        deferredFetches.push(url);
        this.fetchRdf(url)
            .fail(function(url) {
                console.error(arguments);
                failedFetches.push(url);
                checkCompletion();
            })
            .done(function() {
                successfulFetches.push(url);
                checkCompletion();
            });
    }, this);

    successfulFetches.push("");
    checkCompletion();

    return deferredResource;

};

dm.data.Databroker.prototype.knowsAboutResource = function(uri) {
    var resource = this.getResource(uri);

    var numQuads = 0;

    goog.structs.forEach(this.getEquivalentUris(resource.bracketedUri), function(uri) {
        numQuads += this.quadStore.numQuadsMatchingQuery(uri, null, null, null) +
                    this.quadStore.numQuadsMatchingQuery(null, uri, null, null) +
                    this.quadStore.numQuadsMatchingQuery(null, null, uri, null) +
                    this.quadStore.numQuadsMatchingQuery(null, null, null, uri);
    }, this);

    return numQuads > 0;
};

dm.data.Databroker.prototype.hasResourceData = function(uri) {
    var resource = this.getResource(uri);

    var numQuads = 0;

    goog.structs.forEach(this.getEquivalentUris(resource.bracketedUri), function(uri) {
        numQuads += this.quadStore.numQuadsMatchingQuery(uri, null, null, null);
    }, this);

    return numQuads > 0;
};

/**
 * @param {Array.<string>} the uris of the resources desired.
 * @return {dm.util.DeferredCollection}
 */
dm.data.Databroker.prototype.getDeferredResourceCollection = function(uris) {
    var collection = new dm.util.DeferredCollection();

    for (var i = 0, len = uris.length; i < len; i++) {
        var uri = uris[i];

        collection.add(this.getDeferredResource(uri));
    }

    return collection;
};

dm.data.Databroker.prototype.getResource = function(uri) {
    goog.asserts.assert(
        uri != null,
        'uri passed to dm.data.Databroker#getResource is null or undefined'
    );

    var graph = new dm.data.Graph(this.quadStore, null);

    if (uri instanceof dm.data.Resource) {
        return new dm.data.Resource(this, graph, uri.uri);
    }
    else {
        uri = dm.data.Term.unwrapUri(uri);
        return new dm.data.Resource(this, graph, uri);
    }
};

dm.data.Databroker.prototype.createResource = function(uri, type) {
    var resource = this.getResource(uri || this.createUuid());

    if (this.hasResourceData(resource)) {
        throw "Resource " + resource.uri + " already exists";
    }

    if (this.user) {
        resource.addProperty('dc:creator', this.user);
    }

    resource.addProperty('dc:created', dm.data.DateTimeLiteral(new Date()));

    if (type) {
        resource.addProperty('rdf:type', type);
    }

    return resource;
};

dm.data.Databroker.prototype.getEquivalentUris = function(uri_s) {
    if (jQuery.isArray(uri_s)) {
        var uris = uri_s;
    }
    else {
        var uris = [uri_s];
    }

    var sameUris = new goog.structs.Set();

    for (var i=0, len=uris.length; i<len; i++) {
        var uri = uris[i];
        uri = dm.data.Term.wrapUri(uri);

        sameUris.add(uri);

        if (!dm.data.Term.isUri(uri)) {
            continue;
        }

        sameUris.addAll(this.quadStore.subjectsSetMatchingQuery(
            null, this.namespaces.expand('owl', 'sameAs'), uri, null));
        sameUris.addAll(this.quadStore.objectsSetMatchingQuery(
            uri, this.namespaces.expand('owl', 'sameAs'), null, null));
    }

    if (dm.data.Term.isWrappedUri(uris[0])) {
        return sameUris.getValues();
    }
    else {
        return dm.data.Term.unwrapUri(sameUris.getValues());
    }
};

dm.data.Databroker.prototype.areEquivalentUris = function(uriA, uriB) {
    uriA = dm.data.Term.wrapUri(uriA);
    uriB = dm.data.Term.wrapUri(uriB);

    if (uriA == uriB) {
        return true;
    }

    var numQuads = this.quadStore.numQuadsMatchingQuery(uriA, this.namespaces.expand('owl', 'sameAs'), uriB, null) +
        this.quadStore.numQuadsMatchingQuery(uriB, this.namespaces.expand('owl', 'sameAs'), uriA, null);

    return numQuads > 0;
};

dm.data.Databroker.prototype.getUrisSetWithProperty = function(predicate, object) {
    var equivalentObjects = this.getEquivalentUris(object);

    var uris = new goog.structs.Set();

    for (var i=0, len=equivalentObjects.length; i<len; i++) {
        var equivalentObject = equivalentObjects[i];

        uris.addAll(this.quadStore.subjectsSetMatchingQuery(
            null,
            this.namespaces.autoExpand(predicate),
            this.namespaces.autoExpand(object),
            null));
    }

    return uris;
};

dm.data.Databroker.prototype.getUrisWithProperty = function(predicate, object) {
    var uris = this.getUrisSetWithProperty(predicate, object);

    return dm.data.Term.unwrapUri(uris.getValues());
};

dm.data.Databroker.prototype.getPropertiesSetForResource = function(uri, predicate) {
    var equivalentUris = this.getEquivalentUris(uri);

    var properties = new goog.structs.Set();

    for (var i=0, len=equivalentUris.length; i<len; i++) {
        var equivalentUri = equivalentUris[i];

        properties.addAll(this.quadStore.objectsSetMatchingQuery(
            dm.data.Term.wrapUri(equivalentUri),
            this.namespaces.autoExpand(predicate),
            null,
            null));
    }

    return properties;
};

dm.data.Databroker.prototype.getPropertiesForResource = function(uri, predicate) {
    var properties = this.getPropertiesSetForResource(uri, predicate);

    if (dm.data.Term.isWrappedUri(uri)) {
        return properties.getValues();
    }
    else {
        return dm.data.Term.unwrapUri(properties.getValues());
    }
};

dm.data.Databroker.FILE_EXTENSION_RE = /^(.*)\.(\w+)$/;
/**
 * When a resource does not specify its describer, this method guesses the url by trying
 * common extensions. Will not return known bad urls, and checks to see if the correct url
 * is already known from previous requests.
 */
dm.data.Databroker.prototype.guessResourceUrls = function(uri) {
    var appendExtensions = function(uri) {
        if (dm.data.Databroker.FILE_EXTENSION_RE.test(uri) || goog.string.endsWith(uri, '/')) {
            return [uri];
        }
        else {
            return [
                uri//,
                //uri + '.xml',
                //uri + '.rdf',
                //uri + '.n3',
                //uri + '.ttl'
            ];
        }
    };

    var guesses = [];

    var equivalentUris = this.getEquivalentUris(uri);
    for (var i=0, len=equivalentUris.length; i<len; i++) {
        var equivalentUri = equivalentUris[i];

        guesses = guesses.concat(appendExtensions(equivalentUri));
    }

    var filteredGuesses = [];

    for (var i = 0, len = guesses.length; i < len; i++) {
        var guess = guesses[i];

        if (dm.data.Term.isUri(guess)) {
            filteredGuesses.push(guess);
        }
    }

    return filteredGuesses;
};

dm.data.Databroker.prototype.getResourceDescribers = function(uri) {
    uri = dm.data.Term.wrapUri(uri);

    var describerUrls = this.getPropertiesSetForResource(uri, 'ore:isDescribedBy');
    if (describerUrls.getCount() == 0) {
        describerUrls.addAll(this.getUrisSetWithProperty('ore:describes', uri));
    }

    return dm.data.Term.unwrapUri(describerUrls.getValues());
};

dm.data.Databroker.prototype.getResourcesDescribedByUrl = function(url) {
    url = dm.data.Term.wrapUri(url);

    var uris = new goog.structs.Set();

    uris.addAll(this.quadStore.objectsSetMatchingQuery(
        url,
        this.namespaces.expand('ore', 'describes'),
        null,
        null));
    uris.addAll(this.quadStore.subjectsSetMatchingQuery(
        null,
        this.namespaces.expand('ore', 'isDescribedBy'),
        url,
        null));

    return dm.data.Term.unwrapUri(uris.getValues());
};

/**
 * Iterates over an rdf:list and returns an array of the list item uris in order
 * @param {string} listUri
 * @return {Array.<string>}
 */
dm.data.Databroker.prototype.getListUrisInOrder = function(listUri) {
    var list = this.getResource(listUri);
    var uris = [];

    var firstUri = list.getOneProperty('rdf:first');
    if (!firstUri) {
        return [];
    }
    uris.push(firstUri);

    var restUri = list.getOneProperty('rdf:rest');

    var nilUri = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#nil';

    while (restUri && restUri != nilUri) {
        var rest = this.getResource(restUri);
        firstUri = rest.getOneProperty('rdf:first');

        if (firstUri) {
            uris.push(firstUri);
        }
        else {
            console.warn('Malformed sequence:', list.uri);
        }

        restUri = rest.getOneProperty('rdf:rest');
    }

    return uris;
};

dm.data.Databroker.prototype.getImageSrc = function(uri, opt_width, opt_height) {
    if (opt_width && opt_height) {
        if (window.devicePixelRatio) {
            opt_width *= window.devicePixelRatio;
            opt_height *= window.devicePixelRatio;
        }

        uri += '?';
        if (opt_width)
            uri += 'w=' + String(Math.round(opt_width)) + '&';
        if (opt_height)
            uri += 'h=' + String(Math.round(opt_height)) + '&';
    }

    return uri;
};

dm.data.Databroker.prototype.createUuid = function() {
    var uuid = 'urn:uuid:' + goog.string.getRandomString() +
                goog.string.getRandomString() + goog.string.getRandomString();

    if (! this.knowsAboutResource(uuid)) {
        return uuid;
    }
    else {
        return this.createUuid();
    }
};

dm.data.Databroker.prototype.sync = function() {
    var updated = this.newQuadStore.clear();
    var removed = this.deletedQuadsStore.clear();

    if (updated.length == 0 && removed.length == 0) {
        return jQuery.Deferred().resolveWith(this, [updated, removed]);
    }

    var projectUri = this.projectController.currentProject.uri;
    var request = jQuery.ajax({
        type: "PUT",
        url: [this.projectUrl(projectUri), "synchronize"].join("/"),
        data: {
            update: (updated.length == 0
                     ? ""
                     : new dm.data.TurtleSerializer(this).serialize(updated)),
            remove: (removed.length == 0
                     ? ""
                     : new dm.data.TurtleSerializer(this).serialize(removed))
        }
    });

    request = request.then(function(response) {
        DM.dataSynchronized({
            success: true,
            date: (new Date()).toISOString(),
            updated: updated,
            removed: removed
        });
        return jQuery.Deferred().resolveWith(this, [updated, removed]);
    });

    request = request.fail(function(response) {
        DM.dataSynchronized({
            success: false,
            date: (new Date()).toISOString(),
            updated: updated,
            removed: removed
        });
        console.error(arguments);
    });

    return request;
};

dm.data.Databroker.prototype.compareUrisByTitle = function(a, b) {
    return dm.data.Resource.compareByTitle(this.getResource(a), this.getResource(b));
};

dm.data.Databroker.prototype.sortUrisByTitle = function(uris) {
    goog.array.sort(uris, this.compareUrisByTitle.bind(this));
};

dm.data.Databroker.prototype.uploadCanvas = function(title, file) {
    var projectUri = this.projectController.currentProject.uri;

    var result = jQuery.Deferred();
    var notify = function() { result.notifyWith(this, arguments); }.bind(this);
    var resolve = function() { result.resolveWith(this, arguments); }.bind(this);
    var reject = function() { result.rejectWith(this, arguments); }.bind(this);

    var data = new FormData();
    data.append('title', title);
    data.append('image_file', file);

    var xhr = new XMLHttpRequest();
    xhr.addEventListener('load', function(event) {
        var xhr = event.target;
        if (goog.string.startsWith(String(xhr.status), '2')) {
            this.readRdf(xhr.responseText).done(resolve).fail(reject);
        } else {
            reject.apply(arguments);
        }
    }.bind(this));

    xhr.addEventListener('progress', notify);
    xhr.addEventListener('error', reject);
    xhr.addEventListener('abort', reject);

    xhr.open('POST', this.canvasUploadUrl(projectUri));
    xhr.send(data);

    return result;
};

dm.data.Databroker.getUri = function(obj) {
    if (obj == null) {
        return null;
    }
    else if (goog.isString(obj)) {
        return dm.data.Term.unwrapUri(obj);
    }
    else if (goog.isFunction(obj.getUri)) {
        return obj.getUri();
    }
    else if (obj instanceof dm.data.Uri) {
        return obj.unwrapped();
    }
};

dm.data.Databroker.prototype.annotsDeleted = function(deleted) {
    var projectUri = this.projectController.currentProject.uri;
    return $.ajax({
        url : this.projectLinkRemovalUrl(projectUri),
        method : "POST",
        data: { uuids: deleted.join() }
    });
};


dm.data.Databroker.prototype.projectUrl = function(projectUri) {
    return [this.baseUri, "store", "projects", projectUri].join("/");
};

dm.data.Databroker.prototype.projectShareUrl = function(projectUri) {
    return [this.projectUrl(projectUri), "share"].join("/");
};

dm.data.Databroker.prototype.projectDownloadUrl = function(projectUri) {
    return [this.projectUrl(projectUri), "download"].join("/");
};

dm.data.Databroker.prototype.projectLinkRemovalUrl = function(projectUri) {
    return [this.projectUrl(projectUri), "removed"].join("/");
};

dm.data.Databroker.prototype.userUrl = function(user) {
    return [this.baseUri, "store", "users", user].join("/");
};

dm.data.Databroker.prototype.canvasUploadUrl = function(projectUri) {
    return [this.projectUrl(projectUri), "canvases", "create"].join("/");
};

dm.data.Databroker.prototype.searchUrl = function(projectUri, query, limit) {
    return [
        [this.projectUrl(projectUri), "search"].join("/"),
        jQuery.param({ q: query, limit: limit || 2000 })
    ].join("?");
};

dm.data.Databroker.prototype.searchAutoCompleteUrl = function(projectUri, prefix) {
    return [
        [this.projectUrl(projectUri), "search_autocomplete"].join("/"),
        jQuery.param({ q: prefix })
    ].join("?");
};
