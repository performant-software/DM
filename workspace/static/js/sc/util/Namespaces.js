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
    'dc': 'http://purl.org/dc/elements/1.1/',
    'dcterms': 'http://purl.org/dc/terms/',
    'dctypes': 'http://purl.org/dc/dcmitype/',
    'ore': 'http://www.openarchives.org/ore/terms/',
    'tei': 'http://www.tei-c.org/ns/1.0/',
    'exif': 'http://www.w3.org/2003/12/exif/ns#',
    'oac': 'http://www.openannotation.org/ns/',
    'oa': 'http://www.openannotation.org/ns/',
    'dms': 'http://dms.stanford.edu/ns/',
    'sc': 'http://www.shared-canvas.org/ns/',
    'cnt': 'http://www.w3.org/2011/content#',
    'cnt08': 'http://www.w3.org/2008/content#',
    'owl': 'http://www.w3.org/2002/07/owl#',
    'media-types': 'http://purl.org/NET/mediatypes/',
    'perm': 'http://vocab.ox.ac.uk/perm#'
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

sc.util.Namespaces.prototype.toTurtleString = function() {
    var arr = [];

    goog.structs.forEach(this.uriByPrefix, function(uri, prefix) {
        arr.push('@prefix ' + prefix + ': ' + sc.util.Namespaces.angleBracketWrap(uri) + ' .');
    }, this);

    return arr.join('\n');
};

sc.util.Namespaces.prototype.toString = function() {
    return this.toTurtleString();
};

sc.util.Namespaces.isAngleBracketWrapped = function(str) {
    return str.charAt(0) == '<' && str.charAt(str.length - 1) == '>';
};

sc.util.Namespaces.angleBracketStrip = function (str) {
    var remover = function(str) {
        if (sc.util.Namespaces.isAngleBracketWrapped(str)) {
            return str.substring(1, str.length - 1);
        }
        else {
            return str;
        }
    };
    
    if (jQuery.isArray(str)) {
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
        return '<' + str + '>';
    }
};

sc.util.Namespaces.quoteWrap = function(str) {
    str = str.replace('"', '\"');
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
            return str.substring(1, str.length - 1).replace('\\"', '"');
        }
        else {
            return str;
        }
    };
    
    if (jQuery.isArray(str)) {
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
            return match[1];
        }
        else {
            return sc.util.Namespaces.stripWrappingQuotes(str);
        }
    };
    
    if (jQuery.isArray(str)) {
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
    
    if (jQuery.isArray(str)) {
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
    
    if (jQuery.isArray(str)) {
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
    return goog.string.startsWith(str, '_:');
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
        return '<' + this.uriByPrefix.get(prefix) + postfix + '>';
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

    if (matchedBaseUri && matchedPrefix) {
        return matchedPrefix + ':' + goog.string.removeAt(uri, 0, matchedBaseUri.length);
    }
    else if (!sc.util.Namespaces.isBNode(uri)) {
        return sc.util.Namespaces.angleBracketWrap(uri);
    }
    else {
        return uri;
    }
};

/**
 * Takes a {jQuery.rdf} object and adds all known prefixes to it
 * @param {jQuery.rdf} rdfquery
 * @return {jQuery.rdf}
 */
sc.util.Namespaces.prototype.setupRdfQueryPrefixes = function (rdfquery) {
    var prefixes = this.uriByPrefix.getKeys();
    
    for (var i=0, len=prefixes.length; i<len; i++) {
        var prefix = prefixes[i];
        var uri = this.uriByPrefix.get(prefix);
        
        rdfquery.prefix(prefix, uri);
    }
    
    return rdfquery;
};

sc.util.Namespaces.prototype.bindNamespacesToHtmlElement = function(html) {
    goog.structs.forEach(this.uriByPrefix, function(uri, prefix) {
        var xmlns = 'xmlns:' + prefix;

        var original = jQuery(html).attr(xmlns);
        if (original) {
            console.warn('Overwriting original ' + xmlns + '=' + original);
        }

        jQuery(html).attr(xmlns, uri);
    }, this);
};
