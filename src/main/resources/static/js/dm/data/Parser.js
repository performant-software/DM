goog.provide('dm.data.Parser');

goog.require('dm.data.Quad');

/**
 * @class 
 * @abstract
 * @param  {dm.data.Databroker} databroker
 */
dm.data.Parser = function(databroker) {
    this.databroker = databroker;
};

/**
 * A list or set of mime types which the parser can read.
 * This will be used by the Databroker to index the parsers for different datatypes.
 * The list should be as general as reasonably possible, since the parser may still throw a {dm.data.ParseError} if it later
 * finds it cannot parse the data, and the databroker will try any other available parsers.
 * Note that the Databroker may still try to have the parser read a type which it is not listed as supporting
 * if no other parser can be found (in which case, a {dm.data.ParseError} should be thrown if parsing is impossible).
 * @type {Array|goog.structs.Set}
 */
dm.data.Parser.prototype.parseableTypes = new goog.structs.Set([]);

/**
 * 
 * @param {*} data               The data to parse.
 * @param {string|null} context  The context to be applied to the quads if not specified by the data.
 * @param {function}    handler  Function to call with loaded quads. First parameter is the just parsed batch of quads, second parameter
 *                               is whether parsing is complete 
 */
dm.data.Parser.prototype.parse = function(data, context, handler) {
    throw "Abstract method not implemented";
};

dm.data.Parser.prototype.canParseType = function(type) {
    return this.readableTypes.contains(type);
};


dm.data.Parser.CONTENT_TYPE_REGEX = /^Content-Type:\s*([^;\s]*)$/m;
/**
 * Returns the Content-Type value from a response headers string
 * @param {string} responseHeaders
 * @return {string}
 */
dm.data.Parser.parseContentType = function(responseHeaders) {
    var match = dm.data.Parser.CONTENT_TYPE_REGEX.exec(responseHeaders);

    if (match) {
        var type = goog.string.trim(match[1]);
        return type;
    }
    else {
        return '';
    }
};



goog.provide('dm.data.ParseError');

goog.require('goog.debug.Error');

dm.data.ParseError = function(opt_message) {
    goog.debug.Error.call(this, opt_message);
};
goog.inherits(dm.data.ParseError, goog.debug.Error);