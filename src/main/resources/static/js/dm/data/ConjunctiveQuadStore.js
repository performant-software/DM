goog.provide('dm.data.ConjunctiveQuadStore');

goog.require('dm.data.QuadStore');

goog.require('goog.structs.Set');
goog.require('dm.util.DefaultDict');
goog.require('dm.data.BNode');

/**
 * @author  tandres@drew.edu (Tim Andres)
 * 
 * @class
 * @extends {dm.data.QuadStore}
 * Allows for querying and manipulation of multiple quad stores at once. (Queries are performed live).
 * Implements all public methods of {dm.data.QuadStore}.
 * Instances of this class only maintain references to the added stores, so they do not require the quad stores
 * to be copied in memory. Therefore, it is just as efficient to instantiate a new instance of this class whenever
 * it is needed as it is to maintain a single instance to be shared.
 * @param  {Array} stores The Quad Stores
 */
dm.data.ConjunctiveQuadStore = function(stores) {
    this.stores = new goog.structs.Set(stores);
};
goog.inherits(dm.data.ConjunctiveQuadStore, dm.data.QuadStore);

dm.data.ConjunctiveQuadStore.prototype.addStore = function(store) {
    this.stores.add(store);
};

dm.data.ConjunctiveQuadStore.prototype.addStores = function(stores) {
    this.stores.addAll(stores);
};

dm.data.ConjunctiveQuadStore.prototype.removeStore = function(store) {
    this.stores.remove(store);
};

dm.data.ConjunctiveQuadStore.prototype.removeStores = function(stores) {
    this.stores.removeAll(stores);
};

dm.data.ConjunctiveQuadStore.prototype.queryReturningSet = function(subject, predicate, object, context) {
    var s = new goog.structs.Set();

    goog.structs.forEach(this.stores, function(store) {
        s.addAll(store._queryReturningSet(subject, predicate, object, context));
    }, this);

    return s;
};

dm.data.ConjunctiveQuadStore.prototype._queryReturningSet = dm.data.ConjunctiveQuadStore.prototype.queryReturningSet;

dm.data.ConjunctiveQuadStore.prototype.query = function(subject, predicate, object, context) {
    return this.queryReturningSet(subject, predicate, object, context).getValues();
};

dm.data.ConjunctiveQuadStore.prototype.numQuadsMatchingQuery = function(subject, predicate, object, context) {
    return this.queryReturningSet(subject, predicate, object, context).getCount();
};

dm.data.ConjunctiveQuadStore.prototype.containsQuadMatchingQuery = function(subject, predicate, object, context) {
    return this.numQuadsMatchingQuery(subject, predicate, object, context) > 0;
};

dm.data.ConjunctiveQuadStore.prototype.containsQuad = function(quad) {
    return this.containsQuadMatchingQuery(quad.subject, quad.predicate, quad.object, quad.context);
};

dm.data.ConjunctiveQuadStore.prototype.forEachQuadMatchingQuery = function(subject, predicate, object, context, fn, opt_obj) {
    if (opt_obj) {
        fn = fn.bind(opt_obj);
    }

    goog.structs.every(
        this.queryReturningSet(subject, predicate, object, context),
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

dm.data.ConjunctiveQuadStore.prototype.forEachQuad = function(fn, opt_obj) {
    if (opt_obj) {
        fn = fn.bind(opt_obj);
    }

    goog.structs.every(
        this.queryReturningSet(null, null, null, null),
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

dm.data.ConjunctiveQuadStore.prototype.addQuad = function(quad) {
    goog.structs.forEach(this.stores, function(store) {
        store.addQuad(quad);
    }, this);

    return this;
};

dm.data.ConjunctiveQuadStore.prototype._removeQuad = function(quad) {
    throw "Unimplemented private method";
};

dm.data.ConjunctiveQuadStore.prototype._removeQuads = function(quads) {
    throw "Unimplemented private method";
};

dm.data.ConjunctiveQuadStore.prototype.removeQuadsMatchingQuery = function(subject, predicate, object, context) {
    var ret = false;

    goog.structs.forEach(this.stores, function(store) {
        if (store.removeQuadsMatchingQuery(subject, predicate, object, context)) {
            ret = true;
        }
    }, this);

    return true;
};

dm.data.ConjunctiveQuadStore.prototype.removeQuad = function(quad) {
    return this.removeQuadsMatchingQuery(quad.subject, quad.predicate, quad.object, quad.context);
};

dm.data.ConjunctiveQuadStore.prototype.getQuads = function() {
    return this.query(null, null, null, null);
};

dm.data.ConjunctiveQuadStore.prototype.getCount = function() {
    return this.queryReturningSet(null, null, null, null).getCount();
};

dm.data.ConjunctiveQuadStore.prototype.clone = function() {
    throw "Should not be called on a conjunctive quad store. Did you mean to call getSingleQuadStore()?";
};

/**
 * Returns one instance of a {dm.data.QuadStore} which contains all the quads in this ConjunctiveQuadStore,
 * but without updating based on changes in its source QuadStores.
 * @return {dm.data.QuadStore} The new QuadStore.
 */
dm.data.ConjunctiveQuadStore.prototype.getSingleQuadStore = function() {
    var singleStore = new dm.data.QuadStore();

    goog.structs.forEach(this.stores, function(store) {
        singleStore.addQuads(store.quads);
    }, this);

    return singleStore;
};

dm.data.ConjunctiveQuadStore.prototype.clear = function() {
    goog.structs.forEach(this.stores, function(store) {
        store.clear();
    }, this);

    return this;
};

dm.data.ConjunctiveQuadStore.prototype.intersection = function(other) {
    var store = new dm.data.QuadStore();
    var a, b;
    if (other.getCount() > this.getCount()) {
        a = this;
        b = other;
    }
    else {
        a = other;
        b = this;
    }

    goog.structs.forEach(a.getQuads(), function(quad) {
        if (b.contains(quad)) {
            store.addQuad(quad.clone());
        }
    }, this);

    return store;
};

dm.data.ConjunctiveQuadStore.prototype.difference = function(other) {
    var store = new dm.data.QuadStore(this.quads.difference(other));

    goog.structs.forEach(this.getQuads, function(quad) {
        if (!other.contains(quad)) {
            store.addQuad(quad.clone());
        }
    }, this);

    return store;
};
