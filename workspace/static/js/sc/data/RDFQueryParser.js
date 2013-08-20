goog.provide('sc.data.RDFQueryParser');

goog.require('sc.data.Parser');
goog.require('jquery.rdfquery');

sc.data.RDFQueryParser = function(databroker) {
    sc.data.Parser.call(this, databroker);
};
goog.inherits(sc.data.RDFQueryParser, sc.data.Parser);

sc.data.RDFQueryParser.prototype.parseableTypes = new goog.structs.Set([
    'text/xml',
    'application/xml',
    'application/rdf+xml',
    'text/rdf+xml',
    'text/json',
    'application/json'
]);

sc.data.RDFQueryParser.prototype.splitPoint = 1000;

sc.data.RDFQueryParser.prototype.parse = function(data, context, handler) {
    var rdf = jQuery.rdf();

    try {
        rdf.load(data);
    }
    catch (e) {
        var error = new sc.data.ParseError();
        error.rdfqueryError = e;
        throw error;
    }

    var jqTriples = rdf.databank.triples();

    for (var j=0, len=jqTriples.length; j<len; j+=this.splitPoint) {
        var end = j + this.splitPoint;
        if (end > len) {
            end = len;
        }
        var triplesSlice = goog.array.slice(jqTriples, j, end);

        this._parseSlice(triplesSlice, context, handler, end == len);
    }
};

sc.data.RDFQueryParser.prototype._parseSlice = function(triplesSlice, context, handler, done) {
    window.setTimeout(function() {
        var quads = [];
        for (var i=0, len=triplesSlice.length; i<len; i++) {
            quads.push(this.jQueryTripleToQuad(triplesSlice[i], context));
        }
        handler(quads, done);
    }.bind(this), 1);
};

sc.data.RDFQueryParser.prototype.jQueryTripleToQuad = function(jQueryTriple, context) {
    var subject = jQueryTriple.subject.toString();
    var predicate = jQueryTriple.property.toString();
    var object = jQueryTriple.object.toString();

    var quad = new sc.data.Quad(subject, predicate, object, context);
    
    return quad;
};