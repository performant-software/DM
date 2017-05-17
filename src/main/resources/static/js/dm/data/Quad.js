goog.provide('dm.data.Quad');

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
dm.data.Quad = function(subject, predicate, object, context) {
    this.subject = subject;
    this.predicate = predicate;
    this.object = object;
    this.context = context;

    this.timeCreated = goog.now();
};

/**
 * Returns a clone of this quad.
 * @return {dm.data.Quad} clone.
 */
dm.data.Quad.prototype.clone = function() {
    return new dm.data.Quad(this.subject, this.predicate, this.object, this.context);
};

/**
 * Returns true if the other quad has the same subject, predicate, object, and context as this quad.
 * @param  {dm.data.Quad} other Quad to test.
 * @return {boolean}            true if equal.
 */
dm.data.Quad.prototype.equals = function(other) {
    return typeof other == 'object' &&
        this.subject == other.subject && this.predicate == other.predicate &&
        this.object == other.object && this.context == other.context;
};


dm.data.Quad.prototype.toString = function() {
    return [this.subject, this.predicate, this.object, this.context, '.'].join(' ');
};

dm.data.Quad.prototype.toArray = function() {
    return [this.subject, this.predicate, this.object, this.context];
};