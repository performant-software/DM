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
    if (subject == null && predicate == null && object == null && context == null) {
        return this.quads;
    }
    else {
        var key = sc.data.QuadStore.getIndexKeyForQuery(subject, predicate, object, context);

        return this.indexedQuads.get(key, true);
    }
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
 * Checks if this store contains a given quad.
 * @param  {sc.data.Quad} quad The quad to check for.
 * @return {boolean}           Whether this store contains the quad.
 */
sc.data.QuadStore.prototype.containsQuad = function(quad) {
    return this.containsQuadMatchingQuery(quad.subject, quad.predicate, quad.object, quad.context);
};

/**
 * Checks if the store contains a quad matching a given pattern.
 * (null or undefined is treated as a wildcard)
 * @param  {string|null|undefined} subject   The subject to search for, or null as a wildcard.
 * @param  {string|null|undefined} predicate The predicate to search for, or null as a wildcard.
 * @param  {string|null|undefined} object    The object to search for, or null as a wildcard.
 * @param  {string|null|undefined} context   The context to search for, or null as a wildcard.
 * @return {boolean}                         Whether a matching quad is found.
 */
sc.data.QuadStore.prototype.containsQuadMatchingQuery = function(subject, predicate, object, context) {
    return this.numQuadsMatchingQuery(subject, predicate, object, context) > 0;
};

/**
 * Calls a function with each quad matching the specified pattern.
 * (null or undefined is treated as a wildcard)
 * @param  {string|null|undefined}  subject   The subject to search for, or null as a wildcard.
 * @param  {string|null|undefined}  predicate The predicate to search for, or null as a wildcard.
 * @param  {string|null|undefined}  object    The object to search for, or null as a wildcard.
 * @param  {string|null|undefined}  context   The context to search for, or null as a wildcard.
 * @param  {Function(sc.data.Quad)} fn        A function which takes a Quad as its first paramater.
 *                                            If the function returns false, iteration will stop.
 * @param  {Object}                 [varname] [description]
 */
sc.data.QuadStore.prototype.forEachQuadMatchingQuery = function(subject, predicate, object, context, fn, opt_obj) {
    if (opt_obj) {
        fn = fn.bind(opt_obj);
    }

    goog.structs.every(
        this._queryReturningSet(subject, predicate, object, context),
        function(quad) {
            if (fn(quad, this) === false) {
                return false;
            }
            else {
                return true;
            }
        },
        this
    );
};

sc.data.QuadStore.prototype.forEachQuad = function(fn, opt_obj) {
    if (opt_obj) {
        fn = fn.bind(opt_obj);
    }

    goog.structs.every(
        this.quads,
        function(quad) {
            if (fn(quad, this) === false) {
                return false;
            }
            else {
                return true;
            }
        },
        this
    );
};

/**
 * Returns a set of the subjects of all quads matching the specified pattern.
 * @param  {string|null|undefined}  subject   The subject to search for, or null as a wildcard.
 * @param  {string|null|undefined}  predicate The predicate to search for, or null as a wildcard.
 * @param  {string|null|undefined}  object    The object to search for, or null as a wildcard.
 * @param  {string|null|undefined}  context   The context to search for, or null as a wildcard.
 * @return {goog.structs.Set}                 A set of subjects matching the query.
 */
sc.data.QuadStore.prototype.subjectsSetMatchingQuery = function(subject, predicate, object, context) {
    var set = new goog.structs.Set();

    this.forEachQuadMatchingQuery(subject, predicate, object, context,
        function(quad) {
            set.add(quad.subject);
        }, this);

    return set;
};

/**
 * Returns a set of the predicates of all quads matching the specified pattern.
 * @param  {string|null|undefined}  subject   The subject to search for, or null as a wildcard.
 * @param  {string|null|undefined}  predicate The predicate to search for, or null as a wildcard.
 * @param  {string|null|undefined}  object    The object to search for, or null as a wildcard.
 * @param  {string|null|undefined}  context   The context to search for, or null as a wildcard.
 * @return {goog.structs.Set}                 A set of predicates matching the query.
 */
sc.data.QuadStore.prototype.predicatesSetMatchingQuery = function(subject, predicate, object, context) {
    var set = new goog.structs.Set();

    this.forEachQuadMatchingQuery(subject, predicate, object, context,
        function(quad) {
            set.add(quad.predicate);
        }, this);

    return set;
};

/**
 * Returns a set of the objects of all quads matching the specified pattern.
 * @param  {string|null|undefined}  subject   The subject to search for, or null as a wildcard.
 * @param  {string|null|undefined}  predicate The predicate to search for, or null as a wildcard.
 * @param  {string|null|undefined}  object    The object to search for, or null as a wildcard.
 * @param  {string|null|undefined}  context   The context to search for, or null as a wildcard.
 * @return {goog.structs.Set}                 A set of objects matching the query.
 */
sc.data.QuadStore.prototype.objectsSetMatchingQuery = function(subject, predicate, object, context) {
    var set = new goog.structs.Set();

    this.forEachQuadMatchingQuery(subject, predicate, object, context,
        function(quad) {
            set.add(quad.object);
        }, this);

    return set;
};

/**
 * Returns a set of the contexts of all quads matching the specified pattern.
 * @param  {string|null|undefined}  subject   The subject to search for, or null as a wildcard.
 * @param  {string|null|undefined}  predicate The predicate to search for, or null as a wildcard.
 * @param  {string|null|undefined}  object    The object to search for, or null as a wildcard.
 * @param  {string|null|undefined}  context   The context to search for, or null as a wildcard.
 * @return {goog.structs.Set}                 A set of contexts matching the query.
 */
sc.data.QuadStore.prototype.contextsSetMatchingQuery = function(subject, predicate, object, context) {
    var set = new goog.structs.Set();

    this.forEachQuadMatchingQuery(subject, predicate, object, context,
        function(quad) {
            set.add(quad.context);
        }, this);

    return set;
};

/**
 * Returns a list of the subjects of all quads matching the specified pattern.
 * @param  {string|null|undefined}  subject   The subject to search for, or null as a wildcard.
 * @param  {string|null|undefined}  predicate The predicate to search for, or null as a wildcard.
 * @param  {string|null|undefined}  object    The object to search for, or null as a wildcard.
 * @param  {string|null|undefined}  context   The context to search for, or null as a wildcard.
 * @return {Array}                            A list of subjects matching the query.
 */
sc.data.QuadStore.prototype.subjectsMatchingQuery = function(subject, predicate, object, context) {
    return this.subjectsSetMatchingQuery(subject, predicate, object, context).getValues();
};

/**
 * Returns a list of the predicates of all quads matching the specified pattern.
 * @param  {string|null|undefined}  subject   The subject to search for, or null as a wildcard.
 * @param  {string|null|undefined}  predicate The predicate to search for, or null as a wildcard.
 * @param  {string|null|undefined}  object    The object to search for, or null as a wildcard.
 * @param  {string|null|undefined}  context   The context to search for, or null as a wildcard.
 * @return {Array}                            A list of predicates matching the query.
 */
sc.data.QuadStore.prototype.predicatesMatchingQuery = function(subject, predicate, object, context) {
    return this.predicatesSetMatchingQuery(subject, predicate, object, context).getValues();
};

/**
 * Returns a list of the objects of all quads matching the specified pattern.
 * @param  {string|null|undefined}  subject   The subject to search for, or null as a wildcard.
 * @param  {string|null|undefined}  predicate The predicate to search for, or null as a wildcard.
 * @param  {string|null|undefined}  object    The object to search for, or null as a wildcard.
 * @param  {string|null|undefined}  context   The context to search for, or null as a wildcard.
 * @return {Array}                            A list of objects matching the query.
 */
sc.data.QuadStore.prototype.objectsMatchingQuery = function(subject, predicate, object, context) {
    return this.objectsSetMatchingQuery(subject, predicate, object, context).getValues();
};

/**
 * Returns a list of the contexts of all quads matching the specified pattern.
 * @param  {string|null|undefined}  subject   The subject to search for, or null as a wildcard.
 * @param  {string|null|undefined}  predicate The predicate to search for, or null as a wildcard.
 * @param  {string|null|undefined}  object    The object to search for, or null as a wildcard.
 * @param  {string|null|undefined}  context   The context to search for, or null as a wildcard.
 * @return {Array}                            A list of contexts matching the query.
 */
sc.data.QuadStore.prototype.contextsMatchingQuery = function(subject, predicate, object, context) {
    return this.contextsSetMatchingQuery(subject, predicate, object, context).getValues();
};

/**
 * Adds a quad to the store, and indexes it.
 * @param {sc.data.Quad} quad Quad to add.
 */
sc.data.QuadStore.prototype.addQuad = function(quad) {
    if (! this.containsQuad(quad)) {
        this.quads.add(quad);

        var keys = sc.data.QuadStore.generateIndexKeys(quad);

        for (var i=0, len=keys.length; i<len; i++) {
            var key = keys[i];

            this.indexedQuads.get(key).add(quad);
        }
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
 * Removes a quad (by reference) from the store.
 * If you don't have a reference to the quad, use sc.data.QuadStore#removeQuadsMatchingQuery or #removeQuad.
 * @param  {sc.data.Quad} quad A reference to the quad to remove.
 * @return {boolean}      Whether the quad was found and removed.
 */
sc.data.QuadStore.prototype._removeQuad = function(quad) {
    if (this.quads.remove(quad)) {
        var keys = sc.data.QuadStore.generateIndexKeys(quad);

        goog.structs.forEach(keys, function(key) {
            var set = this.indexedQuads.get(key);

            set.remove(quad);
        }, this);

        return true;
    }
    else {
        return false;
    }
};

/**
 * Removes quads (by reference) from the store.
 * @param  {array.<sc.data.Quad>} quads The quads to remove.
 * @return {sc.data.QuadStore}          this.
 */
sc.data.QuadStore.prototype._removeQuads = function(quads) {
    goog.structs.forEach(quads, function(quad) {
        this._removeQuad(quad);
    }, this);

    return this;
};

/**
 * Removes all quads from the store which match the query.
 * @param  {string|null|undefined}  subject   The subject to search for, or null as a wildcard.
 * @param  {string|null|undefined}  predicate The predicate to search for, or null as a wildcard.
 * @param  {string|null|undefined}  object    The object to search for, or null as a wildcard.
 * @param  {string|null|undefined}  context   The context to search for, or null as a wildcard.
 * @return {boolean}                          Whether any quads were found and removed.
 */
sc.data.QuadStore.prototype.removeQuadsMatchingQuery = function(subject, predicate, object, context) {
    var ret = false;

    this.forEachQuadMatchingQuery(subject, predicate, object, context, function(quad) {
        ret = this._removeQuad(quad);
    }, this);

    return ret;
};

/**
 * Removes a quad from the store.
 * @param  {sc.data.Quad} quad The quad to remove.
 * @return {boolean}           Whether the quad was found and removed.
 */
sc.data.QuadStore.prototype.removeQuad = function(quad) {
    return this.removeQuadsMatchingQuery(quad.subject, quad.predicate, quad.object, quad.context);
};

/**
 * Removes the given quads from the store.
 * @param  {array.<sc.data.Quad>} quads The quads to remove.
 * @return {boolean}                    Whether any quads were found and removed.
 */
sc.data.QuadStore.prototype.removeQuads = function(quads) {
    var ret = false;

    goog.structs.forEach(quads, function(quad) {
        var b = this.removeQuad(quad);

        if (b) {
            ret = true;
        }
    })

    return ret;
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
 * Returns a clone of this Quad Store.
 * @param {boolean} opt_shallow If true, individual quads will not be cloned. This is faster, but may cause referencing issues.
 * @return {sc.data.QuadStore} cloned store.
 */
sc.data.QuadStore.prototype.clone = function(opt_shallow) {
    var store = new sc.data.QuadStore();

    if (opt_shallow) {
        store.quads = this.quads.clone();
        store.indexedQuads = this.indexedQuads.clone();
    }
    else {
        goog.structs.forEach(this.quads, function(quad) {
            store.addQuad(quad.clone());
        }, this);
    }

    return store;
};

/**
 * Removes all quads from the store.
 * @return {sc.data.QuadStore} this.
 */
sc.data.QuadStore.prototype.clear = function() {
    this.quads.clear();
    this.indexedQuads.clear();

    return this;
};

/**
 * Returns a Quad Store containing quads in both this store and the other store.
 * @param  {sc.data.QuadStore} other The other store.
 * @return {sc.data.QuadStore}       A store containing the intersection.
 */
sc.data.QuadStore.prototype.intersection = function(other) {
    var store = new sc.data.QuadStore();
    var a, b;
    if (other.getCount() > this.getCount()) {
        a = this;
        b = other;
    }
    else {
        a = other;
        b = this;
    }

    goog.structs.forEach(a.quads, function(quad) {
        if (b.contains(quad)) {
            store.addQuad(quad.clone());
        }
    }, this);

    return store;
};

/**
 * Finds all values that are present in this store and not in the other store.
 * @param  {sc.data.QuadStore} other The other store.
 * @return {sc.data.QuadStore}       A store containing the difference.
 */
sc.data.QuadStore.prototype.difference = function(other) {
    var store = new sc.data.QuadStore(this.quads.difference(other));

    goog.structs.forEach(this.quads, function(quad) {
        if (!other.contains(quad)) {
            store.addQuad(quad.clone());
        }
    }, this);

    return store;
};

/**
 * Generates all possible keys under which the given quad should be
 * stored in the index.
 * @param  {sc.data.Quad} quad The quad to index.
 * @return {array.<string>}    A list of all possible keys for the index.
 */
sc.data.QuadStore.generateIndexKeys = function(quad) {
    var keys = [
        // Base case
        sc.data.QuadStore.getIndexKeyForQuery(
            quad.subject,
            quad.predicate,
            quad.object,
            quad.context
        ),
        // One wildcard
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
        // Two wildcards
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
            null,
            quad.predicate,
            quad.object,
            null
        ),
        sc.data.QuadStore.getIndexKeyForQuery(
            null,
            quad.predicate,
            null,
            quad.context
        ),
        sc.data.QuadStore.getIndexKeyForQuery(
            quad.subject,
            null,
            quad.object,
            null
        ),
        // Three wildcards
        sc.data.QuadStore.getIndexKeyForQuery(
            null,
            null,
            null,
            quad.context
        ),
        sc.data.QuadStore.getIndexKeyForQuery(
            quad.subject,
            null,
            null,
            null
        ),
        sc.data.QuadStore.getIndexKeyForQuery(
            null,
            quad.predicate,
            null,
            null
        ),
        sc.data.QuadStore.getIndexKeyForQuery(
            null,
            null,
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
        return str;
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

    key.push(['_s:', sc.data.QuadStore._hashCodeOrWildcard(subject)].join(''));
    key.push(['_p:', sc.data.QuadStore._hashCodeOrWildcard(predicate)].join(''));
    key.push(['_o:', sc.data.QuadStore._hashCodeOrWildcard(object)].join(''));
    key.push(['_c:', sc.data.QuadStore._hashCodeOrWildcard(context)].join(''));

    return key.join(';');
};
