goog.provide('sc.data.N3Parser');

goog.require('sc.data.Parser');
goog.require('n3.parser');
goog.require('sc.util.Namespaces')

sc.data.N3Parser = function(databroker) {
    sc.data.Parser.call(this, databroker);

    this.parser = new N3Parser();
};
goog.inherits(sc.data.N3Parser, sc.data.Parser);

sc.data.N3Parser.prototype.parseableTypes = new goog.structs.Set([
    'text/turtle',
    'text/n3'
]);

sc.data.N3Parser.prototype.parse = function(data, context, handler) {
    this.parser.parse(data, function(error, triple) {
        if (triple) {
            handler([this._tripleToQuad(triple)], false);
        }
        else if (error) {
            handler([], false, error);
        }
        else {
            handler([], true);
        }
    }.bind(this));
};

sc.data.N3Parser._termWrapper = function(str) {
    if (!sc.util.Namespaces.isQuoteWrapped(str)) {
        return sc.util.Namespaces.angleBracketWrap(str);
    }
    else {
        return str;
    }
};

sc.data.N3Parser.prototype._tripleToQuad = function(triple, context) {
    var wrap = sc.data.N3Parser._termWrapper;

    var subject = wrap(triple.subject);
    var predicate = wrap(triple.predicate);
    var object = wrap(triple.object);

    return new sc.data.Quad(subject, predicate, object, context);
};