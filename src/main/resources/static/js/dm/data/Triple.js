goog.provide('dm.data.Triple');

goog.require('dm.data.Quad');

/**
 * @class
 * Represents an RDF Triple
 *
 * @author tandres@drew.edu (Tim Andres)
 * 
 * @param {string|dm.data.Term} subject
 * @param {string|dm.data.Term} predicate
 * @param {string|dm.data.Term} object
 */
dm.data.Triple = function(subject, predicate, object) {
    this.subject = subject;
    this.predicate = predicate;
    this.object = object;

    this.timeCreated = goog.now();
};

/**
 * Returns a clone of this quad.
 * @return {dm.data.Quad} clone.
 */
dm.data.Triple.prototype.clone = function() {
    return new dm.data.Triple(this.subject, this.predicate, this.object);
};

/**
 * Returns true if the other Triple has the same subject, predicate, object, and context as this Triple.
 * @param  {dm.data.Triple} other Triple to test.
 * @return {boolean}            true if equal.
 */
dm.data.Triple.prototype.equals = function(other) {
    return typeof other == 'object' &&
        this.subject == other.subject && this.predicate == other.predicate &&
        this.object == other.object && this.context == other.context;
};


dm.data.Triple.prototype.toString = function() {
    return [this.subject, this.predicate, this.object, '.'].join(' ');
};

dm.data.Triple.prototype.toArray = function() {
    return [this.subject, this.predicate, this.object];
};

dm.data.Triple.fromQuad = function(quad) {
    return new dm.data.Triple(quad.subject, quad.predicate, quad.object);
}

dm.data.Triple.prototype.toQuad = function(context) {
    return new dm.data.Quad(this.subject, this.predicate, this.object, context);
};