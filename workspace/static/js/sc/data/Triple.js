goog.provide('sc.data.Triple');

/**
 * A basic representation of an RDF triple
 * 
 * @constructor
 *
 * @author tandres@drew.edu (Tim Andres)
 *
 * @param {string} subject The subject of the triple.
 * @param {string} predicate The predicate of the triple.
 * @param {string} object The object of the triple.
 */
sc.data.Triple = function(subject, predicate, object) {
    this.subject = subject;
    this.predicate = predicate;
    this.object = object;
    
    this.timeCreated = goog.now();
};

/**
 * @return {string}
 */
sc.data.Triple.prototype.getSubject = function() {
    return this.subject;
};

/**
 * @return {string}
 */
sc.data.Triple.prototype.getPredicate = function() {
    return this.predicate;
};

/**
 * @return {string}
 */
sc.data.Triple.prototype.getObject = function() {
    return this.object;
};

/**
 * @param subject {string}
 */
sc.data.Triple.prototype.setSubject = function(subject) {
    this.subject = subject;
};

/**
 * @param predicate {string}
 */
sc.data.Triple.prototype.setPredicate = function(predicate) {
    this.predicate = predicate;
};

/**
 * @param object {string}
 */
sc.data.Triple.prototype.setObject = function(object) {
    this.object = object;
};

sc.data.Triple.prototype.equals = function(other) {
    return typeof other == 'object' &&
        this.subject == other.subject && this.predicate == other.predicate &&
        this.object == other.object;
};

sc.data.Triple.prototype.setSource = function(url) {
    this.sourceUrl = url;
};

sc.data.Triple.prototype.getSource = function() {
    return this.sourceUrl;
};

sc.data.Triple.prototype.toString = function() {
    return [this.subject, this.predicate, this.object, ' .'].join(' ');
};

sc.data.Triple.createFromRdfqueryTriple = function(jqTriple) {
    var subject = jqTriple.subject.toString();
    var predicate = jqTriple.property.toString();
    var object = jqTriple.object.toString();

    var triple = new sc.data.Triple(subject, predicate, object);
    
    return triple;
};
