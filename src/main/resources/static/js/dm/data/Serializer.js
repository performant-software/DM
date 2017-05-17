goog.provide('dm.data.Serializer');

dm.data.Serializer = function(databroker) {
    this.databroker = databroker;
};

/**
 * A list or set of mime types which the serializer can serialize.
 * This will be used by the Databroker to index the serializers for different datatypes.
 * @type {Array|goog.structs.Set}
 */
dm.data.Serializer.prototype.serializableTypes = new goog.structs.Set([]);

/**
 * @abstract
 * @param {Array.<dm.data.Quad>}     quads      The quads to serialize.
 * @param {String|null|undefined}    opt_format The mime type of the desired serialization (if not the default).
 * @param {function(*, Error|null), string} handler    A function to be called with the data and a possible error.
 */
dm.data.Serializer.prototype.serialize = function(quads, opt_format, handler) {
    throw "Abstract method not implemented";
};

dm.data.Serializer.prototype.canSerializeType = function(type) {
    return this.serializableTypes.contains(type);
};