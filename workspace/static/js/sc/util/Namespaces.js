goog.provide('sc.util.Namespaces');

goog.require('goog.structs.Map');

sc.util.Namespaces = function (opt_namespacesDict) {
    this.uriByPrefix = new goog.structs.Map(sc.util.Namespaces.DEFAULT_NAMESPACES);
    this.prefixByUri = this.uriByPrefix.transpose();
};

sc.util.Namespaces.DEFAULT_NAMESPACES = {
    'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    'dc': 'http://purl.org/dc/elements/1.1/',
    'dcterms': 'http://purl.org/dc/terms/',
    'ore': 'http://www.openarchives.org/ore/terms/',
    'tei': 'http://www.tei-c.org/ns/1.0/',
    'exif': 'http://www.w3.org/2003/12/exif/ns#',
    'oac': 'http://www.openannotation.org/ns/',
    'dms': 'http://dms.stanford.edu/ns/',
    'cnt': 'http://www.w3.org/2008/content#',
    'owl': 'http://www.w3.org/2002/07/owl#',
    'media-types': 'http://purl.org/NET/mediatypes/'
};

sc.util.Namespaces.prototype.addNamespace = function (prefix, uri) {
    this.uriByPrefix.set(prefix, uri);
    this.prefixByUri.set(uri, prefix);
};

sc.util.Namespaces.isAngleBracketWrapped = function(str) {
    return str.charAt(0) == '<' && str.charAt(str.length - 1) == '>';
};

sc.util.Namespaces.stripAngleBrackets = function (str) {
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

sc.util.Namespaces.wrapWithAngleBrackets = function(str) {
    if (sc.util.Namespaces.isAngleBracketWrapped(str)) {
        return str;
    }
    else {
        return '<' + str + '>';
    }
};

sc.util.Namespaces.isQuoteWrapped = function(str) {
    return str.charAt(0) == '"' && str.charAt(str.length - 1) == '"';
};

sc.util.Namespaces.stripWrappingQuotes = function(str) {
    var remover = function(str) {
        if (sc.util.Namespaces.isQuoteWrapped(str)) {
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

sc.util.Namespaces.stripQuotesAndDatatype = function(str) {
    var remover = function(str) {
        var match = /^"(.*)"\^\^<(.*)>$/.exec(str);
        
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

sc.util.Namespaces.fullUriRegex = /^<?\w+:\/\/(?:[^\/\.]+\.\w+)*.*>?$/;

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

/**
 * Takes an absolute or prefixed namespace, and expands it (if necessary) to its absolute namespace.
 * @param {string} ns
 * @return {string}
 * @throws {string}
 */
sc.util.Namespaces.prototype.autoExpand = function (ns) {
    if (sc.util.Namespaces.isQuoteWrapped(ns) ||
        sc.util.Namespaces.isAngleBracketWrapped(ns)) {
        return ns;
    }
    
    if (sc.util.Namespaces.isUri(ns)) {
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