goog.provide('dm.data.RDFQuerySerializer');

goog.require('dm.data.Serializer');

dm.data.RDFQuerySerializer = function(databroker) {
    dm.data.Serializer.call(this, databroker);
};
goog.inherits(dm.data.RDFQuerySerializer, dm.data.Serializer);

dm.data.RDFQuerySerializer.prototype.serializableTypes = new goog.structs.Set([
    'application/rdf+xml',
    'application/xml',
    'text/rdf+xml',
    'text/xml',
    'application/json',
    'text/json'
]);

dm.data.RDFQuerySerializer.prototype.defaultFormat = 'application/rdf+xml';

dm.data.RDFQuerySerializer.prototype.serialize = function(quads, opt_format, handler) {
    if (opt_format == 'application/xml' ||
        opt_format == 'text/rdf+xml;' ||
        opt_format == 'text/xml') {
        opt_format = 'application/rdf+xml'
    }
    else if (opt_format == 'text/json') {
        opt_format = 'application/json'
    }

    setTimeout(function() {
        var rdf = jQuery.rdf();
        this.bindNamespaces(rdf);

        try {
            for (var i=0, len=quads.length; i<len; i++) {
                rdf.add(this.quadTojQueryTriple(quads[i]));
            }

            setTimeout(function() {
                try {
                    var dump = rdf.databank.dump({
                        format: opt_format || this.defaultFormat
                    });

                    setTimeout(function() {
                        handler(dump, null, opt_format || this.defaultFormat);
                    }.bind(this), 1);
                }
                catch (e) {
                    handler(null, e, opt_format || this.defaultFormat);
                }
            }.bind(this), 1);
        }
        catch (e) {
            handler(null, e, opt_format || this.defaultFormat);
        }
    }.bind(this), 1);
};

dm.data.RDFQuerySerializer.prototype.escapeForRdfquery = function(str) {
    if (dm.data.Term.isLiteral(str)) {
        return str.replace(/[^\\]\\"/g, '&quot;');
    }
    else {
        return str;
    }
};

dm.data.RDFQuerySerializer.prototype.quadTojQueryTriple = function(quad) {
    return new jQuery.rdf.triple(
        this.escapeForRdfquery(quad.subject),
        this.escapeForRdfquery(quad.predicate),
        this.escapeForRdfquery(quad.object)
    );
};

dm.data.RDFQuerySerializer.prototype.quadsTojQueryTriples = function(quads) {
    var jQueryTriples = [];

    for (var i=0, len=quads.length; i<len; i++) {
        jQueryTriples.push(this.quadTojQueryTriple(quads[i]));
    }

    return jQueryTriples;
};

dm.data.RDFQuerySerializer.prototype.bindNamespaces = function(databank) {
    goog.structs.forEach(this.databroker.namespaces.uriByPrefix, function(uri, prefix) {
        databank.prefix(prefix, uri);
    }, this);
};