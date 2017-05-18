goog.provide('dm.data.Databroker');

goog.require('goog.Uri');
goog.require('goog.string');
goog.require('goog.object');
goog.require('goog.structs.Map');
goog.require('goog.structs.Set');
goog.require('goog.events.Event');
goog.require('goog.events.EventTarget');

goog.require('dm.data.Resource');
goog.require('dm.data.Quad');
goog.require('dm.data.BNode');
goog.require('dm.data.QuadStore');
goog.require('dm.data.Graph');
goog.require('dm.data.DataModel');
goog.require('dm.data.SyncService');
goog.require('dm.data.RDFQueryParser');
goog.require('dm.data.N3Parser');
goog.require('dm.data.NamespaceManager');
goog.require('dm.data.ProjectController');
goog.require('dm.data.RDFQuerySerializer');
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
dm.data.Databroker = function(clientApp) {
    goog.events.EventTarget.call(this);

    this.clientApp = clientApp;

    this.namespaces = new dm.data.NamespaceManager();
    this.quadStore = new dm.data.QuadStore();

    this.basePath = this.clientApp.basePath;
    this.baseUri = [window.location.protocol, "//", window.location.host, this.basePath ].join("");
    this.syncService = new dm.data.SyncService({
        'dmBaseUri': [ this.baseUri, "store"].join("/"),
        'restBasePath' : [this.basePath, "store"].join("/")
    });
    this.syncService.databroker = this;

    this.parsers = [dm.data.N3Parser, dm.data.RDFQueryParser];

    this.serializersByType = {
        'application/rdf+xml': dm.data.RDFQuerySerializer,
        'application/xml': dm.data.RDFQuerySerializer,
        'text/rdf+xml': dm.data.RDFQuerySerializer,
        'text/xml': dm.data.RDFQuerySerializer,
        'application/json': dm.data.RDFQuerySerializer,
        'text/json': dm.data.RDFQuerySerializer,
        'text/turtle': dm.data.TurtleSerializer,
        'text/n3': dm.data.TurtleSerializer
    };

    this.receivedUrls = new goog.structs.Set();
    this.failedUrls = new goog.structs.Set();

    this._bNodeCounter = 0;

    this.newQuadStore = new dm.data.QuadStore();
    this.deletedQuadsStore = new dm.data.QuadStore();

    this.newResourceUris = new goog.structs.Set();
    this.deletedResourceUris = new goog.structs.Set();

    this.hasSyncErrors = false;

    this.dataModel = new dm.data.DataModel(this);
    this.projectController = new dm.data.ProjectController(this);
    this.searchClient = new dm.data.SearchClient(this);

    this.user = this.getResource(this.syncService.restUri(null, dm.data.SyncService.RESTYPE.user, clientApp.username, null));
    var userUrl = this.syncService.restUrl(null, dm.data.SyncService.RESTYPE.user, clientApp.username, null);

    this.quadStore.addQuad(new dm.data.Quad(
        this.user.bracketedUri,
        this.namespaces.expand('ore', 'isDescribedBy'),
        dm.data.Term.wrapUri(userUrl)
    ));
};

goog.inherits(dm.data.Databroker, goog.events.EventTarget);

dm.data.Databroker.SYNC_INTERVAL = 60 * 1000;

/**
 * @return {dm.data.NamespaceManager} The namespace utility object associated with the data store.
 */
dm.data.Databroker.prototype.getNamespaceManager = function() {
    return this.namespaces;
};

/**
 * @return {dm.data.QuadStore} The quad store which holds all rdf data.
 */
dm.data.Databroker.prototype.getQuadStore = function() {
    return this.quadStore;
};

/**
 * Fetches an rdf formatted file, and calls the handler with the jQuery.rdfquery object
 * @param {string} url
 * @param {function(jQuery.rdfquery, Object, string)} [handler]
 */
dm.data.Databroker.prototype.fetchRdf = function(url, handler) {
    var deferred = jQuery.Deferred();

    jQuery.ajax({
        type: 'GET',
        url: url,
        headers: {
            'Accept': [
                'text/turtle',
                'text/n3',
                'text/xml',
                'application/xml',
                'application/rdf+xml',
                'text/rdf+xml',
                'text/json',
                'application/json'
            ].join(', ')
        },
        success: function (data, textStatus, jqXhr) {
            this.receivedUrls.add(url);
            if (data) {
                this.processResponse(data, url, jqXhr, function () {
                    (handler || jQuery.noop).apply(this, arguments);
                    deferred.resolveWith(this, arguments);
                });
            }
            else {
                // Received a successful response with no data, such as a 204
            }
        }.bind(this),
        error: function (jqXhr, textStatus, errorThrown) {
            this.failedUrls.add(url);

            deferred.rejectWith(this, arguments);
        }.bind(this)
    });

    return deferred;
};

dm.data.Databroker.prototype.getNextBNode = function() {
    var node = new dm.data.BNode(this._bNodeCounter);
    this._bNodeCounter ++;
    return node;
};

/**
 * Returns a quad with Blank Nodes guaranteed to be unique in the main quad store.
 * @param  {dm.data.Quad} quad             The quad to make unique
 * @param  {goog.structs.Map} bNodeMapping A reference to a mapping of old BNodes to new BNodes
 *                                         for the current batch of quads (usually one file)
 * @return {dm.data.Quad}                  A guaranteed BNode safe quad.
 */
dm.data.Databroker.prototype.getBNodeHandledQuad = function(quad, bNodeMapping) {
    var modifiedQuad = quad.clone();

    goog.structs.forEach(['subject', 'predicate', 'object', 'context'], function(prop) {
        if (dm.data.Term.isBNode(quad[prop])) {
            if (bNodeMapping.containsKey(quad[prop])) {
                modifiedQuad[prop] = bNodeMapping.get(quad[prop]);
            }
            else {
                var newBNode = this.getNextBNode();
                modifiedQuad[prop] = newBNode;
                bNodeMapping.set(quad[prop], newBNode);
            }
        }
    }, this);

    return modifiedQuad;
};

dm.data.Databroker.prototype.processResponse = function(data, url, jqXhr, handler) {
    var responseHeaders = jqXhr.getAllResponseHeaders();
    var type = dm.data.Parser.parseContentType(responseHeaders);
    this.processRdfData(data, url, type, function(data) {
        var event = new goog.events.Event("read", this);
        event.url = url;
        event.data = data;
        this.dispatchEvent(event);

        handler(data);
    }.bind(this));
};

dm.data.Databroker.prototype.processRdfData = function(data, url, format, handler) {
    var bNodeMapping = new goog.structs.Map();

    this.parseRdf(data, url, format, function(quadBatch, done, error) {
        for (var i = 0, len = quadBatch.length; i < len; i++) {
            var bNodeHandledQuad = this.getBNodeHandledQuad(quadBatch[i], bNodeMapping);
            if (!this.deletedQuadsStore.containsQuad(bNodeHandledQuad)) {
                this.quadStore.addQuad(bNodeHandledQuad);
            }
        }

        if (done) {
            handler(data);
        }
        if (error) {
            console.error(error);
        }
    }.bind(this));
};

dm.data.Databroker.prototype.parseRdf = function(data, url, format, handler) {
    var success = false;
    for (var i = 0, len = this.parsers.length; i < len; i++) {
        var parser = new this.parsers[i](this);

        try {
            parser.parse(data, null, handler);
            success = true;
            break;
        }
        catch (e) {
            console.warn('Parser', parser, 'failed on data', data, 'with error', e);
        }
    }

    if (!success) {
        console.error('RDF could not be parsed', data);
    }
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

    return this;
};

dm.data.Databroker.prototype.deleteQuads = function(quads) {
    goog.structs.forEach(quads, this.deleteQuad, this);
    return this;
};

dm.data.Databroker.prototype.dumpQuadStore = function(opt_outputType) {
    return this.dumpQuads(this.quadStore.getQuads(), opt_outputType);
};

dm.data.Databroker.prototype.serializeQuads = function(quads, opt_format, handler) {
    var format = opt_format || 'application/rdf+xml';
    (new this.serializersByType[format](this)).serialize(quads, format, handler);
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
                if ((!opt_forceReload || !urlsToRequest.contains(url)) && !this.failedUrls.contains(url)) {
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
            .fail(function() { failedFetches.push(url); checkCompletion(); })
            .done(function() { successfulFetches.push(url); checkCompletion(); });
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
    goog.asserts.assert(uri != null, 'uri passed to dm.data.Databroker#getResource is null or undefined');

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

    this.newResourceUris.add(resource.bracketedUri);

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
                uri,
                uri + '.xml',
                uri + '.rdf'//,
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

        if (this.receivedUrls.contains(guess)) {
            return [guess];
        }
    }

    for (var i = 0, len = guesses.length; i < len; i++) {
        var guess = guesses[i];

        if (! this.failedUrls.contains(guess) &&
            dm.data.Term.isUri(guess)) {
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
    return this.syncService.requestSync();
};

dm.data.Databroker.prototype.syncNew = function() {
    return this.syncService.requestSyncNew();
};

dm.data.Databroker.prototype.compareUrisByTitle = function(a, b) {
    return dm.data.Resource.compareByTitle(this.getResource(a), this.getResource(b));
};

dm.data.Databroker.prototype.sortUrisByTitle = function(uris) {
    goog.array.sort(uris, this.compareUrisByTitle.bind(this));
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
