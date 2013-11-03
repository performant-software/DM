goog.provide('sc.data.Term');

goog.require('goog.string');

/**
 * @fileoverview
 * @author tandres@drew.edu (Tim Andres)
 *
 * These classes and utility functions wrap strings for the n3 format used in the
 * quad store.
 * The class structure is designed to mimic Python's rdflib, and the class instances can be
 * used interchangeably with wrapped strings.
 */

/**
 * @class
 * @abstract
 */
sc.data.Term = function(str) {
    // This pattern allows omission of the `new` javascript keyword, just in case this
    // pattern feels so rdflib-like that we forget language syntax
    if (!(this instanceof sc.data.Term)) {
        return new sc.data.Term(str);
    }

    this.__setStr(str);
    this.unwrappedStr = str;
};

sc.data.Term.prototype.__setStr = function(str) {
    this.str = str;
    this.length = str.length;
};

sc.data.Term.prototype.equals = function(other) {
    if (other instanceof sc.data.Term) {
        return this.str == other.str;
    }
    else {
        return this.str == other;
    }
};

sc.data.Term.prototype.toString = function() {
    return this.str;
};

sc.data.Term.prototype.n3 = function() {
    return this.toString();
};

sc.data.Term.prototype.unwrapped = function() {
    return this.unwrappedStr;
};

sc.data.Term.prototype.clone = function() {
    return new this(this.unwrappedStr, this.type);
};



sc.data.Term.isWrappedUri = function(str) {
    if (str instanceof sc.data.Uri) {
        return true;
    }
    else if (str instanceof sc.data.Term) {
        return false;
    }
    else {
        return str.charAt(0) == '<' && str.charAt(str.length - 1) == '>';
    }
};

sc.data.Term.unwrapUri = function (str) {
    var remover = function(str) {
        if (str instanceof sc.data.Uri) {
            return str.unwrapped();
        }
        else if (sc.data.Term.isWrappedUri(str)) {
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

sc.data.Term.wrapUri = function(str) {
    if (str instanceof sc.data.Resource) {
        return str.bracketedUri;
    }
    else if (str instanceof sc.data.Uri) {
        return str.n3();
    }
    else if (sc.data.Term.isWrappedUri(str) ||
        sc.data.Term.isBNode(str)) {
        return str;
    }
    else {
        return ['<', str.replace(/>/g, '\\>'), '>'].join('');
    }
};

sc.data.Term._escapeLiteral = function(str) {
    if (str == null) {
        return ''
    }
    else {
        return str.replace(/("|\\|\^)/g, '\\$1').replace(/(\t)/g, '\\t');
    }
};

sc.data.Term._unescapeLiteral = function(str) {
    return str.replace(/(?:\\(")|\\(\\)|\\(>)|\\(\^))/g, '$1').replace(/(\\t)/g, '\t')
};

sc.data.Term.wrapLiteral = function(str) {
    if (str instanceof sc.data.Literal) {
        return str.n3();
    }
    else {
        str = sc.data.Term._escapeLiteral(str);
        return ['"', str, '"'].join('');
    }
};

sc.data.Term.quotesAndDatatypeRegex = /^"(.*)"\^\^<(.*)>$/;

sc.data.Term.isWrappedLiteral = function(str) {
    if (str instanceof sc.data.Literal) {
        return true;
    }
    else if (str instanceof sc.data.Term) {
        return false;
    }
    else if ((str.charAt(0) == '"') && (str.charAt(str.length - 1) == '"') && (str.charAt(str.length - 2) != '\\')) {
        return true;
    } else if (sc.data.Term.quotesAndDatatypeRegex.test(str)) {
        return true;
    } else {
        return false;
    }
};

sc.data.Term._stripWrappingQuotes = function(str) {
    var remover = function(str) {
        if (sc.data.Term.isWrappedLiteral(str)) {
            if (str instanceof sc.data.Literal) {
                return str.unwrapped();
            }
            else {
                return sc.data.Term._unescapeLiteral(str.substring(1, str.length - 1));
            }
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

sc.data.Term.unwrapLiteral = function(str) {
    var remover = function(str) {
        if (str instanceof sc.data.Literal) {
            return str.unwrapped();
        }
        else {
            var match = sc.data.Term.quotesAndDatatypeRegex.exec(str);
            
            if (match) {
                return sc.data.Term._unescapeLiteral(match[1]);
            }
            else {
                return sc.data.Term._stripWrappingQuotes(str);
            }
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

sc.data.Term.isLiteral = function(str) {
    return sc.data.Term.isWrappedLiteral(str);
};

sc.data.Term.fullUriRegex = /^<?[a-zA-Z]+:\/\/(?:[^\/\.]+\.\w+)*.*>?$/;

sc.data.Term.isUri = function(str) {
    if (sc.data.Term.isWrappedUri(str)) {
        return true;
    }
    else {
        var match = sc.data.Term.fullUriRegex.exec(str);
        
        if (match) {
            return true;
        }
        else {
            return false;
        }
    }
};

sc.data.Term.isBNode = function(str) {
    if (str instanceof sc.data.BNode) {
        return true;
    }
    else if (str instanceof sc.data.Term) {
        return false;
    }
    else {
        return str ? goog.string.startsWith(str, '_:') : false;
    }
};

sc.data.Term.fromString = function(str) {
    if (sc.data.Term.isWrappedUri(str)) {
        return new sc.data.Uri(sc.data.Term.unwrapUri(str));
    }
    else if (sc.data.Term.isLiteral(str)) {
        var match = sc.data.Term.quotesAndDatatypeRegex.match(str);
        if (match) {
            return new sc.data.Literal(sc.data.Term._unescapeLiteral(match[1]), match[2]);
        }
        else {
            return new sc.data.Literal(sc.data.Term._unescapeLiteral(str.substring(1, str.length - 1)));
        }
    }
    else if (sc.data.Term.isBNode(str)) {
        if (goog.string.startsWith(str, '_:b')) {
            return new sc.data.BNode(str.substring(3, str.length));
        }
        else {
            return new sc.data.BNode(str.substring(2, str.length));
        }
    }
}



goog.provide('sc.data.Uri');
sc.data.Uri = function(str) {
    if (!(this instanceof sc.data.Uri)) {
        return new sc.data.Uri(str);
    }

    this.__setStr(sc.data.Term.wrapUri(str))
    this.unwrappedStr = str;
};
goog.inherits(sc.data.Uri, sc.data.Term);

goog.provide('sc.data.Literal');
sc.data.Literal = function(str, opt_type) {
    if (!(this instanceof sc.data.Literal)) {
        return new sc.data.Literal(str, opt_type);
    }

    if (opt_type) {
        this.__setStr(['"', sc.data.Term._escapeLiteral(str), '"',
            '^^<', opt_type.replace(/>/g, '\\>'), '>'].join(''));
    }
    else {
        this.__setStr(sc.data.Term.wrapLiteral(str));
    }
    this.unwrappedStr = str;
    this.type = opt_type;
};
goog.inherits(sc.data.Literal, sc.data.Term);

goog.provide('sc.data.BNode');
sc.data.BNode = function(str) {
    if (!(this instanceof sc.data.BNode)) {
        return new sc.data.BNode(str);
    }

    if (str) {
        this.__setStr(['_:b', str].join(''));
    }
    else {
        this.__setStr(['_:b', goog.string.getRandomString(), goog.string.getRandomString()].join(''));
    }
    this.unwrappedStr = this.str;
};
goog.inherits(sc.data.BNode, sc.data.Term);

goog.provide('sc.data.DateTimeLiteral');
sc.data.DateTimeLiteral = function(date) {
    if (!(this instanceof sc.data.DateTimeLiteral)) {
        return new sc.data.DateTimeLiteral(date);
    }

    var padNumber = goog.string.padNumber;
    var s = goog.string.buildString(date.getUTCFullYear(), '-', padNumber(date.getUTCMonth(), 2), '-', padNumber(date.getUTCDate(), 2),
        'T', padNumber(date.getUTCHours(), 2), ':', padNumber(date.getUTCMinutes(), 2), ':', padNumber(date.getUTCSeconds(), 2), 'Z');

    sc.data.Literal.call(this, s, 'xsd:dateTime');
};
goog.inherits(sc.data.DateTimeLiteral, sc.data.Literal);