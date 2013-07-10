goog.provide('sc.util.Namespaces');

goog.require('goog.structs.Map');
goog.require('goog.string');
goog.require('jquery.jQuery');

sc.util.Namespaces = function (opt_namespacesDict) {
    this.uriByPrefix = new goog.structs.Map(sc.util.Namespaces.DEFAULT_NAMESPACES);
    this.prefixByUri = this.uriByPrefix.transpose();

    if (opt_namespacesDict) {
        this.addNamespaces(opt_namespacesDict);
    }
};

sc.util.Namespaces.DEFAULT_NAMESPACES = {
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

sc.util.Namespaces.prototype.addNamespace = function (prefix, uri) {
    this.uriByPrefix.set(prefix, uri);
    this.prefixByUri.set(uri, prefix);
};

sc.util.Namespaces.prototype.addNamespaces = function(dict) {
    goog.structs.forEach(dict, function(value, key) {
        this.addNamespace(key, value);
    }, this);
};

sc.util.Namespaces.prototype.toString = function() {
    var lines = [];

    goog.structs.forEach(this.uriByPrefix, function(uri, prefix) {
        lines.push(['@prefix ', prefix, ': ', sc.util.Namespaces.angleBracketWrap(uri), ' .'].join(''));
    }, this);

    return lines.join('\n');
};

sc.util.Namespaces.isAngleBracketWrapped = function(str) {
    return str.charAt(0) == '<' && str.charAt(str.length - 1) == '>';
};

sc.util.Namespaces.angleBracketStrip = function (str) {
    var remover = function(str) {
        if (sc.util.Namespaces.isAngleBracketWrapped(str)) {
            str = str.substring(1, str.length - 1);
            return str.replace(/\\>/g, '>');
        }
        else {
            return str;
        }
    };
    
    if (goog.isArray(str)) {
        var ret = [];
        
        for (var i=0, len=str.length; i<len; i++) {
            ret.push(remover(str[i]));
        }
        
        return ret;
    }
    else {
        return remover(str);
    }
};

sc.util.Namespaces.angleBracketWrap = function(str) {
    if (str instanceof sc.data.Resource) {
        return str.bracketedUri;
    }
    else if (sc.util.Namespaces.isAngleBracketWrapped(str) ||
        sc.util.Namespaces.isBNode(str)) {
        return str;
    }
    else {
        return ['<', str.replace(/>/g, '\\>'), '>'].join('');
    }
};

sc.util.Namespaces._escapeLiteral = function(str) {
    return str.replace(/("|\\|>|\^)/g, '\\$1').replace(/(\t)/g, '\\t');
};

sc.util.Namespaces._unescapeLiteral = function(str) {
    return str.replace(/(?:\\(")|\\(\\)|\\(>)|\\(\^))/g, '$1').replace(/(\\t)/g, '\t')
};

sc.util.Namespaces.quoteWrap = function(str) {
    str = sc.util.Namespaces._escapeLiteral(str);
    return ['"', str, '"'].join('');
};

sc.util.Namespaces.isQuoteWrapped = function(str) {
    if ((str.charAt(0) == '"') && (str.charAt(str.length - 1) == '"') && (str.charAt(str.length - 2) != '\\')) {
        return true;
    } else if (sc.util.Namespaces.quotesAndDatatypeRegex.test(str)) {
        return true;
    } else {
        return false;
    }
};

sc.util.Namespaces.stripWrappingQuotes = function(str) {
    var remover = function(str) {
        if (sc.util.Namespaces.isQuoteWrapped(str)) {
            return sc.util.Namespaces._unescapeLiteral(str.substring(1, str.length - 1));
        }
        else {
            return str;
        }
    };
    
    if (goog.isArray(str)) {
        var ret = [];
        
        for (var i=0, len=str.length; i<len; i++) {
            ret.push(remover(str[i]));
        }
        
        return ret;
    }
    else {
        return remover(str);
    }
};

sc.util.Namespaces.quotesAndDatatypeRegex = /^"(.*)"\^\^<(.*)>$/;

sc.util.Namespaces.stripQuotesAndDatatype = function(str) {
    var remover = function(str) {
        var match = sc.util.Namespaces.quotesAndDatatypeRegex.exec(str);
        
        if (match) {
            return sc.util.Namespaces._unescapeLiteral(match[1]);
        }
        else {
            return sc.util.Namespaces.stripWrappingQuotes(str);
        }
    };
    
    if (goog.isArray(str)) {
        var ret = [];
        
        for (var i=0, len=str.length; i<len; i++) {
            ret.push(remover(str[i]));
        }
        
        return ret;
    }
    else {
        return remover(str);
    }
};

sc.util.Namespaces.isLiteral = function(str) {
    return sc.util.Namespaces.isQuoteWrapped(str);
};

sc.util.Namespaces.wrapLiteral = function(literal) {
    return sc.util.Namespaces.quoteWrap(literal);
};

sc.util.Namespaces.unwrapLiteral = function(literal) {
    return sc.util.Namespaces.stripQuotesAndDatatype(literal);
};

sc.util.Namespaces.isWrappedUri = function(str) {
    return this.isAngleBracketWrapped(str);
};

sc.util.Namespaces.wrapUri = function(uri) {
    return sc.util.Namespaces.angleBracketWrap(uri);
};

sc.util.Namespaces.unwrapUri = function(uri) {
    return sc.util.Namespaces.angleBracketStrip(uri);
};

sc.util.Namespaces.xmlSafeCharsByChar = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&apos;'
};

sc.util.Namespaces.charsByXmlEquivalent = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&apos;': '\''
};

sc.util.Namespaces.escapeForXml = function(str) {
    var escaper = function(s) {
        if ( typeof s === 'number' )
            return s.toString();
        
        for (var entity in sc.util.Namespaces.xmlSafeCharsByChar) {
            s = s.replace(new RegExp(entity, 'g'),
                          sc.util.Namespaces.xmlSafeCharsByChar[entity]);
        }
        
        return s;
    }
    
    if (goog.isArray(str)) {
        var ret = [];
        
        for (var i=0, len=str.length; i<len; i++) {
            ret.push(escaper(str[i]));
        }
        
        return ret;
    }
    else {
        return escaper(str);
    }
};

sc.util.Namespaces.unescapeFromXml = function(str) {
    var unescaper = function(s) {
        if ( typeof s === 'number' )
            return s.toString();
        
        for (var entity in sc.util.Namespaces.charsByXmlEquivalent) {
            s = s.replace(new RegExp(entity, 'g'),
                          sc.util.Namespaces.charsByXmlEquivalent[entity]);
        }
        
        return s;
    };
    
    if (goog.isArray(str)) {
        var ret = [];
        
        for (var i=0, len=str.length; i<len; i++) {
            ret.push(unescaper(str[i]));
        }
        
        return ret;
    }
    else {
        return unescaper(str);
    }
};

sc.util.Namespaces.fullUriRegex = /^<?[a-zA-Z]+:\/\/(?:[^\/\.]+\.\w+)*.*>?$/;

sc.util.Namespaces.isUri = function(str) {
    if (sc.util.Namespaces.isAngleBracketWrapped(str)) {
        return true;
    }
    else {
        var match = sc.util.Namespaces.fullUriRegex.exec(str);
        
        if (match) {
            return true;
        }
        else {
            return false;
        }
    }
};

sc.util.Namespaces.isBNode = function(str) {
    return str ? goog.string.startsWith(str, '_:') : false;
};

/**
 * Takes an absolute or prefixed namespace, and expands it (if necessary) to its absolute namespace.
 * @param {string} ns
 * @return {string}
 * @throws {string}
 */
sc.util.Namespaces.prototype.autoExpand = function (ns) {
    if (ns instanceof sc.data.Resource) {
        return ns.bracketedUri;
    }
    else if (sc.util.Namespaces.isQuoteWrapped(ns) ||
        sc.util.Namespaces.isAngleBracketWrapped(ns) ||
        sc.util.Namespaces.isBNode(ns) ||
        sc.util.Namespaces.isUri(ns)) {
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

sc.util.Namespaces.prototype.expand = function(prefix, postfix) {
    if (this.uriByPrefix.containsKey(prefix)) {
        return ['<', this.uriByPrefix.get(prefix), postfix, '>'].join('');
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
sc.util.Namespaces.prototype.prefix = function(uri) {
    uri = sc.util.Namespaces.angleBracketStrip(uri);
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
    else if (!sc.util.Namespaces.isBNode(uri)) {
        return sc.util.Namespaces.angleBracketWrap(uri);
    }
    else {
        return uri;
    }
};

sc.util.Namespaces.prototype.bindNamespacesToHtmlElement = function(html) {
    var arr = [];

    goog.structs.forEach(this.uriByPrefix, function(uri, prefix) {
        arr.push([prefix, ': ', uri].join(''));
    }, this);

    jQuery(html).attr(prefix, arr.join('\n'))
};
