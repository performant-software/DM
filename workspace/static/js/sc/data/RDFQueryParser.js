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
    'application/json',
    'xml',
    'rdf'
]);

sc.data.RDFQueryParser.prototype.parse = function(data, context) {
    var rdf = jQuery.rdf();

    try {
        rdf.load(data);
    }
    catch (e) {
        throw new sc.data.ParseError();
    }

    var jqTriples = rdf.databank.triples();
    var quads = [];

    for (var i=0, len=jqTriples.length; i<len; i++) {
        quads.push(this.jQueryTripleToQuad(jqTriples[i], context));
    }

    return quads;
};

sc.data.RDFQueryParser.prototype.jQueryTripleToQuad = function(jQueryTriple, context) {
    var subject = jQueryTriple.subject.toString();
    var predicate = jQueryTriple.property.toString();
    var object = jQueryTriple.object.toString();

    var quad = new sc.data.Quad(subject, predicate, object, context);
    
    return quad;
};