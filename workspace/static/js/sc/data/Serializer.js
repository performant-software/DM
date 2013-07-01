goog.provide('sc.data.Serializer');

sc.data.Serializer = function(databroker) {
    this.databroker = databroker;
};

/**
 * A list or set of mime types which the serializer can serialize.
 * This will be used by the Databroker to index the serializers for different datatypes.
 * @type {Array|goog.structs.Set}
 */
sc.data.Serializer.prototype.serializableTypes = new goog.structs.Set([]);

/**
 * @abstract
 * @param {Array.<sc.data.Quad>}     quads      The quads to serialize.
 * @param {String|null|undefined}    opt_format The mime type of the desired serialization (if not the default).
 * @param {function(*, Object|null)} handler    A function to be called with the data and a possible error.
 */
sc.data.Serializer.prototype.serialize = function(quads, opt_format, handler) {
    throw "Abstract method not implemented";
};

sc.data.Serializer.prototype.canSerializeType = function(type) {
    return this.serializableTypes.contains(type);
};