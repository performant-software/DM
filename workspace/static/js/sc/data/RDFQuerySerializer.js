goog.provide('sc.data.RDFQuerySerializer');

goog.require('sc.data.Serializer');

sc.data.RDFQuerySerializer = function(databroker) {
    sc.data.Serializer.call(this, databroker);
};
goog.inherits(sc.data.RDFQuerySerializer, sc.data.Serializer);

sc.data.RDFQuerySerializer.prototype.serializableTypes = new goog.structs.Set([
    'application/rdf+xml',
    'application/xml',
    'text/rdf+xml',
    'text/xml',
    'application/json',
    'text/json'
]);

sc.data.RDFQuerySerializer.prototype.defaultFormat = 'application/rdf+xml';

sc.data.RDFQuerySerializer.prototype.serialize = function(quads, opt_format, handler) {
    if (opt_format == 'application/xml' ||
        opt_format == 'text/rdf+xml;' ||
        opt_format == 'text/xml') {
        opt_format = 'application/rdf+xml'
    }
    else if (opt_format == 'text/json') {
        opt_format = 'application/json'
    }

    window.setTimeout(function() {
        var rdf = jQuery.rdf();
        this.bindNamespaces(rdf);

        try {
            for (var i=0, len=quads.length; i<len; i++) {
                rdf.add(this.quadTojQueryTriple(quads[i]));
            }
            
            var dump = rdf.databank.dump({
                format: opt_format || this.defaultFormat
            });

            handler(dump, null);
        }
        catch (e) {
            handler(null, e);
        }
    }.bind(this), 1);
};

sc.data.RDFQuerySerializer.prototype.escapeForRdfquery = function(str) {
    return str.replace(/"/g, '&quot;');
};

sc.data.RDFQuerySerializer.prototype.quadTojQueryTriple = function(quad) {
    return new jQuery.rdf.triple(
        this.escapeForRdfquery(quad.subject),
        this.escapeForRdfquery(quad.predicate),
        this.escapeForRdfquery(quad.object)
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