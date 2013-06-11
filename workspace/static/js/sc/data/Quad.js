goog.provide('sc.data.Quad');
goog.require('jquery.rdfquery');

/**
 * @class
 * Represents an RDF Quad (a triple with a context)
 *
 * @author tandres@drew.edu (Tim Andres)
 * 
 * @param {string} subject
 * @param {string} predicate
 * @param {string} object
 * @param {string} context
 */
sc.data.Quad = function(subject, predicate, object, context) {
    this.subject = subject;
    this.predicate = predicate;
    this.object = object;
    this.context = context;

    this.timeCreated = goog.now();
};

/**
 * Returns a clone of this quad.
 * @return {sc.data.Quad} clone.
 */
sc.data.Quad.prototype.clone = function() {
    return new sc.data.Quad(this.subject, this.predicate, this.object, this.context);
};

/**
 * Returns true if the other quad has the same subject, predicate, object, and context as this quad.
 * @param  {sc.data.Quad} other Quad to test.
 * @return {boolean}            true if equal.
 */
sc.data.Quad.prototype.equals = function(other) {
    return typeof other == 'object' &&
        this.subject == other.subject && this.predicate == other.predicate &&
        this.object == other.object && this.context == other.context;
};


sc.data.Quad.prototype.toString = function() {
    return [this.subject, this.predicate, this.object, this.context, '.'].join(' ');
};