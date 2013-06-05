goog.provide('sc.data.Databroker');

goog.require('goog.Uri');
goog.require('goog.string');
goog.require('goog.structs.Map');
goog.require('goog.structs.Set');
goog.require('jquery.rdfquery');
goog.require('sc.data.Resource');

goog.require('sc.data.Quad');
goog.require('sc.data.QuadStore');
goog.require('sc.data.DataModel');

goog.require('sc.util.DefaultDict');
goog.require('sc.util.DeferredCollection');
goog.require('sc.util.Namespaces');


/**
 * @class
 *
 * Handles the storage, requesting, and querying of data
 *
 * @author tandres@drew.edu (Tim Andres)
 */
sc.data.Databroker = function(options) {
    if (!options) {
        options = {};
    }
    jQuery.extend(true, this.options, options);

    this.corsEnabledDomains = new goog.structs.Set(this.options.corsEnabledDomains);

    this.namespaces = new sc.util.Namespaces();

    this.quadStore = new sc.data.QuadStore();

    this.requestedUrls = new goog.structs.Set();
    this.receivedUrls = new goog.structs.Set();
    this.failedUrls = new goog.structs.Set();

    this.jqXhrs = new goog.structs.Set();
    this.jqXhrsByUrl = new goog.structs.Map();

    this.rdfByUrl = new goog.structs.Map();
    
    this.newQuadStore = new sc.data.QuadStore();
    this.deletedQuadsStore = new sc.data.QuadStore();

    this.currentProject = null;
    this.allProjects = [];

    this.newResourceUris = new goog.structs.Set();

    this.syncIntervalId = window.setInterval(this.sync.bind(this), sc.data.Databroker.SYNC_INTERVAL);

    this.dataModel = new sc.data.DataModel(this);
};

sc.data.Databroker.SYNC_INTERVAL = 15 * 1000;

sc.data.Databroker.prototype.RESTYPE = {
    'text': 0, 
    'project': 1, 
    'annotation': 2, 
    'user': 3, 
    'resource': 4
};

sc.data.Databroker.prototype.options = {
    proxiedUrlGenerator: function(url) {
        return url;
    },
    imageSourceGenerator: function(url, opt_width, opt_height) {
        if (url.indexOf('stacks.stanford.edu') != -1) {
            url = url.replace('http://', 'https://');

            if (url.indexOf('/image/app/') == -1)
                url = url.replace('/image/', '/image/app/');
        }

        if (opt_width || opt_height)
            url += '?'
        if (opt_width)
            url += 'w=' + String(Math.round(opt_width)) + '&';
        if (opt_height)
            url += 'h=' + String(Math.round(opt_height)) + '&';

        return url;
    },
    corsEnabledDomains: [],
    dmBaseUri: "http://dm.drew.edu/store/",
    restHost: location.host,
    restBasePath: 'store',
    restProtocol: 'http',
    restTextPath: 'texts',
    restProjectPath: 'projects',
    restResourcePath: 'resources',
    restAnnotationPath: 'annotations',
    restUserPath: 'users'
};


/**
 * Returns a proxied url without checking if proxying is necessary.
 * @private
 * @param  {string} url The url to proxy.
 * @return {string} The proxied url.
 */
sc.data.Databroker.prototype._proxyUrl = function(url) {
    return this.options.proxiedUrlGenerator(url);
};

/**
 * Checks to see if the url requires a proxy for ajax access, and
 * returns a proxied url if necessary, or the same url if not.
 * @param  {string} url The url to proxy.
 * @return {[type]} The proxied (or original) url.
 */
sc.data.Databroker.prototype.proxyUrl = function(url) {
    if (this.shouldProxy(url)) {
        return this._proxyUrl(url);
    }
    else {
        return url;
    }
};

/**
 * Determines whether a proxy is required to access the given url with
 * ajax. Returns true iff the host of the url does not match the window's
 * location, or the domain of the url was specified as sending the appropriate
 * CORS headers in the databroker's {corsEnabledDomains} option.
 * @param  {string} url The url to check.
 * @return {boolean} Whether proxying is required.
 */
sc.data.Databroker.prototype.shouldProxy = function(url) {
    var hostname = window.location.hostname;
    var port = window.location.port;

    if (this.corsEnabledDomains.contains(hostname)) {
        return false;
    }
    else {
        var uri = new goog.Uri(url);

        return !(uri.getDomain() == hostname && uri.getPort() == port);
    }
};

/**
 * Registers a prefix for a namespace
 * @param {string} prefix
 * @param {string} fullUri
 */
sc.data.Databroker.prototype.registerNamespace = function(prefix, fullUri) {
    this.namespaces.addNamespace(prefix, fullUri);
};

/**
 * @return {sc.util.namespaces} The namespace utility object associated with the data store.
 */
sc.data.Databroker.prototype.getnamespaces = function() {
    return this.namespaces;
};

/**
 * @return {sc.data.QuadStore} The quad store which holds all rdf data.
 */
sc.data.Databroker.prototype.getQuadStore = function() {
    return this.quadStore;
};

/**
 * Fetches an rdf formatted file, and calls the handler with the jQuery.rdfquery object
 * @param {string} url
 * @param {?function(jQuery.rdfquery, Object, string)} handler
 * @param {?boolean} opt_forceReload false by default to use cached resources.
 */
sc.data.Databroker.prototype.fetchRdf = function(url, handler, opt_forceReload) {
    var self = this;

    if (! jQuery.isFunction(handler)) {
        handler = jQuery.noop;
    }

    this.requestedUrls.add(url);

    var proxiedUrl = this.proxyUrl(url);

    var successHandler = function(data, textStatus, jqXhr) {
        self.receivedUrls.add(url);

        self.processResponse(data, url, jqXhr);

        window.setTimeout(function() {
            handler(jqXhr, data, textStatus);
        }, 1);
    };

    var errorHandler = function(jqXhr, textStatus, errorThrown) {
        self.failedUrls.add(url);
    };

    if (this.jqXhrsByUrl.containsKey(url)) {
        var jqXhr = this.jqXhrsByUrl.get(url);
        jqXhr.done(successHandler).fail(errorHandler);
    }
    else {
        var jqXhr = jQuery.ajax({
            type: 'GET',
            url: proxiedUrl,
            success: successHandler,
            error: errorHandler,
            headers: {
                'Accept': sc.data.Databroker.JQUERY_RDF_READABLE_TYPES.getValues().join(', ')
            }
        });

        this.jqXhrs.add(jqXhr);
        this.jqXhrsByUrl.set(url, jqXhr);
    }

    return jqXhr;
};

sc.data.Databroker.prototype.processResponse = function(data, url, jqXhr) {
    var responseHeaders = jqXhr.getAllResponseHeaders();
    var type = sc.data.Databroker.parseContentType(responseHeaders);

    if (!sc.data.Databroker.isReadableType(type)) {
        console.warn('Rdf in ' + type + ' is not yet supported', url);
    }

    var rdf = jQuery.rdf();
    this.namespaces.setupRdfQueryPrefixes(rdf);

    try {
        rdf.load(data);
    } catch (e) {
        console.error('rdfquery data load error', e, url);

        return;
    }
    
    this.processJQueryRdf(rdf, url, null);
    rdf = null;
};

sc.data.Databroker.CONTENT_TYPE_REGEX = /^Content-Type:\s*([^;\s]*)$/m;

/**
 * Returns the Content-Type value from a response headers string
 * @param {string} responseHeaders
 * @return {string}
 */
sc.data.Databroker.parseContentType = function(responseHeaders) {
    var match = sc.data.Databroker.CONTENT_TYPE_REGEX.exec(responseHeaders);

    if (match) {
        var type = goog.string.trim(match[1]);
        return type;
    }
    else {
        return '';
    }
};

sc.data.Databroker.JQUERY_RDF_READABLE_TYPES = new goog.structs.Set([
    'text/xml',
    'application/xml',
    'application/rdf+xml',
    'text/rdf+xml',
    'text/json',
    'application/json',
    'xml',
    'rdf'
]);

sc.data.Databroker.isReadableType = function(type) {
    return sc.data.Databroker.JQUERY_RDF_READABLE_TYPES.contains(type.toLowerCase());
};

/**
 * Takes a {jQuery.rdf} object and parses its triples, adding them to the quad store
 * @param {jQuery.rdf} rdf
 */
sc.data.Databroker.prototype.processJQueryRdf = function(rdf, url, context) {
    var jqTriples = rdf.databank.triples();

    for (var i = 0, len = jqTriples.length; i < len; i++) {
        var jqTriple = jqTriples[i];

        var quad = sc.data.Quad.createFromRdfqueryTriple(jqTriple, context);
        this.quadStore.addQuad(quad);
    }
};

/**
 * Adds a new locally created quad to the quad store, and keeps a reference
 * to it as new. If the quad was not locally created, the quad store's
 * addQuad method should be called instead.
 *
 * @param {sc.data.Quad} quad The quad to be added.
 */
sc.data.Databroker.prototype.addNewQuad = function(quad) {
    this.quadStore.addQuad(quad);
    this.newQuadStore.addQuad(quad);

    return this;
};

sc.data.Databroker.prototype.addNewQuads = function(quads) {
    goog.structs.forEach(quads, this.addNewQuad, this);

    return this;
};

sc.data.Databroker.prototype.deleteQuad = function(quad) {
    this.quadStore.removeQuad(quad);
    this.deletedQuadsStore.addQuad(quad);

    return this;
};

sc.data.Databroker.prototype.deleteQuads = function(quads) {
    goog.structs.forEach(quads, this.deleteQuad, this);

    return this;
};

sc.data.Databroker.prototype.dumpQuadStore = function(opt_outputType) {
    return this.dumpQuads(this.quadStore.getQuads(), opt_outputType);
};

sc.data.Databroker.prototype.dumpQuads = function(quads, opt_outputType) {
    var rdf = jQuery.rdf();
    this.namespaces.setupRdfQueryPrefixes(rdf);
    
    for (var i=0, len=quads.length; i<len; i++) {
        rdf.add(quads[i].exportToRdfqueryTriple());
    }
    
    return rdf.databank.dump({
        format: opt_outputType || 'application/rdf+xml'
    });
};

sc.data.Databroker.prototype.dumpNewQuads = function(opt_outputType) {
    return this.dumpQuads(this.newQuadStore.getQuads(), opt_outputType);
};

sc.data.Databroker.prototype.postQuads = function(url, quads, opt_handler, opt_format) {
    var dump = this.dumpQuads(quads, opt_format);

    var self = this;
    
    var successHandler = function(data, textStatus, jqXhr) { console.log('received data', data)
        self.processResponse(data, url, jqXhr);
        
        if (jQuery.isFunction(opt_handler)) {
            opt_handler();
        }
    };
    
    var errorHandler = function(jqXhr, textStatus, errorThrown) {
        
    };

    console.log("postQuads url: ", url);
    
    var jqXhr = jQuery.ajax({
        type: 'POST',
        data: dump,
        url: url,
        processData: !jQuery.isXMLDoc(dump),
        success: successHandler,
        error: errorHandler
    });
    
    return jqXhr;
};

sc.data.Databroker.prototype.saveNewQuads = function(url, opt_handler, opt_format) {
    this.postQuads(
        url,
        this.getAllQuadsForSave(this.newQuadStore.getQuads()),
        function() {
            this.newQuadStore.clear();

            if (jQuery.isFunction(opt_handler)) {
                opt_handler.apply(this, arguments);
            }
        }.bind(this),
        opt_format
    );

    return this;
};

sc.data.Databroker.prototype.getAllQuadsForSave = function(quads) {
    var subjectsAndObjects = new goog.structs.Set();
    
    for (var i=0, len=quads.length; i<len; i++) {
        var quad = quads[i];
        
        subjectsAndObjects.add(quad.subject);
        subjectsAndObjects.add(quad.object);
    }
    
    var additionalQuads = [];
    subjectsAndObjects = subjectsAndObjects.getValues();
    
    for (var i=0, len=subjectsAndObjects.length; i<len; i++) {
        var uri = sc.util.Namespaces.angleBracketWrap(subjectsAndObjects[i]);
        
        var relatedQuads = this.quadStore.query(uri, null, null, null);
        additionalQuads = additionalQuads.concat(relatedQuads);
    }
    
    // No need to add original quads, as they've already been included by
    // querying for quads with their subjects
    
    return additionalQuads;
};

/**
 * Returns a set of urls to request for resources, including guesses if no data is known about the resources
 * @param {Array.<string>} uris
 * @return {goog.structs.Set.<string>}
 */
sc.data.Databroker.prototype.getUrlsToRequestForResources = function(uris, opt_forceReload) {
    var urlsToRequest = new goog.structs.Set();
    var allUris = new goog.structs.Set();

    for (var i = 0, len = uris.length; i < len; i++) {
        var uri = uris[i];
        allUris.add(uri);

        allUris.addAll(this.dataModel.findResourcesForCanvas(uri));

        var resource = this.getResource(uri);
        if (resource.hasAnyType(sc.data.DataModel.VOCABULARY.canvasTypes)) {
            var manifestUris = this.dataModel.findManifestsContainingCanvas(uri);
            goog.structs.forEach(manifestUris, function(manifestUri) {
                allUris.addAll(this.dataModel.findManuscriptAggregationUris(manifestUri));
            }, this);
        }
    }

    uris = allUris.getValues();

    for (var i = 0, leni = uris.length; i < leni; i++) {
        var uri = uris[i];

        var describers = this.getResourceDescribers(uri);

        if (describers.length > 0) {
            for (var j = 0, lenj = describers.length; j < lenj; j++) {
                var describer = describers[j];

                if (!opt_forceReload || !this.receivedUrls.contains(describer)) {
                    urlsToRequest.add(describer);
                }
            }
        }
        else if (uri.substring(0, 9) == 'urn:uuid:') {
            continue;
        }
        else {
            urlGuesses = this.guessResourceUrls(uri);
            for (var j = 0, lenj = urlGuesses.length; j < lenj; j++) {
                var url = urlGuesses[j];

                if ((!opt_forceReload || !this.receivedUrls.contains(url)) &&
                    !this.failedUrls.contains(url)) {
                    urlsToRequest.add(url);
                }
            }
        }
    }

    return urlsToRequest;
};

/**
 * Returns a set of urls to request for a resource, including guesses if no data is known about the resource
 * @param {string} uri
 * @return {goog.structs.Set.<string>}
 */
sc.data.Databroker.prototype.getUrlsToRequestForResource = function(uri, opt_forceReload) {
    return this.getUrlsToRequestForResources([uri], opt_forceReload);
};

/**
 * Returns a jQuery.deferred object which will be updated as data is gathered about a resource
 * .done() and .progress() may be called on the returned object to add callback handlers for the loaded
 * resource.
 * @param {string} uri
 * @return {jQuery.deferred}
 */
sc.data.Databroker.prototype.getDeferredResource = function(uri) {
    var self = this;

    var deferredResource = jQuery.Deferred();

    window.setTimeout(function() {
        var urlsToRequest = this.getUrlsToRequestForResource(uri);
        if (urlsToRequest.getCount() == 0) {
            deferredResource.resolveWith(this, [this.getResource(uri), this]);
        }
        else {
            if (this.knowsAboutResource(uri)) {
                deferredResource.notifyWith(this, [this.getResource(uri), this]);
            }

            var deferredCollection = new sc.util.DeferredCollection();

            var urlsToRequestArr = urlsToRequest.getValues();
            for (var i = 0, len = urlsToRequestArr.length; i < len; i++) {
                var url = urlsToRequestArr[i];

                var jqXhr = this.fetchRdf(url, function(rdf, data) {
                    deferredResource.notifyWith(this, [self.getResource(uri), self]);
                });
                deferredCollection.add(jqXhr);
            }

            deferredCollection.allComplete(function(deferreds, collection) {
                if (! collection.areAllFailed()) {
                    deferredResource.resolveWith(this, [self.getResource(uri), self]);
                }
            });

            deferredCollection.allFailed(function(deferreds, collection) {
                var resource = self.getResource(uri);

                if (resource.hasPredicate('ore:isDescribedBy')) {
                    deferredResource.rejectWith(this, [resource, self]);
                }
                else {
                    deferredResource.resolveWith(this, [resource, self]);
                }
            });
        }
    }.bind(this), 0);

    return deferredResource;
};

sc.data.Databroker.prototype.knowsAboutResource = function(uri) {
    uri = sc.util.Namespaces.angleBracketWrap(uri);

    var numQuads = this.quadStore.numQuadsMatchingQuery(uri, null, null, null) +
                   this.quadStore.numQuadsMatchingQuery(null, uri, null, null) +
                   this.quadStore.numQuadsMatchingQuery(null, null, uri, null) +
                   this.quadStore.numQuadsMatchingQuery(null, null, null, uri);
    
    return numQuads > 0;
};

/**
 * @param {Array.<string>} the uris of the resources desired.
 * @return {sc.util.DeferredCollection}
 */
sc.data.Databroker.prototype.getDeferredResourceCollection = function(uris) {
    var collection = new sc.util.DeferredCollection();

    for (var i = 0, len = uris.length; i < len; i++) {
        var uri = uris[i];

        collection.add(this.getDeferredResource(uri));
    }

    return collection;
};

sc.data.Databroker.prototype.dumpResource = function(uri) {
    var equivalentUris = this.getEquivalentUris(uri);
    
    var ddict = new sc.util.DefaultDict(function() {
        return new sc.util.DefaultDict(function () {
            return new goog.structs.Set();
        });
    });
    
    for (var i=0, len=equivalentUris.length; i<len; i++) {
        var equivalentUri = sc.util.Namespaces.angleBracketWrap(equivalentUris[i]);

        this.quadStore.forEachQuadMatchingQuery(
            equivalentUri, null, null, null,
            function(quad) {
                ddict.get('__context__:' + (quad.context == null ? '__global__' : quad.context)).
                    get(this.namespaces.prefix(quad.predicate)).
                    add(sc.util.Namespaces.isUri(quad.object) ? this.namespaces.prefix(quad.object) : quad.object);
            }, this
        );
    }
    
    var dump = {};
    
    goog.structs.forEach(ddict, function(predicates, context) {
        dump[context] = {};
        goog.structs.forEach(predicates, function(objects, predicate) {
            dump[context][predicate] = objects.getValues();
        }, this);
    }, this);
    
    return dump;
};

sc.data.Databroker.prototype.getResource = function(uri) {
    goog.asserts.assert(uri != null, 'uri passed to sc.data.Databroker#getResource is null or undefined');

    if (uri instanceof sc.data.Resource) {
        return new sc.data.Resource(this, uri.uri);
    }
    else {
        uri = sc.util.Namespaces.angleBracketStrip(uri);
        return new sc.data.Resource(this, uri);
    }
};

sc.data.Databroker.prototype.createResource = function(uri, type) {
    var resource = this.getResource(uri || this.createUuid());

    if (type) {
        resource.addProperty('rdf:type', type);
    }
    
    return resource;
};

sc.data.Databroker.prototype.scheduleForSync = function(resource) {
    this.newResourceUris.add(resource.bracketedUri);
};

sc.data.Databroker.prototype.getEquivalentUris = function(uri_s) {
    if (jQuery.isArray(uri_s)) {
        var uris = uri_s;
    }
    else {
        var uris = [uri_s];
    }
    
    var sameUris = new goog.structs.Set();
    
    for (var i=0, len=uris.length; i<len; i++) {
        var uri = uris[i];
        uri = sc.util.Namespaces.angleBracketWrap(uri);
        
        sameUris.add(uri);
        
        if (!sc.util.Namespaces.isUri(uri)) {
            continue
        }

        sameUris.addAll(this.quadStore.subjectsSetMatchingQuery(
            null, this.namespaces.expand('owl', 'sameAs'), uri, null));
        sameUris.addAll(this.quadStore.objectsSetMatchingQuery(
            uri, this.namespaces.expand('owl', 'sameAs'), null, null));
    }
    
    if (sc.util.Namespaces.isAngleBracketWrapped(uris[0])) {
        return sameUris.getValues();
    }
    else {
        return sc.util.Namespaces.angleBracketStrip(sameUris.getValues());
    }
};

sc.data.Databroker.prototype.areEquivalentUris = function(uriA, uriB) {
    uriA = sc.util.Namespaces.angleBracketWrap(uriA);
    uriB = sc.util.Namespaces.angleBracketWrap(uriB);
    
    if (uriA == uriB) {
        return true;
    }

    var numQuads = this.quadStore.numQuadsMatchingQuery(uriA, this.namespaces.expand('owl', 'sameAs'), uriB, null) +
        this.quadStore.numQuadsMatchingQuery(uriB, this.namespaces.expand('owl', 'sameAs'), uriA, null);
    
    return numQuads > 0;
};

sc.data.Databroker.prototype.getUrisSetWithProperty = function(predicate, object) {
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

sc.data.Databroker.prototype.getUrisWithProperty = function(predicate, object) {
    var uris = this.getUrisSetWithProperty(predicate, object);
    
    return sc.util.Namespaces.angleBracketStrip(uris.getValues());
};

sc.data.Databroker.prototype.getPropertiesSetForResource = function(uri, predicate) {
    var equivalentUris = this.getEquivalentUris(uri);
    
    var properties = new goog.structs.Set();
    
    for (var i=0, len=equivalentUris.length; i<len; i++) {
        var equivalentUri = equivalentUris[i];

        properties.addAll(this.quadStore.objectsSetMatchingQuery(
            sc.util.Namespaces.angleBracketWrap(equivalentUri),
            this.namespaces.autoExpand(predicate),
            null,
            null));
    }
    
    return properties;
};

sc.data.Databroker.prototype.getPropertiesForResource = function(uri, predicate) {
    var properties = this.getPropertiesSetForResource(uri, predicate);
    
    if (sc.util.Namespaces.isAngleBracketWrapped(uri)) {
        return properties.getValues();
    }
    else {
        return sc.util.Namespaces.angleBracketStrip(properties.getValues());
    }
};

sc.data.Databroker.FILE_EXTENSION_RE = /^(.*)\.(\w+)$/;
/**
 * When a resource does not specify its describer, this method guesses the url by trying
 * common extensions. Will not return known bad urls, and checks to see if the correct url
 * is already known from previous requests.
 */
sc.data.Databroker.prototype.guessResourceUrls = function(uri) {
    var appendExtensions = function(uri) {
        if (sc.data.Databroker.FILE_EXTENSION_RE.exec(uri)) {
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
            sc.util.Namespaces.isUri(guess)) {
            filteredGuesses.push(guess);
        }
    }

    return filteredGuesses;
};

sc.data.Databroker.prototype.getResourceDescribers = function(uri) {
    uri = sc.util.Namespaces.angleBracketWrap(uri);
    
    var describerUrls = this.getPropertiesSetForResource(uri, 'ore:isDescribedBy');
    if (describerUrls.getCount() == 0) {
        describerUrls.addAll(this.getUrisSetWithProperty('ore:describes', uri));
    }
    
    return sc.util.Namespaces.angleBracketStrip(describerUrls.getValues());
};

sc.data.Databroker.prototype.getResourcePartUris = function(uri) {
    uri = sc.util.Namespaces.angleBracketWrap(uri);
    
    return sc.util.Namespaces.angleBracketStrip(
        this.getUrisWithProperty(sc.data.DataModel.VOCABULARY.isPartOf, uri)
    );
};

sc.data.Databroker.prototype.getResourcesDescribedByUrl = function(url) {
    url = sc.util.Namespaces.angleBracketWrap(url);

    var uris = new goog.structs.Set();

    uris.addAll(this.quadStore.objectsSetMatchingQuery(
        url,
        this.namespaces.expand('ore', 'describes'),
        null,
        null));
    uris.addAll(this.quadStore.subjectsSetMatchingQuery(
        url,
        this.namespaces.expand('ore', 'describes'),
        null,
        null));
    
    return sc.util.Namespaces.angleBracketStrip(uris.getValues());
};

/**
 * Iterates over an rdf:list and returns an array of the list item uris in order
 * @param {string} listUri
 * @return {Array.<string>}
 */
sc.data.Databroker.prototype.getListUrisInOrder = function(listUri) {
    var bracketedListUri = sc.util.Namespaces.angleBracketWrap(listUri);
    
    var uris = [];

    var first = this.getPropertiesForResource(bracketedListUri, 'rdf:first')[0];

    if (!first) {
        return [];
    }

    uris.push(first);

    var rest = this.getPropertiesForResource(bracketedListUri, 'rdf:rest')[0];
    
    var nil = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#nil';

    while (rest && rest != nil &&
           rest != sc.util.Namespaces.angleBracketWrap(nil)) {
        first = this.getPropertiesForResource(rest, 'rdf:first')[0];

        if (first) {
            uris.push(first);
        }
        else {
            console.warn('Malformed sequence:', listUri);
        }

        rest = this.getPropertiesForResource(rest, 'rdf:rest')[0];
    }

    return sc.util.Namespaces.angleBracketStrip(uris);
};

sc.data.Databroker.prototype.getImageSrc = function(uri, opt_width, opt_height) {
    return this.options.imageSourceGenerator(uri, opt_width, opt_height);
};

sc.data.Databroker.prototype.createUuid = function() {
    var uuid = 'urn:uuid:' + goog.string.getRandomString() +
                goog.string.getRandomString() + goog.string.getRandomString();

    if (! this.knowsAboutResource(uuid)) {
        return uuid;
    }
    else {
        return this.createUuid();
    }
};


sc.data.Databroker.prototype.createTextHttpUri = function() {
    var uuid = this.createUuid().replace("/urn\:uuid\:/", "");
    var uri = this.textBaseUri.replace(/\/+$/, "")
        + "/"
        + uuid;
    return uri;
};


sc.data.Databroker.prototype._restUri = function(
    baseUri,
    projectUri,
    resType, 
    resUri, 
    params
) {
    var url = baseUri.replace(/\/+$/, "");
    url += "/";

    if (projectUri != null) {
        url += this.options.restProjectPath.replace(/^\/+|\/+$/g, "");
        url += "/";
        url += projectUri;
        url += "/";
    }

    if (resType == this.RESTYPE.text) {
        url += this.options.restTextPath.replace(/^\/+|\/+$/g, "");
        url += "/";
    } else if (resType == this.RESTYPE.resource) {
        url += this.options.restResourcePath.replace(/^\/+|\/+$/g, "");
        url += "/";
    } else if (resType == this.RESTYPE.annotation) {
        url += this.options.restAnnotationPath.replace(/^\/+|\/+$/g, "");
        url += "/";
    } else if (resType == this.RESTYPE.user) {
        url += this.options.restUserPath.replace(/^\/+|\/+$/g, "");
        url += "/";
    }
    if (resUri != null) {
        url += resUri;
    } 
    if (params != null) {
        url += "?" + jQuery.param(params);
    }

    return url;
};


sc.data.Databroker.prototype.restUrl = function(
    projectUri,
    resType, 
    resUri, 
    params 
) {
    var baseUrl = this.options.restProtocol
        + "://"
        + this.options.restHost.replace(/\/+$/, "")
        + "/"
        + this.options.restBasePath.replace(/^\/+|\/+$/g, "")
        + "/";
    return this._restUri(baseUrl, projectUri, resType, resUri, params);
};


sc.data.Databroker.prototype.restUri = function(
    projectUri,
    resType, 
    resUri, 
    params 
) {
    return this._restUri(this.options.dmBaseUri, projectUri, resType, resUri, params);
};

sc.data.Databroker.prototype.getModifiedResourceUris = function() {
    var subjectsOfNewQuads = this.newQuadStore.subjectsSetMatchingQuery(null, null, null, null);

    return this.newResourceUris.difference(subjectsOfNewQuads);
};

sc.data.Databroker.prototype.postNewResources = function() {
    var xhrs = [];

    goog.structs.forEach(this.newResourceUris, function(uri) {
        var xhr = this.sendResource(uri, 'POST');

        xhrs.push(xhr);
    }, this);

    return xhrs;
};

sc.data.Databroker.prototype.sendResource = function(uri, method) {
    var resource = this.getResource(uri);

    var resType;
    var quadsToPost = [];
    var url;

    if (resource.hasType('dcterms:Text')) {
        resType = this.RESTYPE.text;

        quadsToPost = this.quadStore.query(resource.bracketedUri, null, null, null);

        url = this.restUrl(this.currentProject, resType,
                           sc.util.Namespaces.angleBracketStrip(uri), {});
    }
    else if (resource.hasType('oac:Annotation')) {
        resType = this.RESTYPE.annotation;

        quadsToPost = this.dataModel.findQuadsToSyncForAnno(resource.bracketedUri);

        url = this.restUrl(this.currentProject, resType, null, {});
    }

    var dataDump = this.dumpQuads(quadsToPost, 'application/rdf+xml');

    console.log('about to send resource', uri, dataDump);

    var xhr = jQuery.ajax({
        type: method,
        url: url,
        success: function() {
            console.log('successful sync', arguments);
        },
        error: function() {
            console.error('unsuccessful sync', arguments);
        },
        data: dataDump,
        processData: !jQuery.isXMLDoc(dataDump)
    });

    return xhr;
};

sc.data.Databroker.prototype.putModifiedResources = function() {
    var modifiedUris = this.getModifiedResourceUris();

    var xhrs = [];

    goog.structs.forEach(modifiedUris, function(uri) {
        var xhr = this.sendResource(uri, 'PUT');

        xhrs.push(xhr);
    }, this);

    return xhrs;
};


sc.data.Databroker.prototype.syncResources = function() {
    this.postNewResources();

    this.putModifiedResources();

    this.newResourceUris.clear();
    this.newQuadStore.clear();
};


sc.data.Databroker.prototype.sync = function() {
    // console.log("sc.data.Databroker.sync called.");
    this.syncResources();
};


sc.data.Databroker.prototype.createText = function(title, content) {
    var text = this.createResource(this.createUuid(), 'dctypes:Text');
    return text;
};

sc.data.Databroker.prototype.compareUrisByTitle = function(a, b) {
    return sc.data.Resource.compareByTitle(this.getResource(a), this.getResource(b));
};

sc.data.Databroker.prototype.sortUrisByTitle = function(uris) {
    goog.array.sort(uris, this.compareUrisByTitle.bind(this));
};

sc.data.Databroker.getUri = function(obj) {
    if (obj == null) {
        return null;
    }
    else if (goog.isString(obj)) {
        return sc.util.Namespaces.angleBracketStrip(obj);
    }
    else if (goog.isFunction(obj.getUri)) {
        return obj.getUri();
    }
}

/* Setter & getter methods for current project
 * * (variable already existed)
 * Also created ability to add projects to "allProjects"
 * * (allows cross-check that project is valid in setCurrentProject)
 * * Method should be added to newProject modal's project creation
*/
sc.data.Databroker.prototype.getCurrentProject = function() {
    return this.currentProject;
};

sc.data.Databroker.prototype.setCurrentProject = function(uri) {
    var isValid = false
    for (var i = 0; i < this.allProjects.length; i++) {
        if (this.allProjects[i] == uri) isValid = true;
    };
    
    if (isValid) this.currentProject = uri;
    
    /* Returning "false" when invalid project allows for error to be manipulated
     * and/or otherwise formatted when the function is used
    */
    return isValid;
};

sc.data.Databroker.prototype.getAllProjects = function() {
    return this.allProjects;
};

sc.data.Databroker.prototype.addNewProject = function(uri) {
    var isNewProject = true;
    for (var i = 0; i < this.allProjects.length; i++) {
        if (this.allProjects[i] == uri) isNewProject = false;
    };

    if (isNewProject) this.allProjects.push(uri);

    return isNewProject;
};

sc.data.Databroker.prototype.addResourceToCurrentProject = function(resource) {
    var project = this.getResource(this.currentProject);
    project.addProperty('ore:aggregates', resource);
};



    