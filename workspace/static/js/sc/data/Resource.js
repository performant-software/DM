goog.provide('sc.data.Resource');

goog.require('goog.structs.Set');
goog.require('goog.array');
goog.require('jquery.jQuery');
goog.require('sc.data.Quad');
goog.require('sc.util.Namespaces');

/**
 * A convenient wrapper around the databroker methods for querying information
 * about particular resources.
 * These objects are particularly lightweight because the only data they hold is
 * their uris and references to the databroker. Databroker methods are simply
 * called with the uri of the particular resource. This also means that they are
 * live updating.
 *
 * @constructor
 * @param {sc.data.Databroker} databroker The databroker which owns this
 * resource.
 * @param {string} uri The uri of this resource.
 */
sc.data.Resource = function(databroker, uri) {
    this.databroker = databroker;
    this.uri = uri;
    this.bracketedUri = sc.util.Namespaces.wrapWithAngleBrackets(uri);
};

/**
 * @return {sc.data.Databroker} A reference to the databroker which owns this
 * resource.
 */
sc.data.Resource.prototype.getDatabroker = function() {
    return this.databroker;
};

/**
 * Returns the objects of all quads with this resource as a subject and the
 * given resource, or an object dictionary of values by predicate.
 * Angle brackets around urls, quotes around literals, and xml escaped
 * characters will be returned unmodified.
 *
 * @param {?string} predicate The predicate for which values should be returned,
 * or null if a dictionary is desired.
 * @param {(Array.<string>|Object)} An array of values for the given predicate,
 * or the object dictionary.
 */
sc.data.Resource.prototype.getUnescapedPropertiesByPredicate = function(predicate) {
    if (predicate) {
        return this.databroker.getPropertiesForResource(this.bracketedUri, predicate);
    }
    else {
        return this.databroker.dumpResource(this.uri);
    }
};

sc.data.Resource.prototype.getUnescapedPropertiesByPredicates = function(predicates) {
    if (predicates) {
        var properties = new goog.structs.Set();

        for (var i = 0, len = predicates.length; i < len; i++) {
            var predicate = predicates[i];

            properties.addAll(this.getUnescapedPropertiesByPredicate(predicate));
        }

        return properties.getValues();
    }
    else {
        return this.databroker.dumpResource(this.uri);
    }
};

sc.data.Resource.prototype.getUnescapedProperties = function(predicate) {
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

sc.data.Resource.prototype.escapeProperty = function(property) {
    property = sc.util.Namespaces.stripQuotesAndDatatype(property);
    property = sc.util.Namespaces.stripAngleBrackets(property);
    property = sc.util.Namespaces.unescapeFromXml(property);
    
    return property;
};
sc.data.Resource.prototype.escapeProperties = sc.data.Resource.prototype.escapeProperty;

sc.data.Resource.prototype.getProperties = function(predicate) {
    var properties = this.getUnescapedProperties(predicate);
    properties = this.escapeProperties(properties);
    
    return properties;
}

sc.data.Resource.prototype.getOneUnescapedProperty = function(predicate) {
    var properties = this.getUnescapedProperties(predicate);

    if (properties && properties.length > 0) {
        return properties[0];
    }
    else {
        return null;
    }
};

sc.data.Resource.prototype.getOneProperty = function(predicate) {
    var property = this.getOneUnescapedProperty(predicate);
    
    if (property) {
        return this.escapeProperty(property);
    }
    else {
        return null;
    }
};

sc.data.Resource.prototype.hasPredicate = function(predicate) {
    return this.databroker.getPropertiesForResource(
                                    this.bracketedUri, predicate).length > 0;
};

sc.data.Resource.prototype.hasAnyPredicate = function(possiblePredicates) {
    for (var i = 0, len = possiblePredicates.length; i < len; i++) {
        var possiblePredicate = this.databroker.namespaces.
            autoExpand(possiblePredicates[i]);

        if (this.hasPredicate(possiblePredicate)) {
            return true;
        }
    }

    return false;
};

sc.data.Resource.prototype.addProperty = function(predicate, object) {
    predicate = this.databroker.namespaces.autoExpand(predicate);
    object = this.databroker.namespaces.autoExpand(object);
    
    var quad = new sc.data.Quad(this.bracketedUri, predicate, object, null);
    
    this.databroker.addNewQuad(quad);
    
    return this;
};

sc.data.Resource.prototype.deleteProperty = function(predicate, opt_object) {
    this.databroker.quadStore.forEachQuadMatchingQuery(
        this.bracketedUri,
        sc.util.Namespaces.wrapWithAngleBrackets(this.databroker.namespaces.autoExpand(predicate)),
        opt_object ? sc.util.Namespaces.wrapWithAngleBrackets(this.databroker.namespaces.autoExpand(opt_object)) : null,
        null,
        function(quad) {
            this.databroker.deleteQuad(quad);
        }.bind(this)
    );

    return this;
};

sc.data.Resource.prototype.addType = function(type) {
    return this.addProperty('rdf:type', type);
};

sc.data.Resource.prototype.addValuesByProperty = function(valuesByProperty) {
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

sc.data.Resource.prototype.getUri = function() {
    return this.uri;
};

sc.data.Resource.prototype.getTypes = function() {
    return this.getUnescapedPropertiesByPredicate('rdf:type');
};

sc.data.Resource.prototype.getTypesSet = function() {
    return this.databroker.getPropertiesSetForResource(this.bracketedUri,
                                                       'rdf:type');
};

sc.data.Resource.prototype.hasType = function(type) {
    var types = this.getTypesSet();
    var type = this.databroker.namespaces.autoExpand(type);

    return types.contains(type);
};

sc.data.Resource.prototype.hasAnyType = function(possibleTypes) {
    var types = this.getTypesSet();
    var typesToTest = possibleTypes;

    if (! possibleTypes) {
        return types.getCount() > 0;
    }
    
    if (!jQuery.isArray(possibleTypes)) {
        typesToTest = arguments;
    }

    for (var i = 0, len = typesToTest.length; i < len; i++) {
        var possibleType = this.databroker.namespaces.
            autoExpand(typesToTest[i]);

        if (types.contains(possibleType)) {
            return true;
        }
    }

    return false;
};

sc.data.Resource.prototype.hasAllTypes = function(possibleTypes) {
    var types = this.getTypesSet();
    var typesToTest = possibleTypes;

    var possibleTypesSet = new goog.structs.Set();
    
    if (!jQuery.isArray(possibleTypes)) {
        typesToTest = arguments;
    }

    for (var i = 0, len = typesToTest.length; i < len; i++) {
        var possibleType = this.databroker.namespaces.
            autoExpand(typesToTest[i]);

        possibleTypesSet.add(possibleType);
    }

    var intersection = possibleTypesSet.intersection(types);

    return intersection.equals(possibleTypesSet);
};

sc.data.Resource.prototype.getTitles = function() {
    return sc.util.Namespaces.stripWrappingQuotes(this.getProperties('dc:title'));
};

sc.data.Resource.prototype.getOneTitle = function() {
    return sc.util.Namespaces.stripWrappingQuotes(this.getOneProperty('dc:title'));
};

sc.data.Resource.prototype.getAnnoUris = function(opt_annoType) {
    return this.databroker.getResourceAnnoIds(this.bracketedUri, opt_annoType);
};

/**
 * Returns whether this resource is makred as owl:sameAs the other resource or
 * resource uri.
 *
 * @param {sc.data.Resource|string} other The other resource object or uri to
 * test.
 * @return {boolean} Whether the resources are equivalent according to the OWL
 * spec.
 */
sc.data.Resource.prototype.isSameAs = function(other) {
    if (other.uri) {
        var uri = other.uri;
    }
    else {
        var uri = other;
    }
    
    return this.databroker.areEquivalentUris(this.bracketedUri, uri);
};

sc.data.Resource.prototype.equals = sc.data.Resource.prototype.isSameAs;

/**
 * Returns the uris of all resources which are marked as owl:sameAs this
 * this resource. Note: all querying methods already query these equivalent
 * resources, so manually repeating queries on these other resources is
 * unnecessary.
 *
 * @return {Array.<string>} The equivalent uris.
 */
sc.data.Resource.prototype.getEquivalentUris = function() {
    return this.databroker.getEquivalentUris(this.bracketedUri);
};

sc.data.Resource.prototype.dump = function() {
    return this.databroker.dumpResource(this.bracketedUri);
};

sc.data.Resource.compareByTitle = function(a, b) {
    var titleA = a.getOneProperty('dc:title');
    var titleB = b.getOneProperty('dc:title');

    return goog.array.defaultCompare(titleA, titleB);
};
