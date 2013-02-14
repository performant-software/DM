goog.provide('sc.data.QuadStore');

goog.require('goog.array');
goog.require('goog.structs.Set');
goog.require('goog.string');
goog.require('sc.util.DefaultDict');
goog.require('sc.util.Namespaces');

/**
 * An indexed store of {sc.data.Quad} Quads (triples with a context),
 * which allows fast querying.
 *
 * @class 
 * 
 * @author tandres@drew.edu (Tim Andres)
 * 
 * @param {?array.<sc.data.Quad>} opt_quads Quads to add to the store.
 */
sc.data.QuadStore = function(opt_quads) {
    this.quads = new goog.structs.Set();

    this.indexedQuads = new sc.util.DefaultDict(function() {
        return new goog.structs.Set();
    });

    if (opt_quads) {
        this.addQuads(opt_quads);
    }
};

/**
 * @private
 * Returns a set of quads matching the specified pattern.
 * (null or undefined is treated as a wildcard)
 *
 * IMPORTANT: Modifying this set modifies the index.
 * 
 * @param  {string|null|undefined} subject    The subject to search for, or null as a wildcard.
 * @param  {string|null|undefined} predicate  The predicate to search for, or null as a wildcard.
 * @param  {string|null|undefined} object     The object to search for, or null as a wildcard.
 * @param  {string|null|undefined} context    The context to search for, or null as a wildcard.
 * @return {goog.structs.Set.<sc.data.Quad>}  The set of quads matching the query.
 */
sc.data.QuadStore.prototype._queryReturningSet = function(subject, predicate, object, context) {
    var key = sc.data.QuadStore.getIndexKeyForQuery(subject, predicate, object, context);

    return this.indexedQuads.get(key, true);
};

/**
 * Returns a set of quads matching the specified pattern.
 * (null or undefined is treated as a wildcard)
 * @param  {string|null|undefined} subject    The subject to search for, or null as a wildcard.
 * @param  {string|null|undefined} predicate  The predicate to search for, or null as a wildcard.
 * @param  {string|null|undefined} object     The object to search for, or null as a wildcard.
 * @param  {string|null|undefined} context    The context to search for, or null as a wildcard.
 * @return {goog.structs.Set.<sc.data.Quad>}  A set of quads matching the query.
 */
sc.data.QuadStore.prototype.queryReturningSet = function(subject, predicate, object, context) {
    return this._queryReturningSet(subject, object, predicate, object, context).clone();
};

/**
 * Returns an array of quads matching the specified pattern.
 * (null or undefined is treated as a wildcard)
 * @param  {string|null|undefined} subject   The subject to search for, or null as a wildcard.
 * @param  {string|null|undefined} predicate The predicate to search for, or null as a wildcard.
 * @param  {string|null|undefined} object    The object to search for, or null as a wildcard.
 * @param  {string|null|undefined} context   The context to search for, or null as a wildcard.
 * @return {array.<sc.data.Quad>}            A list of quads matching the query.
 */
sc.data.QuadStore.prototype.query = function(subject, predicate, object, context) {
    return this._queryReturningSet(subject, predicate, object, context).getValues();
};

/**
 * Returns the number of quads matching the specified pattern.
 * (null or undefined is treated as a wildcard)
 * @param  {string|null|undefined} subject   The subject to search for, or null as a wildcard.
 * @param  {string|null|undefined} predicate The predicate to search for, or null as a wildcard.
 * @param  {string|null|undefined} object    The object to search for, or null as a wildcard.
 * @param  {string|null|undefined} context   The context to search for, or null as a wildcard.
 * @return {Number}                          The number of quads matching the query.
 */
sc.data.QuadStore.prototype.numQuadsMatchingQuery = function(subject, predicate, object, context) {
    return this._queryReturningSet(subject, predicate, object, context).getCount();
};

/**
 * Calls a function with each quad matching the specified pattern.
 * (null or undefined is treated as a wildcard)
 * @param  {string|null|undefined}  subject   The subject to search for, or null as a wildcard.
 * @param  {string|null|undefined}  predicate The predicate to search for, or null as a wildcard.
 * @param  {string|null|undefined}  object    The object to search for, or null as a wildcard.
 * @param  {string|null|undefined}  context   The context to search for, or null as a wildcard.
 * @param  {Function(sc.data.Quad)} fn        A function which takes a Quad as its first paramater.
 * @param  {Object}                 [varname] [description]
 */
sc.data.QuadStore.prototype.forEachQuadMatchingQuery = function(subject, predicate, object, context, fn, opt_obj) {
    goog.structs.forEach(
        this._queryReturningSet(subject, predicate, object, context),
        fn,
        opt_obj
    );
};

/**
 * Adds a quad to the store, and indexes it.
 * @param {sc.data.Quad} quad Quad to add.
 */
sc.data.QuadStore.prototype.addQuad = function(quad) {
    var keys = sc.data.QuadStore.generateIndexKeys(quad);

    for (var i=0, len=keys.length; i<len; i++) {
        var key = keys[i];

        this.indexedQuads.get(key).add(quad);
    }

    return this;
};

/**
 * Adds a collection of quads to the store, and indexes them.
 * @param {array.<sc.data.Quad>|goog.structs.Collection.<sc.data.Quad>}
 *        quads An array or collection of quads.
 */
sc.data.QuadStore.prototype.addQuads = function(quads) {
    goog.structs.forEach(quads, function(quad) {
        this.addQuad(quad);
    }, this);

    return this;
};

/**
 * Returns a list of all quads in the store.
 * @return {Array.<sc.data.Quad>} A list of all the quads in the store.
 */
sc.data.QuadStore.prototype.getQuads = function() {
    return this.quads.getValues();
};

/**
 * Returns the number of quads in the store.
 * @return {Number} The number of quads in the store.
 */
sc.data.QuadStore.prototype.getCount = function() {
    return this.quads.getCount();
};

/**
 * Generates all possible keys under which the given quad should be
 * stored in the index.
 * @param  {sc.data.Quad} quad The quad to index.
 * @return {array.<string>}    A list of all possible keys for the index.
 */
sc.data.QuadStore.generateIndexKeys = function(quad) {
    var keys = [
        sc.data.QuadStore.getIndexKeyForQuery(
            quad.subject,
            quad.predicate,
            quad.object,
            quad.context
        ),
        sc.data.QuadStore.getIndexKeyForQuery(
            null,
            quad.predicate,
            quad.object,
            quad.context
        ),
        sc.data.QuadStore.getIndexKeyForQuery(
            quad.subject,
            null,
            quad.object,
            quad.context
        ),
        sc.data.QuadStore.getIndexKeyForQuery(
            quad.subject,
            quad.predicate,
            null,
            quad.context
        ),
        sc.data.QuadStore.getIndexKeyForQuery(
            quad.subject,
            quad.predicate,
            quad.object,
            null
        ),
        sc.data.QuadStore.getIndexKeyForQuery(
            null,
            null,
            quad.object,
            quad.context
        ),
        sc.data.QuadStore.getIndexKeyForQuery(
            quad.subject,
            null,
            null,
            quad.context
        ),
        sc.data.QuadStore.getIndexKeyForQuery(
            quad.subject,
            quad.predicate,
            null,
            null
        ),
        sc.data.QuadStore.getIndexKeyForQuery(
            quad.subject,
            quad.predicate,
            quad.object,
            null
        )
    ];

    return keys;
};

/**
 * Wildcard character to be used in the index.
 * @type {String}
 * @constant
 */
sc.data.QuadStore.WILDCARD = '*';

/**
 * @private
 * Returns a wildcard if the string is null or the wildcard string,
 * or the hash code of the string otherwise.
 * This limits the length of the index keys.
 * @param  {string|null} str The string to encode.
 * @return {string}          The encoded string.
 */
sc.data.QuadStore._hashCodeOrWildcard = function(str) {
    if (str == null || str == sc.data.QuadStore.WILDCARD) {
        return sc.data.QuadStore.WILDCARD;
    }
    else {
        return goog.string.hashCode(str);
    }
};

/**
 * Returns the appropriate key for the index for a given query, treating
 * null as a wildcard.
 * @param  {string|null|undefined} subject   The subject to search for, or null as a wildcard.
 * @param  {string|null|undefined} predicate The predicate to search for, or null as a wildcard.
 * @param  {string|null|undefined} object    The object to search for, or null as a wildcard.
 * @param  {string|null|undefined} context   The context to search for, or null as a wildcard.
 * @return {string}                          The index key to use.
 */
sc.data.QuadStore.getIndexKeyForQuery = function(subject, predicate, object, context) {
    var key = [];

    key.push('_s:' + sc.data.QuadStore._hashCodeOrWildcard(subject));
    key.push('_p:' + sc.data.QuadStore._hashCodeOrWildcard(predicate));
    key.push('_o:' + sc.data.QuadStore._hashCodeOrWildcard(object));
    key.push('_c:' + sc.data.QuadStore._hashCodeOrWildcard(context));

    return key.join(';');
};