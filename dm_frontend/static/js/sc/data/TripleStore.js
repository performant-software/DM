goog.provide('sc.data.TripleStore');

goog.require('goog.array');
goog.require('goog.structs.Set');
goog.require('sc.util.DefaultDict');
goog.require('sc.util.Namespaces');

/**
 * @class
 *
 * A structure to hold rdf triples which allows for fast lookups using double-dictionaries
 *
 * When two out of three pieces of information about a resource are given, such as subject and predicate,
 * the third piece of information (in this case, all objects for that query) can be looked up in constant time
 *
 * @author tandres@drew.edu (Tim Andres)
 */
sc.data.TripleStore = function(opt_namespaceUtil) {
    this.namespaceUtil = opt_namespaceUtil || new sc.util.Namespaces();

    var defaultDictOfSets = function() {
        return new sc.util.DefaultDict(function() {
            return new goog.structs.Set();
        });
    };
    var defaultDictOfLists = function() {
        return new sc.util.DefaultDict(function() {
            return [];
        });
    };
    
    this.triples = new goog.structs.Set();

    this.triplesBySubject = new sc.util.DefaultDict(sc.util.DefaultDict.GENERATORS.list);
    this.triplesByPredicate = new sc.util.DefaultDict(sc.util.DefaultDict.GENERATORS.list);
    this.triplesByObject = new sc.util.DefaultDict(sc.util.DefaultDict.GENERATORS.list);

    this.objectsByPredicateBySubject = new sc.util.DefaultDict(defaultDictOfSets);
    this.subjectsByPredicateByObject = new sc.util.DefaultDict(defaultDictOfSets);
    this.predicatesBySubjectByObject = new sc.util.DefaultDict(defaultDictOfSets);

    this.triplesByPredicateBySubject = new sc.util.DefaultDict(defaultDictOfLists);
    this.triplesByPredicateByObject = new sc.util.DefaultDict(defaultDictOfLists);
    this.triplesBySubjectByObject = new sc.util.DefaultDict(defaultDictOfLists);
};

/**
 * Adds the given triple object to the triple store, indexing it for fast lookups
 * @param {sc.data.Triple} triple
 */
sc.data.TripleStore.prototype.addTriple = function(triple) {
    var subject = triple.getSubject();
    var predicate = triple.getPredicate();
    var object = triple.getObject();
    
    this.triples.add(triple);

    this.triplesBySubject.get(subject).push(triple);
    this.triplesByPredicate.get(predicate).push(triple);
    this.triplesByObject.get(object).push(triple);

    this.objectsByPredicateBySubject.get(subject).get(predicate).add(object);
    this.subjectsByPredicateByObject.get(object).get(predicate).add(subject);
    this.predicatesBySubjectByObject.get(object).get(subject).add(predicate);

    this.triplesByPredicateBySubject.get(subject).get(predicate).push(triple);
    this.triplesByPredicateByObject.get(object).get(predicate).push(triple);
    this.triplesBySubjectByObject.get(object).get(subject).push(triple);
};

/**
 * Adds the given triple objects to the triple store, indexing them for fast lookups
 * @param {Array.<sc.data.Triple>} triples
 */
sc.data.TripleStore.prototype.addTriples = function(triples) {
    for (var i = 0, len = triples.length; i < len; i++) {
        var triple = triples[i];

        this.addTriple(triple);
    }
};

/**
 * Returns a {goog.structs.Set} of the objects of all triples with the given subject and predicate
 * @param {string} subject
 * @param {string} predicate
 * @return {goog.structs.Set.<string>}
 */
sc.data.TripleStore.prototype.getObjectsSetWithSubjectAndPredicate = function(subject, predicate) {
    predicate = this.namespaceUtil.autoExpand(predicate);

    return this.objectsByPredicateBySubject.get(subject, true).get(predicate, true);
};

/**
 * Returns a list of the objects of all triples with the given subject and predicate
 * @param {string} subject
 * @param {string} predicate
 * @return {Array.<string>}
 */
sc.data.TripleStore.prototype.getObjectsWithSubjectAndPredicate = function(subject, predicate) {
    return this.getObjectsSetWithSubjectAndPredicate(subject, predicate).getValues();
};

/**
 * Returns a {goog.structs.Set} of the subjects of all triples with the given predicate and object
 * @param {string} predicate
 * @param {string} object
 * @return {goog.structs.Set.<string>}
 */
sc.data.TripleStore.prototype.getSubjectsSetWithPredicateAndObject = function(predicate, object) {
    predicate = this.namespaceUtil.autoExpand(predicate);

    return this.subjectsByPredicateByObject.get(object, true).get(predicate, true);
};

/**
 * Returns a list of the subjects of all triples with the given predicate and object
 * @param {string} predicate
 * @param {string} object
 * @return {Array.<string>}
 */
sc.data.TripleStore.prototype.getSubjectsWithPredicateAndObject = function(predicate, object) {
    return this.getSubjectsSetWithPredicateAndObject(predicate, object).getValues();
};

/**
 * Returns a {goog.structs.Set} of the predicates of all triples with the given subject and object
 * @param {string} subject
 * @param {string} object
 * @return {goog.structs.Set.<string>}
 */
sc.data.TripleStore.prototype.getPredicatesSetWithSubjectAndObject = function(subject, object) {
    return this.predicatesBySubjectByObject.get(object, true).get(subject, true);
};

/**
 * Returns a {goog.structs.Set} of the predicates of all triples with the given subject and object
 * @param {string} subject
 * @param {string} object
 * @return {goog.structs.Set.<string>}
 */
sc.data.TripleStore.prototype.getPredicatesWithSubjectAndObject = function(subject, object) {
    return this.getPredicatesSetWithSubjectAndObject(subject, object).getValues();
};

/**
 * Returns all triples with the given subject
 * @return {Array.<sc.data.Triple>}
 */
sc.data.TripleStore.prototype.getTriplesWithSubject = function(subject) {
    return goog.array.clone(this.triplesBySubject.get(subject, true));
};

/**
 * Returns all triples with the given predicate
 * @return {Array.<sc.data.Triple>}
 */
sc.data.TripleStore.prototype.getTriplesWithPredicate = function(predicate) {
    predicate = this.namespaceUtil.autoExpand(predicate);

    return goog.array.clone(this.triplesByPredicate.get(predicate, true));
};

/**
 * Returns all triples with the given object
 * @return {Array.<sc.data.Triple>}
 */
sc.data.TripleStore.prototype.getTriplesWithObject = function(object) {
    return goog.array.clone(this.triplesByObject.get(object, true));
};

/**
 * Returns an array of all triples in the triplestore.
 */
sc.data.TripleStore.prototype.getAllTriples = function() {
    return this.triples.getValues();
};

/**
 * Convenience method for returning the subject uris of all triples with a given type
 * (Shorthand for getSubjectsSetWithPredicateAndObject('rdf:type', <type>))
 * @param {string} type
 * @return {goog.structs.Set.<string>}
 */
sc.data.TripleStore.prototype.getSubjectsSetWithType = function(type) {
    var type = this.namespaceUtil.autoExpand(type);

    return this.getSubjectsSetWithPredicateAndObject('rdf:type', type);
};

/**
 * Checks to see if the triple store contains any information about a resource
 * with the given uri
 * @param {string} uri
 * @return {boolean}
 */
sc.data.TripleStore.prototype.containsResource = function(uri) {
    return (this.triplesBySubject.containsKey(uri) && this.triplesBySubject.get(uri).length > 0) ||
    (this.triplesByObject.containsKey(uri) && this.triplesByObject.get(uri).length > 0);
};

/**
 * Checks to see if the triple store contains any triples with a given predicate
 */
sc.data.TripleStore.prototype.containsPredicate = function(predicate) {
    predicate = this.namespaceUtil.autoExpand(predicate);

    return this.triplesByPredicate.containsKey(predicate) && this.triplesByPredicate.get(predicate).length > 0;
};

/**
 * Returns a raw object representation of the aggregated triples referencing a subject uri
 * in the format:
 * {
 *      predicateA: [value1, value2, ...],
 *      predicateB: [value1, value2, ...],
 *      predicateC: ...
 * }
 * @param {string} uri
 * @return {Object}
 */
sc.data.TripleStore.prototype.dumpResource = function(uri) {
    var obj = {};

    var predicateMap = this.objectsByPredicateBySubject.get(uri);
    var predicateKeys = predicateMap.getKeys();

    for (var i = 0, len = predicateKeys.length; i < len; i++) {
        var key = predicateKeys[i];

        var values = predicateMap.get(key).getValues();
        if (values.length > 0) {
            obj[key] = values;
        }
    }

    return obj;
};
