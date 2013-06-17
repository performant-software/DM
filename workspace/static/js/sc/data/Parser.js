goog.provide('sc.data.Parser');

/**
 * @class 
 * @abstract
 * @param  {sc.data.Databroker} databroker
 */
sc.data.Parser = function(databroker) {
    this.databroker = databroker;
};

/**
 * A list or set of mime types which the parser can read.
 * This will be used by the Databroker to index the parsers for different datatypes.
 * The list should be as general as reasonably possible, since the parser may still throw a {sc.data.ParseError} if it later
 * finds it cannot parse the data, and the databroker will try any other available parsers.
 * Note that the Databroker may still try to have the parser read a type which it is not listed as supporting
 * if no other parser can be found (in which case, a {sc.data.ParseError} should be thrown if parsing is impossible).
 * @type {Array|goog.structs.Set}
 */
sc.data.Parser.prototype.parseableTypes = new goog.structs.Set([]);

/**
 * 
 * @param {*} data               The data to parse.
 * @param {string|null} context  The context to be applied to the quads if not specified by the data.
 * @param {function}    handler  Function to call with loaded quads. First parameter is the just parsed batch of quads, second parameter
 *                               is whether parsing is complete 
 */
sc.data.Parser.prototype.parse = function(data, context, handler) {
    throw "Abstract method not implemented";
};

sc.data.Parser.prototype.canParseType = function(type) {
    return this.readableTypes.contains(type);
};


sc.data.Parser.CONTENT_TYPE_REGEX = /^Content-Type:\s*([^;\s]*)$/m;
/**
 * Returns the Content-Type value from a response headers string
 * @param {string} responseHeaders
 * @return {string}
 */
sc.data.Parser.parseContentType = function(responseHeaders) {
    var match = sc.data.Parser.CONTENT_TYPE_REGEX.exec(responseHeaders);

    if (match) {
        var type = goog.string.trim(match[1]);
        return type;
    }
    else {
        return '';
    }
};



goog.provide('sc.data.ParseError');

goog.require('goog.debug.Error');

sc.data.ParseError = function(opt_message) {
    goog.debug.Error.call(this, opt_message);
};
goog.inherits(sc.data.ParseError, goog.debug.Error);