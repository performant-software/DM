goog.provide('dm.data.Graph');

goog.require('dm.data.Quad');
goog.require('dm.data.Triple');

/**
 * @author tandres@drew.edu (Tim Andres)
 *
 * @class Represents an RDF Graph
 * 
 * @param  {dm.data.QuadStore} quadStore The QuadStore to use as a data source.
 * @param  {string|dm.data.Uri|null} context  The context to use when querying the QuadStore. If null, this will be treated as a conjunctive graph.
 */
dm.data.Graph = function(quadStore, context) {
    this.quadStore = quadStore;
    this.context = context;
};


/**
 * Returns a set of triples matching the specified pattern.
 * (null or undefined is treated as a wildcard)
 * @param  {string|null|undefined} subject     The subject to search for, or null as a wildcard.
 * @param  {string|null|undefined} predicate   The predicate to search for, or null as a wildcard.
 * @param  {string|null|undefined} object      The object to search for, or null as a wildcard.
 * @return {goog.structs.Set.<dm.data.Triple>} A set of triples matching the query.
 */
dm.data.Graph.prototype.queryReturningSet = function(subject, predicate, object) {
    var triples = new goog.structs.Set();

    this.quadStore.forEachQuadMatchingQuery(subject, predicate, object, this.context, function(quad) {
        triples.add(dm.data.Triple.fromQuad(quad));
    }.bind(this));

    return triples;
};

dm.data.Graph.prototype._queryReturningSet = dm.data.Graph.prototype.queryReturningSet;

/**
 * Returns an array of triples matching the specified pattern.
 * (null or undefined is treated as a wildcard)
 * @param  {string|null|undefined} subject   The subject to search for, or null as a wildcard.
 * @param  {string|null|undefined} predicate The predicate to search for, or null as a wildcard.
 * @param  {string|null|undefined} object    The object to search for, or null as a wildcard.
 * @return {array.<dm.data.Triple>}          A list of triples matching the query.
 */
dm.data.Graph.prototype.query = function(subject, predicate, object) {
    return this.queryReturningSet(subject, predicate, object, this.context).getValues();
};

/**
 * Returns the number of triples matching the specified pattern.
 * (null or undefined is triples as a wildcard)
 * @param  {string|null|undefined} subject   The subject to search for, or null as a wildcard.
 * @param  {string|null|undefined} predicate The predicate to search for, or null as a wildcard.
 * @param  {string|null|undefined} object    The object to search for, or null as a wildcard.
 * @return {Number}                          The number of quads matching the query.
 */
dm.data.Graph.prototype.numTriplesMatchingQuery = function(subject, predicate, object) {
    return this.quadStore.numQuadsMatchingQuery(subject, predicate, object, this.context);
};

/**
 * Checks if this store contains a given triple.
 * @param  {dm.data.Triple} triple The triple to check for.
 * @return {boolean}               Whether this graph contains the triple.
 */
dm.data.Graph.prototype.containsTriple = function(triple) {
    return this.containsTripleMatchingQuery(triple.subject, triple.predicate, triple.object);
};

/**
 * Checks if the store contains a triple matching a given pattern.
 * (null or undefined is treated as a wildcard)
 * @param  {string|null|undefined} subject   The subject to search for, or null as a wildcard.
 * @param  {string|null|undefined} predicate The predicate to search for, or null as a wildcard.
 * @param  {string|null|undefined} object    The object to search for, or null as a wildcard.
 * @return {boolean}                         Whether a matching triple is found.
 */
dm.data.Graph.prototype.containsTripleMatchingQuery = function(subject, predicate, object) {
    return this.quadStore.numQuadsMatchingQuery(subject, predicate, object, this.context) > 0;
};

/**
 * Calls a function with each triple matching the specified pattern.
 * (null or undefined is treated as a wildcard)
 * @param  {string|null|undefined}  subject   The subject to search for, or null as a wildcard.
 * @param  {string|null|undefined}  predicate The predicate to search for, or null as a wildcard.
 * @param  {string|null|undefined}  object    The object to search for, or null as a wildcard.
 * @param  {Function(dm.data.Quad)} fn        A function which takes a Quad as its first paramater.
 *                                            If the function returns false, iteration will stop.
 * @param  {Object}                 [varname] [description]
 */
dm.data.Graph.prototype.forEachTripleMatchingQuery = function(subject, predicate, object, fn, opt_obj) {
    if (opt_obj) {
        fn = fn.bind(opt_obj);
    }

    goog.structs.every(
        this.quadStore._queryReturningSet(subject, predicate, object, this.context),
        function(quad) {
            var triple = dm.data.Triple.fromQuad(quad);
            if (fn(triple, this) === false) {
                return false;
            }
            else {
                return true;
            }
        },
        this
    );
};

dm.data.Graph.prototype.forEachTriple = function(fn, opt_obj) {
    if (opt_obj) {
        fn = fn.bind(opt_obj);
    }

    this.quadStore.forEachQuad(function(quad) {
        var triple = dm.data.Triple.fromQuad(quad);

        if (fn(triple, this) === false) {
            return false;
        }
        else {
            return true;
        }
    }.bind(this));
};

/**
 * Returns a set of the subjects of all triples matching the specified pattern.
 * @param  {string|null|undefined}  subject   The subject to search for, or null as a wildcard.
 * @param  {string|null|undefined}  predicate The predicate to search for, or null as a wildcard.
 * @param  {string|null|undefined}  object    The object to search for, or null as a wildcard.
 * @return {goog.structs.Set}                 A set of subjects matching the query.
 */
dm.data.Graph.prototype.subjectsSetMatchingQuery = function(subject, predicate, object) {
    var set = new goog.structs.Set();

    this.quadStore.forEachQuadMatchingQuery(subject, predicate, object, this.context,
        function(quad) {
            set.add(quad.subject);
        }, this);

    return set;
};

/**
 * Returns a set of the predicates of all triples matching the specified pattern.
 * @param  {string|null|undefined}  subject   The subject to search for, or null as a wildcard.
 * @param  {string|null|undefined}  predicate The predicate to search for, or null as a wildcard.
 * @param  {string|null|undefined}  object    The object to search for, or null as a wildcard.
 * @return {goog.structs.Set}                 A set of predicates matching the query.
 */
dm.data.Graph.prototype.predicatesSetMatchingQuery = function(subject, predicate, object) {
    var set = new goog.structs.Set();

    this.quadStore.forEachQuadMatchingQuery(subject, predicate, object, this.context,
        function(quad) {
            set.add(quad.predicate);
        }, this);

    return set;
};

/**
 * Returns a set of the objects of all triples matching the specified pattern.
 * @param  {string|null|undefined}  subject   The subject to search for, or null as a wildcard.
 * @param  {string|null|undefined}  predicate The predicate to search for, or null as a wildcard.
 * @param  {string|null|undefined}  object    The object to search for, or null as a wildcard.
 * @return {goog.structs.Set}                 A set of objects matching the query.
 */
dm.data.Graph.prototype.objectsSetMatchingQuery = function(subject, predicate, object) {
    var set = new goog.structs.Set();

    this.quadStore.forEachQuadMatchingQuery(subject, predicate, object, this.context,
        function(quad) {
            set.add(quad.object);
        }, this);

    return set;
};

/**
 * Returns a list of the subjects of all triples matching the specified pattern.
 * @param  {string|null|undefined}  subject   The subject to search for, or null as a wildcard.
 * @param  {string|null|undefined}  predicate The predicate to search for, or null as a wildcard.
 * @param  {string|null|undefined}  object    The object to search for, or null as a wildcard.
 * @return {Array}                            A list of subjects matching the query.
 */
dm.data.Graph.prototype.subjectsMatchingQuery = function(subject, predicate, object) {
    return this.subjectsSetMatchingQuery(subject, predicate, object).getValues();
};

/**
 * Returns a list of the predicates of all triples matching the specified pattern.
 * @param  {string|null|undefined}  subject   The subject to search for, or null as a wildcard.
 * @param  {string|null|undefined}  predicate The predicate to search for, or null as a wildcard.
 * @param  {string|null|undefined}  object    The object to search for, or null as a wildcard.
 * @return {Array}                            A list of predicates matching the query.
 */
dm.data.Graph.prototype.predicatesMatchingQuery = function(subject, predicate, object) {
    return this.predicatesSetMatchingQuery(subject, predicate, object).getValues();
};

/**
 * Returns a list of the objects of all triples matching the specified pattern.
 * @param  {string|null|undefined}  subject   The subject to search for, or null as a wildcard.
 * @param  {string|null|undefined}  predicate The predicate to search for, or null as a wildcard.
 * @param  {string|null|undefined}  object    The object to search for, or null as a wildcard.
 * @return {Array}                            A list of objects matching the query.
 */
dm.data.Graph.prototype.objectsMatchingQuery = function(subject, predicate, object) {
    return this.objectsSetMatchingQuery(subject, predicate, object).getValues();
};

dm.data.Graph.prototype.addTriple = function(triple) {
    var quad = triple.toQuad(this.context);

    this.quadStore.addQuad(quad);

    return this;
};

dm.data.Graph.prototype.addTriples = function(triples) {
    goog.structs.forEach(triples, function(triple) {
        this.addTriple(triple);
    }, this);
};

dm.data.Graph.prototype.removeTriplesMatchingQuery = function(subject, predicate, object) {
    return this.quadStore.removeQuadsMatchingQuery(subject, predicate, object, this.context);
};

dm.data.Graph.prototype.removeTriple = function(triple) {
    return this.removeTriplesMatchingQuery(triple.subject, triple.predicate, triple.object);
};

dm.data.Graph.prototype.getTriples = function() {
    return this.query(null, null, null);
};

dm.data.Graph.prototype.getCount = function() {
    return this.numTriplesMatchingQuery(null, null, null);
};

dm.data.Graph.prototype.n3 = function() {
    var serializer = new dm.data.TurtleSerializer(goog.global.databroker || new dm.data.Databroker());
    serializer.compact = false;
    var str = serializer.getTriplesString(this.getTriples());

    if (str) {
        return str;
    }
    else {
        return '# No data\n  .';
    }
};

dm.data.Graph.prototype.toString = dm.data.Graph.prototype.n3;
