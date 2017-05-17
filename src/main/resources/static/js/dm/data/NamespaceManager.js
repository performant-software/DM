goog.provide('dm.data.NamespaceManager');

goog.require('goog.structs.Map');
goog.require('goog.string');

dm.data.NamespaceManager = function (opt_namespacesDict) {
    this.uriByPrefix = new goog.structs.Map(dm.data.NamespaceManager.DEFAULT_NAMESPACES);
    this.prefixByUri = this.uriByPrefix.transpose();

    if (opt_namespacesDict) {
        this.addNamespaces(opt_namespacesDict);
    }
};

dm.data.NamespaceManager.DEFAULT_NAMESPACES = {
    'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
    'dc': 'http://purl.org/dc/elements/1.1/',
    'dcterms': 'http://purl.org/dc/terms/',
    'dctypes': 'http://purl.org/dc/dcmitype/',
    'xsd': 'http://www.w3.org/2001/XMLSchema/',
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

dm.data.NamespaceManager.prototype.addNamespace = function (prefix, uri) {
    if (uri instanceof dm.data.Uri) {
        uri = uri.unwrapped();
    }

    this.uriByPrefix.set(prefix, uri);
    this.prefixByUri.set(uri, prefix);
};

dm.data.NamespaceManager.prototype.addNamespaces = function(dict) {
    goog.structs.forEach(dict, function(value, key) {
        this.addNamespace(key, value);
    }, this);
};

dm.data.NamespaceManager.prototype.toString = function() {
    var lines = [];

    goog.structs.forEach(this.uriByPrefix, function(uri, prefix) {
        lines.push(['@prefix ', prefix, ': ', dm.data.Term.wrapUri(uri), ' .'].join(''));
    }, this);

    return lines.join('\n');
};

/**
 * Takes an absolute or prefixed namespace, and expands it (if necessary) to its absolute namespace.
 * @param {string} ns
 * @return {string}
 * @throws {string}
 */
dm.data.NamespaceManager.prototype.autoExpand = function (ns) {
    if (ns instanceof dm.data.Resource) {
        return ns.bracketedUri;
    }
    else if (ns instanceof dm.data.Term) {
        return ns.n3();
    }
    else if (dm.data.Term.isWrappedLiteral(ns) ||
        dm.data.Term.isWrappedUri(ns) ||
        dm.data.Term.isBNode(ns) ||
        dm.data.Term.isUri(ns)) {
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

dm.data.NamespaceManager.prototype.expand = function(prefix, postfix) {
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
dm.data.NamespaceManager.prototype.prefix = function(uri) {
    uri = dm.data.Term.unwrapUri(uri);
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
    else if (!dm.data.Term.isBNode(uri)) {
        return dm.data.Term.wrapUri(uri);
    }
    else {
        return uri;
    }
};

dm.data.NamespaceManager.prototype.bindNamespacesToHtmlElement = function(html) {
    var arr = [];

    goog.structs.forEach(this.uriByPrefix, function(uri, prefix) {
        arr.push([prefix, ': ', uri].join(''));
    }, this);

    html.setAttribute('prefix', arr.join('\n'));
};
