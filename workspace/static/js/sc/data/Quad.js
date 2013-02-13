goog.provide('sc.data.Quad');

sc.data.Quad = function(subject, predicate, object, context) {
    this.subject = subject;
    this.predicate = predicate;
    this.object = object;
    this.context = context;

    this.timeCreated = goog.now();
};

sc.data.Quad.prototype.equals = function(other) {
    return typeof other == 'object' &&
        this.subject == other.subject && this.predicate == other.predicate &&
        this.object == other.object && this.context == other.context;
};


sc.data.Quad.prototype.toString = function() {
    return [this.subject, this.predicate, this.object, this.context, '.'].join(' ');
};

sc.data.Quad.createFromRdfqueryTriple = function(jqTriple, context) {
    var subject = jqTriple.subject.toString();
    var predicate = jqTriple.property.toString();
    var object = jqTriple.object.toString();

    var triple = new sc.data.Quad(subject, predicate, object, context);
    
    return triple;
};