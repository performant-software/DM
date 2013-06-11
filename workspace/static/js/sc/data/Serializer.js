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
 * @param  {Array.<sc.data.Quad>}  quads      The quads to serialize.
 * @param  {String|null|undefined} opt_format The mime type of the desired serialization (if not the default).
 * @return {*}                                The serialized data.
 */
sc.data.Serializer.prototype.serialize = function(quads, opt_format) {
    throw "Abstract method not implemented";
};

sc.data.Serializer.prototype.canSerializeType = function(type) {
    return this.serializableTypes.contains(type);
};