goog.provide('sc.data.Databroker');

goog.require('goog.Uri');
goog.require('goog.string');
goog.require('goog.structs.Map');
goog.require('goog.structs.Set');
goog.require('jquery.rdfquery');
goog.require('sc.data.Resource');
goog.require('sc.data.Triple');
goog.require('sc.data.TripleStore');
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

    this.namespaceUtil = new sc.util.Namespaces();
    this.tripleStore = new sc.data.TripleStore(this.namespaceUtil);

    this.requestedUrls = new goog.structs.Set();
    this.receivedUrls = new goog.structs.Set();
    this.failedUrls = new goog.structs.Set();

    this.jqXhrs = new goog.structs.Set();
    this.jqXhrsByUrl = new goog.structs.Map();

    this.rdfByUrl = new goog.structs.Map();
    
    this.newTriples = [];

    this.textResources = {};
    this.modifiedResources = {};
    this.deletedResources = {};

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
    corsEnabledDomains: []
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
 * @enum
 * Annotation predicates and types
 */
sc.data.Databroker.ANNO_NS = {
    hasTarget: '<http://www.openannotation.org/ns/hasTarget>',
    hasBody: '<http://www.openannotation.org/ns/hasBody>',
    imageAnno: '<http://dms.stanford.edu/ns/ImageAnnotation>',
    constrains: '<http://www.openannotation.org/ns/constrains>',
    constrainedBy: '<http://www.openannotation.org/ns/constrainedBy>',
    constraint: '<http://www.openannotation.org/ns/ConstrainedBody>',
    isPartOf: '<http://purl.org/dc/terms/isPartOf>'
};

/**
 * Registers a prefix for a namespace
 * @param {string} prefix
 * @param {string} fullUri
 */
sc.data.Databroker.prototype.registerNamespace = function(prefix, fullUri) {
    this.namespaceUtil.addNamespace(prefix, fullUri);
};

/**
 * @return {sc.util.NamespaceUtil} The namespace utility object associated with the data store.
 */
sc.data.Databroker.prototype.getNamespaceUtil = function() {
    return this.namespaceUtil;
};

/**
 * @return {sc.data.TripleStore} The triple store which holds all rdf data.
 */
sc.data.Databroker.prototype.getTripleStore = function() {
    return this.tripleStore;
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
    this.namespaceUtil.setupRdfQueryPrefixes(rdf);

    try {
        rdf.load(data);
    } catch (e) {
        console.error('rdfquery data load error', e, url);

        return;
    }
    
    this.processJQueryRdf(rdf, url);
};

/**
 * Returns the Content-Type value from a response headers string
 * @param {string} responseHeaders
 * @return {string}
 */
sc.data.Databroker.parseContentType = function(responseHeaders) {
    var contentTypeRegex = /^Content-Type:\s*([^;\s]*)$/m;
    var match = contentTypeRegex.exec(responseHeaders);

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
 * Takes a {jQuery.rdf} object and parses its triples, adding them to the triple store
 * @param {jQuery.rdf} rdf
 */
sc.data.Databroker.prototype.processJQueryRdf = function(rdf, url) {
    var jqTriples = rdf.databank.triples();

    for (var i = 0, len = jqTriples.length; i < len; i++) {
        var jqTriple = jqTriples[i];

        var triple = sc.data.Triple.createFromRdfqueryTriple(jqTriple);
        triple.setSource(url);

        this.tripleStore.addTriple(triple);
    }
};

/**
 * Adds a new locally created triple to the triple store, and keeps a reference
 * to it as new. If the triple was not locally created, the triple store's
 * addTriple method should be called instead.
 *
 * @param {sc.data.Triple} triple The triple to be added.
 */
sc.data.Databroker.prototype.addNewTriple = function(triple) {
    this.tripleStore.addTriple(triple);
    
    this.newTriples.push(triple);
};

sc.data.Databroker.prototype.addNewTriples = function(triples) {
    for (var i=0, len=triples.length; i<len; i++) {
        this.addNewTriple(triples[i]);
    }
};

sc.data.Databroker.prototype.dumpTripleStore = function(opt_outputType) {
    return this.dumpTriples(this.tripleStore.getAllTriples(), opt_outputType);
};

sc.data.Databroker.prototype.dumpTriples = function(triples, opt_outputType) {
    var rdf = jQuery.rdf();
    this.namespaceUtil.setupRdfQueryPrefixes(rdf);
    
    for (var i=0, len=triples.length; i<len; i++) {
        var triple = triples[i];

        var jQueryTriple = jQuery.rdf.triple(
            triple.subject,
            triple.predicate,
            triple.object
        );
        
        rdf.add(jQueryTriple);
    }
    
    return rdf.databank.dump({
        format: opt_outputType || 'application/rdf+xml'
    });
};

sc.data.Databroker.prototype.dumpNewTriples = function(opt_outputType) {
    return this.dumpTriples(this.newTriples, opt_outputType);
};

sc.data.Databroker.prototype.postTriples = function(url, triples, opt_handler, opt_format) {
    var dump = this.dumpTriples(triples, opt_format);

    var self = this;
    
    var successHandler = function(data, textStatus, jqXhr) { console.log('received data', data)
        self.processResponse(data, url, jqXhr);
        
        if (jQuery.isFunction(opt_handler)) {
            opt_handler();
        }
    };
    
    var errorHandler = function(jqXhr, textStatus, errorThrown) {
        
    };
    
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

sc.data.Databroker.prototype.saveNewTriples = function(url, opt_handler, opt_format) {
    var self = this;
    
    this.postTriples(url, this.getAllTriplesForSave(this.newTriples),
                     function() {
                     self.newTriples = [];
                     
                     if (jQuery.isFunction(opt_handler)) {
                         opt_handler.apply(this, arguments);
                     }
                     }, opt_format);
};

sc.data.Databroker.prototype.getAllTriplesForSave = function(triples) {
    var subjectsAndObjects = new goog.structs.Set();
    
    for (var i=0, len=triples.length; i<len; i++) {
        var triple = triples[i];
        
        subjectsAndObjects.add(triple.subject);
        subjectsAndObjects.add(triple.object);
    }
    
    var additionalTriples = [];
    subjectsAndObjects = subjectsAndObjects.getValues();
    
    for (var i=0, len=subjectsAndObjects.length; i<len; i++) {
        var uri = subjectsAndObjects[i];
        
        var relatedTriples = this.tripleStore.getTriplesWithSubject(uri);
        additionalTriples = additionalTriples.concat(relatedTriples);
    }
    
    // No need to add original triples, as they've already been included by
    // querying for triples with their subjects
    
    return additionalTriples;
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

        var resourcesForCanvas = sc.util.Namespaces.stripAngleBrackets(
            this.getUrisWithProperty(
                'dms:forCanvas',
                 sc.util.Namespaces.wrapWithAngleBrackets(uri)
            )
        );
        allUris.addAll(resourcesForCanvas);
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
        var resourceTypes = this.getResourceTypesSet(uri);

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
    uri = sc.util.Namespaces.wrapWithAngleBrackets(uri);
    
    var triples = this.tripleStore.getTriplesWithSubject(uri);
    
    return triples.length > 0;
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
                                        return new goog.structs.Set();});
    
    for (var i=0, len=equivalentUris.length; i<len; i++) {
        var equivalentUri = equivalentUris[i];
        equivalentUri = sc.util.Namespaces.wrapWithAngleBrackets(equivalentUri);
        
        var resourceDump = 
        this.tripleStore.dumpResource(equivalentUri);
        
        for (var predicate in resourceDump) {
            if (resourceDump.hasOwnProperty(predicate)) {
                ddict.get(predicate).addAll(resourceDump[predicate]);
            }
        }
    }
    
    var dump = {};
    
    var predicates = ddict.getKeys();
    for (var i=0, len=predicates.length; i<len; i++) {
        var predicate = predicates[i];
        var objects = ddict.get(predicate).getValues();
        
        dump[predicate] = objects;
    }
    
    return dump;
};

sc.data.Databroker.prototype.getResource = function(uri) {
    uri = sc.util.Namespaces.stripAngleBrackets(uri);
    return new sc.data.Resource(this, uri);
};

sc.data.Databroker.prototype.createResource = function(uri, type) {
    uri = sc.util.Namespaces.wrapWithAngleBrackets(uri);
    
    var triple = new sc.data.Triple(
        uri,
        this.namespaceUtil.autoExpand('rdf:type'),
        this.namespaceUtil.autoExpand(type)
    );
    
    this.addNewTriple(triple);
    
    return this.getResource(uri);
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
        uri = sc.util.Namespaces.wrapWithAngleBrackets(uri);
        
        sameUris.add(uri);
        
        if (!sc.util.Namespaces.isUri(uri)) {
            continue
        }
        
        sameUris.addAll(this.tripleStore.getSubjectsSetWithPredicateAndObject(
            'owl:sameAs',
            uri
        ));
        
        sameUris.addAll(this.tripleStore.getObjectsSetWithSubjectAndPredicate(
            uri,
            'owl:sameAs'
        ));
    }
    
    if (sc.util.Namespaces.isAngleBracketWrapped(uris[0])) {
        return sameUris.getValues();
    }
    else {
        return sc.util.Namespaces.stripAngleBrackets(sameUris.getValues());
    }
};

/**
 *
 * Note: Although this implementation is slightly more complex, it is
 * much more efficient than checking against the values returned by the
 * getEquivalentUris method.
 */
sc.data.Databroker.prototype.areEquivalentUris = function(uriA, uriB) {
    uriA = sc.util.Namespaces.wrapWithAngleBrackets(uriA);
    uriB = sc.util.Namespaces.wrapWithAngleBrackets(uriB);
    
    if (uriA == uriB) {
        return true;
    }
    
    var set1 = this.tripleStore.getSubjectsSetWithPredicateAndObject(
        'owl:sameAs',
        uriA
    );
    
    var set2 = this.tripleStore.getSubjectsSetWithPredicateAndObject(
        'owl:sameAs',
        uriB
    );
    
    var set3 = this.tripleStore.getObjectsSetWithSubjectAndPredicate(
        uriA,
        'owl:sameAs'
    );
    
    var set4 = this.tripleStore.getObjectsSetWithSubjectAndPredicate(
        uriB,
        'owl:sameAs'
    );
    
    return (set1.contains(uriB) || set2.contains(uriA) || set3.contains(uriB) ||
            set4.contains(uriA));
};

sc.data.Databroker.prototype.getUrisSetWithProperty = function(predicate, object) {
    var equivalentObjects = this.getEquivalentUris(object);
    
    var uris = new goog.structs.Set();
    
    for (var i=0, len=equivalentObjects.length; i<len; i++) {
        var equivalentObject = equivalentObjects[i];
        
        uris.addAll(this.tripleStore.getSubjectsSetWithPredicateAndObject(
            predicate,
            equivalentObject
        ));
    }
    
    return uris;
};

sc.data.Databroker.prototype.getUrisWithProperty = function(predicate, object) {
    var uris = this.getUrisSetWithProperty(predicate, object);
    
    return sc.util.Namespaces.stripAngleBrackets(uris.getValues());
};

sc.data.Databroker.prototype.getPropertiesSetForResource = function(uri, predicate) {
    var equivalentUris = this.getEquivalentUris(uri);
    
    var properties = new goog.structs.Set();
    
    for (var i=0, len=equivalentUris.length; i<len; i++) {
        var equivalentUri = equivalentUris[i];
        
        properties.addAll(this.tripleStore.getObjectsSetWithSubjectAndPredicate(
            equivalentUri,
            predicate
        ));
    }
    
    return properties;
};

sc.data.Databroker.prototype.getPropertiesForResource = function(uri, predicate) {
    var properties = this.getPropertiesSetForResource(uri, predicate);
    
    if (sc.util.Namespaces.isAngleBracketWrapped(uri)) {
        return properties.getValues();
    }
    else {
        return sc.util.Namespaces.stripAngleBrackets(properties.getValues());
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

/**
 * Returns a list of the uris of resources that list the given resource uri as a target or a body
 * @param {string} resourceUri
 * @param {?string} opt_annoType the specific type of anno for which to return uris.
 * @return {Array.<string>}
 */
sc.data.Databroker.prototype.getResourceAnnoIds = function(resourceUri, opt_annoType) {
    var set = new goog.structs.Set();
    set.addAll(this.getResourceBodyAnnoIds(resourceUri, opt_annoType));
    set.addAll(this.getResourceTargetAnnoIds(resourceUri, opt_annoType));

    return set.getValues();
};

/**
 * Returns a list of the uris of resources that list the given resource uri as a target
 * @param {string} resourceUri
 * @param {?string} opt_annoType the specific type of anno for which to return uris.
 * @return {Array.<string>}
 */
sc.data.Databroker.prototype.getResourceTargetAnnoIds = function(resourceUri, opt_annoType) {
    resourceUri = sc.util.Namespaces.wrapWithAngleBrackets(resourceUri);
    
    var annoIds = this.getUrisSetWithProperty(sc.data.Databroker.ANNO_NS.hasTarget, resourceUri);

    if (! opt_annoType) {
        return sc.util.Namespaces.stripAngleBrackets(annoIds.getValues());
    }
    else {
        var type = this.namespaceUtil.autoExpand(opt_annoType);

        var typedAnnoIds = this.getUrisSetWithProperty('rdf:type', type);
        
        var intersection = typedAnnoIds.intersection(annoIds);
        return sc.util.Namespaces.stripAngleBrackets(intersection.getValues());
        // Because of google's set implementation, this particular way
        // of finding the intersection is quite efficient
    }
};

/**
 * Returns a list of the uris of resources that list the given resource uri as a body
 * @param {string} resourceUri
 * @param {?string} opt_annoType the specific type of anno for which to return uris.
 * @return {Array.<string>}
 */
sc.data.Databroker.prototype.getResourceBodyAnnoIds = function(resourceUri, opt_annoType) {
    resourceUri = sc.util.Namespaces.wrapWithAngleBrackets(resourceUri);
    
    var annoIds = this.getUrisSetWithProperty(sc.data.Databroker.ANNO_NS.hasBody, resourceUri);

    if (! opt_annoType) {
        return annoIds.getValues();
    }
    else {
        var type = this.namespaceUtil.autoExpand(opt_annoType);

        var typedAnnoIds = this.getUrisSetWithProperty('rdf:type', type);

        var intersection = typedAnnoIds.intersection(annoIds);
        return sc.util.Namespaces.stripAngleBrackets(intersection.getValues()); // Because of google's set implementation, this particular way
        // of finding the intersection is quite efficient
    }
};

/**
 * Returns a list of the uris of the images for a given canvas (which are given by image annotations on that canvas)
 * @param {string} canvasUri
 * @return {Array.<string>}
 */
sc.data.Databroker.prototype.getCanvasImageUris = function(canvasUri) {
    var annoIds = this.getResourceTargetAnnoIds(canvasUri, sc.data.Databroker.ANNO_NS.imageAnno);

    var imageUris = new goog.structs.Set();

    for (var i = 0, len = annoIds.length; i < len; i++) {
        var annoId = annoIds[i];
        annoId = sc.util.Namespaces.wrapWithAngleBrackets(annoId);

        var bodyUris = this.getPropertiesForResource(annoId, sc.data.Databroker.ANNO_NS.hasBody);
        for (var j = 0, lenj = bodyUris.length; j < lenj; j++) {
            var bodyUri = bodyUris[j];
            var bodyResource = this.getResource(bodyUri);

            if (bodyResource.hasAnyType('dms:Image', 'dms:ImageBody', '<http://purl.org/dc/dcmitype/Image>')) {
                imageUris.add(bodyUri);
            }
            else if (bodyResource.hasType('dms:ImageChoice')) {
                var optionUris = bodyResource.getProperties('dms:option');
                imageUris.addAll(optionUris);
            }
            else {
                imageUris.add(bodyUri);
            }
        }

        imageUris.addAll(bodyUris);
    }

    return sc.util.Namespaces.stripAngleBrackets(imageUris.getValues());
};

/**
 * Returns a set of the rdf:type values for a given resource uri
 * @param uri {string}
 * @return {goog.structs.Set.<string>}
 */
sc.data.Databroker.prototype.getResourceTypesSet = function(uri) {
    return this.getPropertiesSetForResource(uri, 'rdf:type');
};

/**
 * Returns a list of the rdf:type values for a given resource uri
 * @param uri {string}
 * @return {Array.<string>}
 */
sc.data.Databroker.prototype.getResourceTypes = function(uri) {
    return this.getResourceTypesSet(uri).getValues();
};

sc.data.Databroker.prototype.getResourceDescribers = function(uri) {
    uri = sc.util.Namespaces.wrapWithAngleBrackets(uri);
    
    var describerUrls = this.getPropertiesSetForResource(uri, 'ore:isDescribedBy');
    if (describerUrls.getCount() == 0) {
        describerUrls.addAll(this.getUrisSetWithProperty('ore:describes', uri));
    }
    
    return sc.util.Namespaces.stripAngleBrackets(describerUrls.getValues());
};

sc.data.Databroker.prototype.getResourcePartUris = function(uri) {
    uri = sc.util.Namespaces.wrapWithAngleBrackets(uri);
    
    return sc.util.Namespaces.stripAngleBrackets(
        this.getUrisWithProperty(sc.data.Databroker.ANNO_NS.isPartOf, uri)
    );
};

sc.data.Databroker.prototype.getConstraintUrisOnResource = function(uri) {
    var resourceParts = this.getResourcePartUris(uri);

    var urisToCheck = resourceParts.concat([uri]);
    var annoUrisSet = new goog.structs.Set();

    for (var i = 0, len = urisToCheck.length; i < len; i++) {
        var partUri = urisToCheck[i];

        var annoIds = this.getResourceTargetAnnoIds(partUri);
        annoUrisSet.addAll(annoIds);
    }

    var annoUris = annoUrisSet.getValues();
    var bodyUris = [];
    for (var i = 0, len = annoUris.length; i < len; i++) {
        var annoUri = annoUris[i];

        var bodies = this.getPropertiesForResource(annoUri, sc.data.Databroker.ANNO_NS.hasBody);
        bodyUris = bodyUris.concat(bodies);
    }

    var typedConstraintIds = this.getUrisSetWithProperty(sc.data.Databroker.ANNO_NS.constraint);

    var constraintIds = typedConstraintIds.intersection(bodyUris);
    return sc.util.Namespaces.stripAngleBrackets(constraintIds.getValues());
};

sc.data.Databroker.prototype.getConstraintValuesOnResource = function(uri) {
    var constraintIds = this.getConstraintUrisOnResource(uri);

    var values = new goog.structs.Set();
    for (var i = 0, len = constraintIds.length; i < len; i++) {
        var constraintId = constraintIds[i];

        var constraintNodeIds = this.getPropertiesForResource(constraintId, sc.data.Databroker.ANNO_NS.constrainedBy);
        for (var j = 0, lenj = constraintNodeIds.length; j < lenj; j++) {
            var constraintNodeId = constraintNodeIds[j];
            var constraintValues = this.getPropertiesForResource(constraintNodeId, 'cnt:chars');

            values.addAll(constraintValues);
        }
    }

    return sc.util.Namespaces.stripWrappingQuotes(values.getValues());
};

sc.data.Databroker.prototype.getResourcesDescribedByUrl = function(url) {
    url = sc.util.Namespaces.wrapWithAngleBrackets(url);
    var uris = this.tripleStore.getObjectsWithSubjectAndPredicate(
        url, 
        'ore:describes'
    );
    if (uris.length == 0) {
        uris = this.tripleStore.getSubjectsWithPredicateAndObject(
            'ore:isDescribedBy',
            url
        );
    }
    
    return sc.util.Namespaces.stripAngleBrackets(uris);
};

/**
 * Returns every uri which an aggregation aggregates (in effect, the contents of an aggregation)
 * @param {string} aggregationUri
 * @return {Array.<string>}
 */
sc.data.Databroker.prototype.getAggregationContentsUris = function(aggregationUri) {
    aggregationUri = sc.util.Namespaces.wrapWithAngleBrackets(aggregationUri);
    
    return sc.util.Namespaces.stripAngleBrackets(this.getPropertiesForResource(aggregationUri, 'ore:aggregates'));
};

/**
 * Returns the uris of resources aggregated into a manuscript, but does not include those which are labeled as being for
 * a specific canvas
 */
sc.data.Databroker.prototype.getManuscriptAggregationUris = function(manifestUri) {
    var aggregationUris = this.getAggregationContentsUris(manifestUri);

    var uris = new goog.structs.Set();

    for (var i = 0, len = aggregationUris.length; i < len; i++) {
        var aggregationUri = aggregationUris[i];

        var aggregationResource = this.getResource(aggregationUri);
        if (! aggregationResource.hasPredicate('dms:forCanvas')) {
            uris.add(aggregationUri);
        }
    }

    return sc.util.Namespaces.stripAngleBrackets(uris.getValues());
};

/**
 * Iterates over an rdf:list and returns an array of the list item uris in order
 * @param {string} listUri
 * @return {Array.<string>}
 */
sc.data.Databroker.prototype.getListUrisInOrder = function(listUri) {
    var bracketedListUri = sc.util.Namespaces.wrapWithAngleBrackets(listUri);
    
    var uris = [];

    var first = this.getPropertiesForResource(bracketedListUri, 'rdf:first')[0];

    if (!first) {
        return [];
    }

    uris.push(first);

    var rest = this.getPropertiesForResource(bracketedListUri, 'rdf:rest')[0];
    
    var nil = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#nil';

    while (rest && rest != nil &&
           rest != sc.util.Namespaces.wrapWithAngleBrackets(nil)) {
        first = this.getPropertiesForResource(rest, 'rdf:first')[0];

        if (first) {
            uris.push(first);
        }
        else {
            console.warn('Malformed sequence:', listUri);
        }

        rest = this.getPropertiesForResource(rest, 'rdf:rest')[0];
    }

    return sc.util.Namespaces.stripAngleBrackets(uris);
};

sc.data.Databroker.prototype.getManuscriptSequenceUris = function(manifestUri) {
    manifestUri = sc.util.Namespaces.wrapWithAngleBrackets(manifestUri);
    
    var aggregateUris = this.getPropertiesForResource(manifestUri, 'ore:aggregates');

    var allSequences = this.tripleStore.getSubjectsSetWithType('dms:Sequence');

    var intersection = allSequences.intersection(aggregateUris);
    return sc.util.Namespaces.stripAngleBrackets(intersection.getValues());
};

sc.data.Databroker.prototype.getManuscriptImageAnnoUris = function(manifestUri) {
     manifestUri = sc.util.Namespaces.wrapWithAngleBrackets(manifestUri);
    
    var aggregateUris = this.getPropertiesForResource(manifestUri, 'ore:aggregates');

    var allImageAnnos = this.tripleStore.getSubjectsSetWithType('dms:ImageAnnotationList');

    var intersection = allImageAnnos.intersection(aggregateUris);
    return sc.util.Namespaces.stripAngleBrackets(intersection.getValues());
};

sc.data.Databroker.getConstraintAttrsFromUri = function(constraintUri) {
    var baseEndIndex = constraintUri.indexOf('#');
    var baseUri = constraintUri.substring(0, baseEndIndex);
    var constraintString = constraintUri.substring(baseEndIndex, constraintUri.length);

    var xywhRegex = /#xywh\s*=\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*$/;
    var xywhMatch = xywhRegex.exec(constraintUri);
    if (xywhMatch) {
        return {
            type: 'box',
            width: xywhMatch[3],
            height: xywhMatch[4],
            x: xywhMatch[1],
            y: xywhMatch[2],
            baseUri: baseUri,
            originalUri: constraintUri,
            constraintString: constraintString
        };
    }

    var timecodeRegex = /#t\s*=\s*npt:\s*([\d:]+)\s*,\s*([\d:]+)\s*$/;
    var timecodeMatch = timecodeRegex.exec(constraintUri);
    if (timecodeMatch) {
        var startTimecode = timecodeMatch[1];
        var endTimecode = timecodeMatch[2];
        var startSeconds = sc.data.Databroker.timecodeToSeconds(startTimecode);
        var endSeconds = sc.data.Databroker.timecodeToSeconds(endTimecode);
        return {
            type: 'timecode',
            startTimecode: startTimecode,
            endTimecode: endTimecode,
            startSeconds: startSeconds,
            endSeconds: endSeconds,
            baseUri: baseUri,
            originalUri: constraintUri,
            constraintString: constraintString
        };
    }
};

sc.data.Databroker.timecodeToSeconds = function(timecode) {
    var numColons = goog.string.countOf(timecode, ':');
    var numColonsToAdd = 3 - numColons;
    for (var i = 0; i < numColonsToAdd; i++) {
        timecode = '00:' + timecode;
    }

    var timecodeRegex = /(\d+):(\d+):(\d+):(\d+)/;
    var match = timecodeRegex.exec(timecode);

    var days = Number(match[1]);
    var hours = Number(match[2]);
    var minutes = Number(match[3]);
    var seconds = Number(match[4]);

    var time = seconds + minutes * 60 + hours * 3600 + days * 86400;

    return time;
};

sc.data.Databroker.prototype.getImageSrc = function(uri, opt_width, opt_height) {
    return this.options.imageSourceGenerator(uri, opt_width, opt_height);
};

sc.data.Databroker.prototype.createUuid = function() {
    var uuid = 'urn:uuid:' + goog.string.getRandomString() +
                goog.string.getRandomString() + goog.string.getRandomString();

    if (! this.tripleStore.containsResource(uuid)) {
        return uuid;
    }
    else {
        return this.createUuid();
    }
};

/**
 * Returns the urls of the source files from which triples about a given uri were loaded. 
 * @param  {string} uri The uri to search for.
 * @return {Array.<string>} An array of source urls.
 */
sc.data.Databroker.prototype.getSourceUrls = function(uri) {
    uri = sc.util.Namespaces.wrapWithAngleBrackets(uri);

    var triples = this.tripleStore.getTriplesWithSubject(uri).concat(
        this.tripleStore.getTriplesWithObject(uri)
    );

    var sources = new goog.structs.Set();

    for (var i=0, len=triples.length; i<len; i++) {
        var triple = triples[i];

        sources.add(triple.getSource());
    }

    return sources.getValues();
};


sc.data.Databroker.prototype.syncResources = function() {
    for (var uri in this.modifiedResources) {
        if (this.modifiedResources.hasOwnProperty(uri)) {
            if (this.modifiedResources[uri] == 'text') {
                var res = this.textResources[uri];
                var paramStr = jQuery.param(res.attr);
                console.log("resource to sync:");
                console.log("\t uri: ", uri);
                console.log("\t content: ", res.content);
                console.log("\t params: ", paramStr);
                /*
                    var jqXhr = jQuery.ajax({
                        type: 'POST',
                        data: dump,
                        url: url,
                        processData: !jQuery.isXMLDoc(dump),
                        success: successHandler,
                        error: errorHandler
                    });
                */
            }
        }
    }
}


sc.data.Databroker.prototype.sync = function() {
    console.log("sc.data.Databroker.sync called.");
    this.syncResources();
}


sc.data.Databroker.prototype.updateTextResource = function(uri, content, attr) {
    this.textResources[uri] = {
        'content': content,
        'attr': attr
    };
    this.modifiedResources[uri] = 'text';
};


sc.data.Databroker.prototype.addTextResource = function(uri, title, content) {
    this.updateTextResource(uri, title, content);
};


sc.data.Databroker.prototype.createAnno = function(bodyUri, targetUri, opt_annoType) {
    var anno = this.getResource(this.createUuid());
    anno.addProperty(
        this.namespaceUtil.autoExpand('rdf:type'),
        this.namespaceUtil.autoExpand('oac:Annotation')
    );

    if (opt_annoType) {
        anno.addProperty(
            this.namespaceUtil.autoExpand('rdf:type'),
            this.namespaceUtil.autoExpand(opt_annoType)
        );
    }

    if (bodyUri) {
        anno.addProperty(
            sc.data.Databroker.ANNO_NS.hasBody,
            sc.util.Namespaces.wrapWithAngleBrackets(bodyUri)
        );
    }

    if (targetUri) {
        anno.addProperty(
            sc.data.Databroker.ANNO_NS.hasTarget,
            sc.util.Namespaces.wrapWithAngleBrackets(targetUri)
        );
    }

    return anno;
};


