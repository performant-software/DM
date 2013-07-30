goog.provide('sc.data.NamespaceManager');

goog.require('goog.structs.Map');
goog.require('goog.string');

sc.data.NamespaceManager = function (opt_namespacesDict) {
    this.uriByPrefix = new goog.structs.Map(sc.data.NamespaceManager.DEFAULT_NAMESPACES);
    this.prefixByUri = this.uriByPrefix.transpose();

    if (opt_namespacesDict) {
        this.addNamespaces(opt_namespacesDict);
    }
};

sc.data.NamespaceManager.DEFAULT_NAMESPACES = {
    'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
    'dc': 'http://purl.org/dc/elements/1.1/',
    'dcterms': 'http://purl.org/dc/terms/',
    'dctypes': 'http://purl.org/dc/dcmitype/',
    'ore': 'http://www.openarchives.org/ore/terms/',
    'tei': 'http://www.tei-c.org/ns/1.0/',
    'exif': 'http://www.w3.org/2003/12/exif/ns#',
    'oa': 'http://www.w3.org/ns/oa#',
    'dms': 'http://dms.stanford.edu/ns/',
    'sc': 'http://www.shared-canvas.org/ns/',
    'cnt': 'http://www.w3.org/2011/content#',
    'cnt08': 'http://www.w3.org/2008/content#',
    'owl': 'http://www.w3.org/2002/07/owl#',
    'media-types': 'http://purl.org/NET/mediatypes/',
    'perm': 'http://vocab.ox.ac.uk/perm#',
    'foaf': 'http://xmlns.com/foaf/0.1/',
    'dm': 'http://dm.drew.edu/ns/'
};

sc.data.NamespaceManager.prototype.addNamespace = function (prefix, uri) {
    if (uri instanceof sc.data.Uri) {
        uri = uri.unwrapped();
    }

    this.uriByPrefix.set(prefix, uri);
    this.prefixByUri.set(uri, prefix);
};

sc.data.NamespaceManager.prototype.addNamespaces = function(dict) {
    goog.structs.forEach(dict, function(value, key) {
        this.addNamespace(key, value);
    }, this);
};

sc.data.NamespaceManager.prototype.toString = function() {
    var lines = [];

    goog.structs.forEach(this.uriByPrefix, function(uri, prefix) {
        lines.push(['@prefix ', prefix, ': ', sc.data.Term.wrapUri(uri), ' .'].join(''));
    }, this);

    return lines.join('\n');
};

/**
 * Takes an absolute or prefixed namespace, and expands it (if necessary) to its absolute namespace.
 * @param {string} ns
 * @return {string}
 * @throws {string}
 */
sc.data.NamespaceManager.prototype.autoExpand = function (ns) {
    if (ns instanceof sc.data.Resource) {
        return ns.bracketedUri;
    }
    else if (ns instanceof sc.data.Term) {
        return ns.n3();
    }
    else if (sc.data.Term.isWrappedLiteral(ns) ||
        sc.data.Term.isWrappedUri(ns) ||
        sc.data.Term.isBNode(ns) ||
        sc.data.Term.isUri(ns)) {
        return ns;
    }
    else {
        var prefixRegex = /^([^:]+):([^:]+)$/;
        var match = prefixRegex.exec(ns);
        
        if (match) {
            var prefix = match[1];
            var fragment = match[2];
            
            return this.expand(prefix, fragment);
        }
    }
    
    throw "Namespace " + ns + " could not be expanded";
};

sc.data.NamespaceManager.prototype.expand = function(prefix, postfix) {
    var expandedPrefix = this.uriByPrefix.get(prefix);
    if (expandedPrefix) {
        return ['<', expandedPrefix, postfix, '>'].join('');
    }
    else {
        throw "Prefix " + prefix + " is not in the registered namespaces";
    }
};

/**
 * Turns a fully qualified uri into a prefixed version.
 * If a prefix cannot be found, the angle bracket wrapped uri is returned.
 * @param  {string} uri The uri to reduce.
 * @return {string} The complete uri.
 */
sc.data.NamespaceManager.prototype.prefix = function(uri) {
    uri = sc.data.Term.unwrapUri(uri);
    var matchedBaseUri = null;
    var matchedPrefix = null;

    var i = uri.lastIndexOf('/') + 1;
    var guessedBaseUri = uri.substring(0, i);
    var matchedPrefix = this.prefixByUri.get(guessedBaseUri, null);
    if (matchedPrefix) {
        matchedBaseUri = guessedBaseUri;
    }
    else {
        goog.structs.every(this.uriByPrefix, function(baseUri, prefix) {
            if (goog.string.startsWith(uri, baseUri)) {
                matchedBaseUri = baseUri;
                matchedPrefix = prefix;
                return false;
            }
            else {
                return true;
            }
        }, this);
    }

    if (matchedBaseUri && matchedPrefix) {
        return [matchedPrefix, ':', uri.substring(matchedBaseUri.length, uri.length)].join('');
    }
    else if (!sc.data.Term.isBNode(uri)) {
        return sc.data.Term.wrapUri(uri);
    }
    else {
        return uri;
    }
};

sc.data.NamespaceManager.prototype.bindNamespacesToHtmlElement = function(html) {
    var arr = [];

    goog.structs.forEach(this.uriByPrefix, function(uri, prefix) {
        arr.push([prefix, ': ', uri].join(''));
    }, this);

    html.setAttribute('prefix', arr.join('\n'))
};
