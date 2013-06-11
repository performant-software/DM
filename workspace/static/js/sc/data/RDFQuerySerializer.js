goog.provide('sc.data.RDFQuerySerializer');

goog.require('sc.data.Serializer');

sc.data.RDFQuerySerializer = function(databroker) {
    sc.data.Serializer.call(this, databroker);
};
goog.inherits(sc.data.RDFQuerySerializer, sc.data.Serializer);

sc.data.RDFQuerySerializer.prototype.serializableTypes = new goog.structs.Set([
    'application/rdf+xml',
    'application/json'
]);

sc.data.RDFQuerySerializer.prototype.defaultFormat = 'application/rdf+xml';

sc.data.RDFQuerySerializer.prototype.serialize = function(quads, opt_format) {
    var rdf = jQuery.rdf();
    this.bindNamespaces(rdf);
    
    for (var i=0, len=quads.length; i<len; i++) {
        rdf.add(this.quadTojQueryTriple(quads[i]));
    }
    
    return rdf.databank.dump({
        format: opt_format || this.defaultFormat
    });
};

sc.data.RDFQuerySerializer.prototype.quadTojQueryTriple = function(quad) {
    return new jQuery.rdf.triple(
        quad.subject,
        quad.predicate,
        quad.object
    );
};

sc.data.RDFQuerySerializer.prototype.quadsTojQueryTriples = function(quads) {
    var jQueryTriples = [];

    for (var i=0, len=quads.length; i<len; i++) {
        jQueryTriples.push(this.quadTojQueryTriple(quads[i]));
    }

    return jQueryTriples;
};

sc.data.RDFQuerySerializer.prototype.bindNamespaces = function(databank) {
    goog.structs.forEach(this.databroker.namespaces.uriByPrefix, function(uri, prefix) {
        databank.prefix(prefix, uri);
    }, this);
};