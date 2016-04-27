goog.provide('sc.data.Triple');

goog.require('sc.data.Quad');

/**
 * @class
 * Represents an RDF Triple
 *
 * @author tandres@drew.edu (Tim Andres)
 * 
 * @param {string|sc.data.Term} subject
 * @param {string|sc.data.Term} predicate
 * @param {string|sc.data.Term} object
 */
sc.data.Triple = function(subject, predicate, object) {
    this.subject = subject;
    this.predicate = predicate;
    this.object = object;

    this.timeCreated = goog.now();
};

/**
 * Returns a clone of this quad.
 * @return {sc.data.Quad} clone.
 */
sc.data.Triple.prototype.clone = function() {
    return new sc.data.Triple(this.subject, this.predicate, this.object);
};

/**
 * Returns true if the other Triple has the same subject, predicate, object, and context as this Triple.
 * @param  {sc.data.Triple} other Triple to test.
 * @return {boolean}            true if equal.
 */
sc.data.Triple.prototype.equals = function(other) {
    return typeof other == 'object' &&
        this.subject == other.subject && this.predicate == other.predicate &&
        this.object == other.object && this.context == other.context;
};


sc.data.Triple.prototype.toString = function() {
    return [this.subject, this.predicate, this.object, '.'].join(' ');
};

sc.data.Triple.prototype.toArray = function() {
    return [this.subject, this.predicate, this.object];
};

sc.data.Triple.fromQuad = function(quad) {
    return new sc.data.Triple(quad.subject, quad.predicate, quad.object);
}

sc.data.Triple.prototype.toQuad = function(context) {
    return new sc.data.Quad(this.subject, this.predicate, this.object, context);
};