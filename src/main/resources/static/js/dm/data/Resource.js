goog.provide('dm.data.Resource');

goog.require('goog.structs.Set');
goog.require('dm.util.DefaultDict');
goog.require('goog.array');
goog.require('dm.data.Quad');
goog.require('dm.data.TurtleSerializer');
goog.require('dm.data.Term');

/**
 * A convenient wrapper around the databroker methods for querying information
 * about particular resources.
 * These objects are particularly lightweight because the only data they hold is
 * their uris and references to the databroker. Databroker methods are simply
 * called with the uri of the particular resource. This also means that they are
 * live updating.
 *
 * @constructor
 * @param {dm.data.Databroker} databroker The databroker which owns this
 * resource.
 * @param {string} uri The uri of this resource.
 */
dm.data.Resource = function(databroker, graph, uri) {
    this.databroker = databroker;
    this.namespaces = databroker.namespaces;
    this.graph = graph;
    this.uri = uri;
    this.bracketedUri = dm.data.Term.wrapUri(uri);
};

dm.data.Resource.prototype.toString = function() {
    var triples = [];
    goog.structs.forEach(this.getEquivalentUris(this.uri), function(uri) {
        this.graph.forEachTripleMatchingQuery(new dm.data.Uri(uri), null, null, function(triple) {
            triples.push(triple);
        }.bind(this));
    }, this);

    var serializer = new dm.data.TurtleSerializer(this.databroker);
    serializer.compact = false;
    var str = serializer.getTriplesString(triples);

    if (str) {
        return str;
    }
    else {
        return this.bracketedUri + '\n  # No data\n  .';
    }
};

/**
 * @return {dm.data.Databroker} A reference to the databroker which this resource uses.
 * resource.
 */
dm.data.Resource.prototype.getDatabroker = function() {
    return this.databroker;
};

/**
 * @return {dm.data.Graph} A reference to the RDF graph against which this resource queries.
 */
dm.data.Resource.prototype.getGraph = function() {
    return this.graph;
};

dm.data.Resource.prototype.dump = function() {
    var ddict = new dm.util.DefaultDict(function() {
        return new goog.structs.Set();
    });

    goog.structs.forEach(this.getEquivalentUris(), function(equivalentUri) {
        this.graph.forEachTripleMatchingQuery(
            equivalentUri, null, null,
            function(triple) {
                ddict.get(this.namespaces.prefix(triple.predicate)).
                      add(dm.data.Term.isUri(triple.object) ? this.namespaces.prefix(triple.object) : triple.object);
            }, this
        );
    }, this);

    var dump = {};

    goog.structs.forEach(ddict, function(predicates, context) {
        dump[context] = {};
        goog.structs.forEach(predicates, function(objects, predicate) {
            dump[context][predicate] = objects.getValues();
        }, this);
    }, this);

    return dump;
};

/**
 * Returns the objects of all triples with this resource as a subject and the
 * given resource, or an object dictionary of values by predicate.
 * Angle brackets around urls, quotes around literals, and xml escaped
 * characters will be returned unmodified.
 *
 * @param {?string} predicate The predicate for which values should be returned,
 * or null if a dictionary is desired.
 * @param {(Array.<string>|Object)} An array of values for the given predicate,
 * or the object dictionary.
 */
dm.data.Resource.prototype.getUnescapedPropertiesByPredicate = function(predicate) {
    if (predicate) {
        var properties = new goog.structs.Set();

        goog.structs.forEach(this.getEquivalentUris(), function(uri) {
            properties.addAll(
                this.graph.objectsSetMatchingQuery(
                    uri,
                    this.namespaces.autoExpand(predicate),
                    null,
                    null
                )
            );
        }, this);

        return properties.getValues();
    }
    else {
        return this.dump();
    }
};

dm.data.Resource.prototype.getUnescapedPropertiesByPredicates = function(predicates) {
    if (predicates) {
        var properties = new goog.structs.Set();

        for (var i = 0, len = predicates.length; i < len; i++) {
            var predicate = predicates[i];

            properties.addAll(this.getUnescapedPropertiesByPredicate(predicate));
        }

        return properties.getValues();
    }
    else {
        return this.dump();
    }
};

dm.data.Resource.prototype.getUnescapedProperties = function(predicate) {
    if (jQuery.isArray(predicate)) {
        return this.getUnescapedPropertiesByPredicates(predicate);
    }
    else if (arguments.length > 1) {
        return this.getUnescapedPropertiesByPredicates(arguments);
    }
    else {
        return this.getUnescapedPropertiesByPredicate(predicate);
    }
};

dm.data.Resource.prototype.escapeProperty = function(property) {
    var escaper = function(property) {
        if (dm.data.Term.isWrappedUri(property)) {
            return dm.data.Term.unwrapUri(property);
        }
        else if (dm.data.Term.isLiteral(property)) {
            return dm.data.Term.unwrapLiteral(property);
        }
        else {
            return property;
        }
    };

    if (goog.isArray(property)) {
        var result = [];
        goog.structs.forEach(property, function(p) {
            result.push(escaper(p));
        });
        return result;
    }
    else {
        return escaper(property);
    }
};
dm.data.Resource.prototype.escapeProperties = dm.data.Resource.prototype.escapeProperty;

dm.data.Resource.prototype.getProperties = function(predicate) {
    var properties = this.getUnescapedProperties(predicate);
    properties = this.escapeProperties(properties);

    return properties;
};

dm.data.Resource.prototype.getOneUnescapedProperty = function(predicate) {
    var properties = this.getUnescapedProperties(predicate);

    if (properties && properties.length > 0) {
        return properties[0];
    }
    else {
        return null;
    }
};

dm.data.Resource.prototype.getOneProperty = function(predicate) {
    var property = this.getOneUnescapedProperty(predicate);

    if (property) {
        return this.escapeProperty(property);
    }
    else {
        return null;
    }
};

dm.data.Resource.prototype.hasProperty = function(predicate, object) {
    predicate = this.namespaces.autoExpand(predicate);
    object = this.namespaces.autoExpand(object);

    var numTriples = 0;

    goog.structs.forEach(this.getEquivalentUris(), function(uri) {
        numTriples += this.graph.numTriplesMatchingQuery(dm.data.Term.wrapUri(uri), predicate, object);
    }, this);

    return numTriples > 0;
};

dm.data.Resource.prototype.getResourcesByProperty = function(predicate) {
    var properties = this.getUnescapedProperties(predicate);
    var resources = [];

    goog.structs.forEach(properties, function(property) {
        resources.push(new dm.data.Resource(this.databroker, this.graph, property));
    }, this);

    return resources;
};

dm.data.Resource.prototype.getOneResourceByProperty = function(predicate) {
    var resources = this.getResourcesByProperty(predicate);

    if (resources.length > 0) {
        return resources[0];
    }
    else {
        return null;
    }
};

dm.data.Resource.prototype.hasPredicate = function(predicate) {
    return this.getUnescapedProperties(predicate).length > 0;
};

dm.data.Resource.prototype.hasAnyPredicate = function(possiblePredicates) {
    for (var i = 0, len = possiblePredicates.length; i < len; i++) {
        var possiblePredicate = this.namespaces.autoExpand(possiblePredicates[i]);

        if (this.hasPredicate(possiblePredicate)) {
            return true;
        }
    }

    return false;
};

dm.data.Resource.prototype.markModificationTime = function() {
    // var dcModified = this.namespaces.expand('dc', 'modified');

    // goog.structs.forEach(this.getEquivalentUris(), function(uri) {
    //     this.graph.forEachTripleMatchingQuery(
    //         uri,
    //         dcModified,
    //         null,
    //         function(triple) {
    //             var quad = triple.toQuad(this.graph.context);
    //             this.databroker.deleteQuad(quad);
    //         }.bind(this)
    //     );
    // }, this);

    // var quad = new dm.data.Quad(this.bracketedUri, dcModified, dm.data.DateTimeLiteral(new Date()).n3(), this.graph.context);
    // this.databroker.addNewQuad(quad);
};

dm.data.Resource.prototype.addProperty = function(predicate, object) {
    predicate = this.namespaces.autoExpand(predicate);
    object = this.namespaces.autoExpand(object);

    var quad = new dm.data.Quad(this.bracketedUri, predicate, object, this.graph.context);

    this.databroker.addNewQuad(quad);

    this.markModificationTime();

    return this;
};

/**
 * Ensures that a property has only one value by deleting any values for that predicate and adding that one property.
 */
dm.data.Resource.prototype.setProperty = function(predicate, object) {
    return this.deleteProperty(predicate).addProperty(predicate, object);
};

dm.data.Resource.prototype.deleteProperty = function(predicate, opt_object) {
    var safePredicate = dm.data.Term.wrapUri(this.namespaces.autoExpand(predicate));
    var safeObject = opt_object ? this.namespaces.autoExpand(opt_object) : null;

    goog.structs.forEach(this.getEquivalentUris(), function(uri) {
        this.graph.forEachTripleMatchingQuery(
            uri,
            safePredicate,
            safeObject,
            function(triple) {
                var quad = triple.toQuad(this.graph.context);
                this.databroker.deleteQuad(quad);
            }.bind(this)
        );
    }, this);

    this.markModificationTime();

    return this;
};

/**
 * Deletes all quads with this resource's uri as their subject. Note: This will not delete other references to this resource.
 */
dm.data.Resource.prototype.delete = function() {
    goog.structs.forEach(this.getEquivalentUris(), function(uri) {
        this.graph.forEachTripleMatchingQuery(
            uri, null, null, function(triple) {
                var quad = triple.toQuad(this.graph.context);
                this.databroker.deleteQuad(quad);
            }.bind(this)
        );
    }, this);

    this.databroker.deletedResourceUris.add(this.uri);

    return this;
};

dm.data.Resource.prototype.addType = function(type) {
    return this.addProperty('rdf:type', type);
};

dm.data.Resource.prototype.addValuesByProperty = function(valuesByProperty) {
    for (var property in valuesByProperty) {
        if (valuesByProperty.hasOwnProperty(property)) {
            var values = valuesByProperty[property];

            if (jQuery.isArray(values)) {
                for (var i=0, len=values.length; i<len; i++) {
                    var value = values[i];

                    this.addProperty(predicate, value);
                }
            }
            else {
                this.addProperty(predicate, values);
            }
        }
    }

    return this;
};

dm.data.Resource.prototype.getUri = function() {
    return this.uri;
};

dm.data.Resource.prototype.getTypes = function() {
    return this.getUnescapedPropertiesByPredicate('rdf:type');
};

dm.data.Resource.prototype.getTypesSet = function() {
    return new goog.structs.Set(this.getTypes());
};

dm.data.Resource.prototype.hasType = function(type) {
    var types = this.getTypesSet();
    var type = this.namespaces.autoExpand(type);

    if ( types.contains(type) ) {
      return true;
    }

    // project has DM host specific stuff in it.
    // use a regex to match any host
    var regex = /<http:\/\/.*\/ns\/Project>/;
    var match = regex.exec(type);
    if (match) {
       return true;
    }
    return false;
};

dm.data.Resource.prototype.hasAnyType = function(possibleTypes) {
    var types = this.getTypesSet();
    var typesToTest = possibleTypes;

    if (! possibleTypes) {
        return types.getCount() > 0;
    }

    if (!jQuery.isArray(possibleTypes)) {
        typesToTest = arguments;
    }

    var regex = /<http:\/\/.*\/ns\/Project>/;

    for (var i = 0, len = typesToTest.length; i < len; i++) {
        var possibleType = this.namespaces.autoExpand(typesToTest[i]);

        if (types.contains(possibleType)) {
            return true;
        }

        // match project from any host
        var match = regex.exec(possibleType);
        if (match) {
           return true;
        }
    }

    return false;
};

dm.data.Resource.prototype.getAnnoUris = function(opt_annoType) {
    return this.databroker.dataModel.findAnnosReferencingResource(this.bracketedUri, opt_annoType);
};

/**
 * Finds resources which reference this resource using a given predicate (i.e., relation)
 * @param  {string} predicate The relation to use in the search.
 * @return {Array.<dm.data.Resource>} A list of matching resources.
 */
dm.data.Resource.prototype.getReferencingResources = function(predicate) {
    var uris = new goog.structs.Set();
    var expandedPredicate = this.namespaces.autoExpand(predicate);

    goog.structs.forEach(this.getEquivalentUris(), function(uri) {
        this.graph.forEachTripleMatchingQuery(
            null, expandedPredicate, this.bracketedUri, function(triple) {
                uris.add(triple.subject);
            }.bind(this));
    }, this);

    var resources = [];
    goog.structs.forEach(uris, function(uri) {
        var resource = new dm.data.Resource(this.databroker, this.graph, uri);
        resources.push(resource);
    }, this);

    return resources;
};

/**
 * Returns whether this resource is makred as owl:sameAs the other resource or
 * resource uri.
 *
 * @param {dm.data.Resource|string} other The other resource object or uri to
 * test.
 * @return {boolean} Whether the resources are equivalent according to the OWL
 * spec.
 */
dm.data.Resource.prototype.isSameAs = function(other) {
    if (other == null) {
        return false;
    }
    else if (other.uri) {
        var uri = other.uri;
    }
    else {
        var uri = other;
    }

    return this.databroker.areEquivalentUris(this.bracketedUri, uri);
};

dm.data.Resource.prototype.equals = dm.data.Resource.prototype.isSameAs;

/**
 * Returns the uris of all resources which are marked as owl:sameAs this
 * this resource.
 *
 * Note: all querying methods already query these equivalent
 * resources, so manually repeating queries on these other resources is
 * unnecessary.
 *
 * Note: This uri will also be included in the list.
 *
 * @return {Array.<string>} The equivalent uris.
 */
dm.data.Resource.prototype.getEquivalentUris = function() {
    var s = this.graph.objectsSetMatchingQuery(this.bracketedUri, 'owl:sameAs', null);
    s.add(this.bracketedUri);
    return s;
};

dm.data.Resource.prototype.defer = function() {
    return this.databroker.getDeferredResource(this);
};

dm.data.Resource.compareByTitle = function(a, b) {
    var getTitle = a.databroker.dataModel.getTitle;
    var titleA = getTitle(a).toLowerCase();
    var titleB = getTitle(b).toLowerCase();

    return goog.array.defaultCompare(titleA, titleB);
};
