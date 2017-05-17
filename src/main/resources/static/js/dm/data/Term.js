goog.provide('dm.data.Term');

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
dm.data.Term = function(str) {
    // This pattern allows omission of the `new` javascript keyword, just in case this
    // pattern feels so rdflib-like that we forget language syntax
    if (!(this instanceof dm.data.Term)) {
        return new dm.data.Term(str);
    }

    this.__setStr(str);
    this.unwrappedStr = str;
};

dm.data.Term.prototype.__setStr = function(str) {
    this.str = str;
    this.length = str.length;
};

dm.data.Term.prototype.equals = function(other) {
    if (other instanceof dm.data.Term) {
        return this.str == other.str;
    }
    else {
        return this.str == other;
    }
};

dm.data.Term.prototype.toString = function() {
    return this.str;
};

dm.data.Term.prototype.n3 = function() {
    return this.toString();
};

dm.data.Term.prototype.unwrapped = function() {
    return this.unwrappedStr;
};

dm.data.Term.prototype.clone = function() {
    return new this(this.unwrappedStr, this.type);
};



dm.data.Term.isWrappedUri = function(str) {
    if (str instanceof dm.data.Uri) {
        return true;
    }
    else if (str instanceof dm.data.Term) {
        return false;
    }
    else {
        return str.charAt(0) == '<' && str.charAt(str.length - 1) == '>';
    }
};

dm.data.Term.unwrapUri = function (str) {
    var remover = function(str) {
        if (str instanceof dm.data.Uri) {
            return str.unwrapped();
        }
        else if (dm.data.Term.isWrappedUri(str)) {
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

dm.data.Term.wrapUri = function(str) {
    if (str instanceof dm.data.Resource) {
        return str.bracketedUri;
    }
    else if (str instanceof dm.data.Uri) {
        return str.n3();
    }
    else if (dm.data.Term.isWrappedUri(str) ||
        dm.data.Term.isBNode(str)) {
        return str;
    }
    else {
        return ['<', str.replace(/>/g, '\\>'), '>'].join('');
    }
};

dm.data.Term._escapeLiteral = function(str) {
    if (str == null) {
        return ''
    }
    else {
        return str.replace(/("|\\|\^)/g, '\\$1').replace(/(\t)/g, '\\t');
    }
};

dm.data.Term._unescapeLiteral = function(str) {
    return str.replace(/(?:\\(")|\\(\\)|\\(>)|\\(\^))/g, '$1').replace(/(\\t)/g, '\t')
};

dm.data.Term.wrapLiteral = function(str) {
    if (str instanceof dm.data.Literal) {
        return str.n3();
    }
    else {
        str = dm.data.Term._escapeLiteral(str);
        return ['"', str, '"'].join('');
    }
};

dm.data.Term.quotesAndDatatypeRegex = /^"(.*)"\^\^<(.*)>$/;

dm.data.Term.isWrappedLiteral = function(str) {
    if (str instanceof dm.data.Literal) {
        return true;
    }
    else if (str instanceof dm.data.Term) {
        return false;
    }
    else if ((str.charAt(0) == '"') && (str.charAt(str.length - 1) == '"') && (str.charAt(str.length - 2) != '\\')) {
        return true;
    } else if (dm.data.Term.quotesAndDatatypeRegex.test(str)) {
        return true;
    } else {
        return false;
    }
};

dm.data.Term._stripWrappingQuotes = function(str) {
    var remover = function(str) {
        if (dm.data.Term.isWrappedLiteral(str)) {
            if (str instanceof dm.data.Literal) {
                return str.unwrapped();
            }
            else {
                return dm.data.Term._unescapeLiteral(str.substring(1, str.length - 1));
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

dm.data.Term.unwrapLiteral = function(str) {
    var remover = function(str) {
        if (str instanceof dm.data.Literal) {
            return str.unwrapped();
        }
        else {
            var match = dm.data.Term.quotesAndDatatypeRegex.exec(str);
            
            if (match) {
                return dm.data.Term._unescapeLiteral(match[1]);
            }
            else {
                return dm.data.Term._stripWrappingQuotes(str);
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

dm.data.Term.isLiteral = function(str) {
    return dm.data.Term.isWrappedLiteral(str);
};

dm.data.Term.fullUriRegex = /^<?[a-zA-Z]+:\/\/(?:[^\/\.]+\.\w+)*.*>?$/;

dm.data.Term.isUri = function(str) {
    if (dm.data.Term.isWrappedUri(str)) {
        return true;
    }
    else {
        var match = dm.data.Term.fullUriRegex.exec(str);
        
        if (match) {
            return true;
        }
        else {
            return false;
        }
    }
};

dm.data.Term.isBNode = function(str) {
    if (str instanceof dm.data.BNode) {
        return true;
    }
    else if (str instanceof dm.data.Term) {
        return false;
    }
    else {
        return str ? goog.string.startsWith(str, '_:') : false;
    }
};

dm.data.Term.fromString = function(str) {
    if (dm.data.Term.isWrappedUri(str)) {
        return new dm.data.Uri(dm.data.Term.unwrapUri(str));
    }
    else if (dm.data.Term.isLiteral(str)) {
        var match = dm.data.Term.quotesAndDatatypeRegex.match(str);
        if (match) {
            return new dm.data.Literal(dm.data.Term._unescapeLiteral(match[1]), match[2]);
        }
        else {
            return new dm.data.Literal(dm.data.Term._unescapeLiteral(str.substring(1, str.length - 1)));
        }
    }
    else if (dm.data.Term.isBNode(str)) {
        if (goog.string.startsWith(str, '_:b')) {
            return new dm.data.BNode(str.substring(3, str.length));
        }
        else {
            return new dm.data.BNode(str.substring(2, str.length));
        }
    }
}



goog.provide('dm.data.Uri');
dm.data.Uri = function(str) {
    if (!(this instanceof dm.data.Uri)) {
        return new dm.data.Uri(str);
    }

    this.__setStr(dm.data.Term.wrapUri(str))
    this.unwrappedStr = str;
};
goog.inherits(dm.data.Uri, dm.data.Term);

goog.provide('dm.data.Literal');
dm.data.Literal = function(str, opt_type) {
    if (!(this instanceof dm.data.Literal)) {
        return new dm.data.Literal(str, opt_type);
    }

    if (opt_type) {
        this.__setStr(['"', dm.data.Term._escapeLiteral(str), '"',
            '^^<', opt_type.replace(/>/g, '\\>'), '>'].join(''));
    }
    else {
        this.__setStr(dm.data.Term.wrapLiteral(str));
    }
    this.unwrappedStr = str;
    this.type = opt_type;
};
goog.inherits(dm.data.Literal, dm.data.Term);

goog.provide('dm.data.BNode');
dm.data.BNode = function(str) {
    if (!(this instanceof dm.data.BNode)) {
        return new dm.data.BNode(str);
    }

    if (str) {
        this.__setStr(['_:b', str].join(''));
    }
    else {
        this.__setStr(['_:b', goog.string.getRandomString(), goog.string.getRandomString()].join(''));
    }
    this.unwrappedStr = this.str;
};
goog.inherits(dm.data.BNode, dm.data.Term);

goog.provide('dm.data.DateTimeLiteral');
dm.data.DateTimeLiteral = function(date) {
    if (!(this instanceof dm.data.DateTimeLiteral)) {
        return new dm.data.DateTimeLiteral(date);
    }

    var padNumber = goog.string.padNumber;
    var s = goog.string.buildString(date.getUTCFullYear(), '-', padNumber(date.getUTCMonth(), 2), '-', padNumber(date.getUTCDate(), 2),
        'T', padNumber(date.getUTCHours(), 2), ':', padNumber(date.getUTCMinutes(), 2), ':', padNumber(date.getUTCSeconds(), 2), 'Z');

    dm.data.Literal.call(this, s, 'http://www.w3.org/2001/XMLSchema/dateTime');
};
goog.inherits(dm.data.DateTimeLiteral, dm.data.Literal);