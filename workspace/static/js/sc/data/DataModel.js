goog.provide('sc.data.DataModel');

goog.require('goog.structs.Set');

/**
 * @author  tandres@drew.edu (Tim Andres)
 * 
 * @fileOverview
 * Utility functions for querying rdf using the Shared Canvas data model.
 */

sc.data.DataModel = function (databroker) {
    this.databroker = databroker;
};

/**
 * @enum
 * Annotation predicates and types
 */
sc.data.DataModel.VOCABULARY = {
    hasTarget: '<http://www.openannotation.org/ns/hasTarget>',
    hasBody: '<http://www.openannotation.org/ns/hasBody>',
    imageAnno: '<http://dms.stanford.edu/ns/ImageAnnotation>',
    constrains: '<http://www.openannotation.org/ns/constrains>',
    constrainedBy: '<http://www.openannotation.org/ns/constrainedBy>',
    constraint: '<http://www.openannotation.org/ns/ConstrainedBody>',
    isPartOf: '<http://purl.org/dc/terms/isPartOf>',
    forCanvasPredicates: ['<http://dms.stanford.edu/ns/forCanvas>', '<http://www.shared-canvas.org/ns/forCanvas>'],
    manifestTypes: ['<http://www.shared-canvas.org/ns/Manifest>', '<http://dms.stanford.edu/ns/Manifest>'],
    canvasTypes: ['<http://dms.stanford.edu/ns/Canvas>', '<http://www.shared-canvas.org/ns/Canvas>'],
    sequenceTypes: ['<http://dms.stanford.edu/ns/Sequence>', '<http://www.shared-canvas.org/ns/Sequence>'],
    imageTypes: ['<http://dms.stanford.edu/ns/Image>', '<http://dms.stanford.edu/ns/ImageBody>', '<http://purl.org/dc/dcmitype/Image>'],
    imageChoiceTypes: ['<http://dms.stanford.edu/ns/ImageChoice>'],
    option: '<http://dms.stanford.edu/ns/option>'
};

/**
 * Returns a list of the uris of resources that list the given resource uri as a target or a body
 * @param {string} resourceUri
 * @param {?string} opt_annoType the specific type of anno for which to return uris.
 * @return {Array.<string>}
 */
sc.data.DataModel.prototype.findAnnosReferencingResource = function(resourceUri, opt_annoType) {
    var set = new goog.structs.Set();
    set.addAll(this.findAnnosReferencingResourceAsBody(resourceUri, opt_annoType));
    set.addAll(this.findAnnosReferencingResourceAsTarget(resourceUri, opt_annoType));

    return set.getValues();
};

/**
 * Returns a list of the uris of resources that list the given resource uri as a target
 * @param {string} resourceUri
 * @param {?string} opt_annoType the specific type of anno for which to return uris.
 * @return {Array.<string>}
 */
sc.data.DataModel.prototype.findAnnosReferencingResourceAsTarget = function(resourceUri, opt_annoType) {
    resourceUri = sc.util.Namespaces.angleBracketWrap(resourceUri);
    
    var annoIds = this.databroker.getUrisSetWithProperty(sc.data.DataModel.VOCABULARY.hasTarget, resourceUri);

    if (! opt_annoType) {
        return sc.util.Namespaces.angleBracketStrip(annoIds.getValues());
    }
    else {
        var type = this.databroker.namespaces.autoExpand(opt_annoType);

        var typedAnnoIds = this.databroker.getUrisSetWithProperty('rdf:type', type);
        
        var intersection = typedAnnoIds.intersection(annoIds);
        return sc.util.Namespaces.angleBracketStrip(intersection.getValues());
        // Because of google's set implementation, this particular way
        // of finding the intersection is quite efficient
    }
};

/**
 * Returns a list of the uris of resources that list the given resource uri as a body
 * @param {string} resourceUri
 * @param {?string} opt_annoType the specific type of anno for which to return uris.
 * @return {Array.<string>}
 */
sc.data.DataModel.prototype.findAnnosReferencingResourceAsBody = function(resourceUri, opt_annoType) {
    resourceUri = sc.util.Namespaces.angleBracketWrap(resourceUri);
    
    var annoIds = this.databroker.getUrisSetWithProperty(sc.data.DataModel.VOCABULARY.hasBody, resourceUri);

    if (! opt_annoType) {
        return annoIds.getValues();
    }
    else {
        var type = this.databroker.namespaces.autoExpand(opt_annoType);

        var typedAnnoIds = this.databroker.getUrisSetWithProperty('rdf:type', type);

        var intersection = typedAnnoIds.intersection(annoIds);
        return sc.util.Namespaces.angleBracketStrip(intersection.getValues()); // Because of google's set implementation, this particular way
        // of finding the intersection is quite efficient
    }
};

/**
 * Returns a list of the uris of the images for a given canvas (which are given by image annotations on that canvas)
 * @param {string} canvasUri
 * @return {Array.<string>}
 */
sc.data.DataModel.prototype.findCanvasImageUris = function(canvasUri) {
    var annoIds = this.findAnnosReferencingResourceAsTarget(canvasUri, sc.data.DataModel.VOCABULARY.imageAnno);

    var imageUris = new goog.structs.Set();

    for (var i = 0, len = annoIds.length; i < len; i++) {
        var annoId = annoIds[i];
        annoId = sc.util.Namespaces.angleBracketWrap(annoId);

        var bodyUris = this.databroker.getPropertiesForResource(annoId, sc.data.DataModel.VOCABULARY.hasBody);
        for (var j = 0, lenj = bodyUris.length; j < lenj; j++) {
            var bodyUri = bodyUris[j];
            var bodyResource = this.databroker.getResource(bodyUri);

            if (bodyResource.hasAnyType(sc.data.DataModel.VOCABULARY.imageTypes)) {
                imageUris.add(bodyUri);
            }
            else if (bodyResource.hasAnyType(sc.data.DataModel.VOCABULARY.imageChoiceTypes)) {
                var optionUris = bodyResource.getProperties(sc.data.DataModel.VOCABULARY.option);
                imageUris.addAll(optionUris);
            }
            else {
                imageUris.add(bodyUri);
            }
        }

        imageUris.addAll(bodyUris);
    }

    return sc.util.Namespaces.angleBracketStrip(imageUris.getValues());
};

sc.data.DataModel.prototype.findConstraintUrisOnResource = function(uri) {
    var resourceParts = this.databroker.getResourcePartUris(uri);

    var urisToCheck = resourceParts.concat([uri]);
    var annoUrisSet = new goog.structs.Set();

    for (var i = 0, len = urisToCheck.length; i < len; i++) {
        var partUri = urisToCheck[i];

        var annoIds = this.findAnnosReferencingResourceAsTarget(partUri);
        annoUrisSet.addAll(annoIds);
    }

    var annoUris = annoUrisSet.getValues();
    var bodyUris = [];
    for (var i = 0, len = annoUris.length; i < len; i++) {
        var annoUri = annoUris[i];

        var bodies = this.databroker.getPropertiesForResource(annoUri, sc.data.DataModel.VOCABULARY.hasBody);
        bodyUris = bodyUris.concat(bodies);
    }

    var typedConstraintIds = this.databroker.getUrisSetWithProperty(sc.data.DataModel.VOCABULARY.constraint);

    var constraintIds = typedConstraintIds.intersection(bodyUris);
    return sc.util.Namespaces.angleBracketStrip(constraintIds.getValues());
};

//Note(tandres): I can't find this used anywhere, maybe should be deprecated
sc.data.DataModel.prototype.findConstraintValuesOnResource = function(uri) {
    var constraintIds = this.findConstraintUrisOnResource(uri);

    var values = new goog.structs.Set();
    for (var i = 0, len = constraintIds.length; i < len; i++) {
        var constraintId = constraintIds[i];

        var constraintNodeIds = this.databroker.getPropertiesForResource(constraintId, sc.data.DataModel.VOCABULARY.constrainedBy);
        for (var j = 0, lenj = constraintNodeIds.length; j < lenj; j++) {
            var constraintNodeId = constraintNodeIds[j];
            var constraintValues = this.databroker.getPropertiesForResource(constraintNodeId, 'cnt:chars');

            values.addAll(constraintValues);
        }
    }

    return sc.util.Namespaces.stripWrappingQuotes(values.getValues());
};

/**
 * Returns every uri which an aggregation aggregates (in effect, the contents of an aggregation)
 * @param {string} aggregationUri
 * @return {Array.<string>}
 */
sc.data.DataModel.prototype.findAggregationContentsUris = function(aggregationUri) {
    aggregationUri = sc.util.Namespaces.angleBracketWrap(aggregationUri);
    
    return sc.util.Namespaces.angleBracketStrip(this.databroker.getPropertiesForResource(aggregationUri, 'ore:aggregates'));
};

/**
 * Returns the uris of resources aggregated into a manuscript, but does not include those which are labeled as being for
 * a specific canvas
 */
sc.data.DataModel.prototype.findManuscriptAggregationUris = function(manifestUri) {
    var aggregationUris = this.findAggregationContentsUris(manifestUri);

    var uris = new goog.structs.Set();

    for (var i = 0, len = aggregationUris.length; i < len; i++) {
        var aggregationUri = aggregationUris[i];

        var aggregationResource = this.databroker.getResource(aggregationUri);
        if (! aggregationResource.hasAnyPredicate(sc.data.DataModel.VOCABULARY.forCanvasPredicates)) {
            uris.add(aggregationUri);
        }
    }

    return sc.util.Namespaces.angleBracketStrip(uris.getValues());
};

sc.data.DataModel.prototype.findManuscriptSequenceUris = function(manifestUri) {
    manifestUri = sc.util.Namespaces.angleBracketWrap(manifestUri);
    
    var aggregateUris = this.databroker.getPropertiesForResource(manifestUri, 'ore:aggregates');

    var allSequences = new goog.structs.Set();
    goog.structs.forEach(sc.data.DataModel.VOCABULARY.sequenceTypes, function(sequenceType) {
        allSequences.addAll(
            this.databroker.quadStore.subjectsSetMatchingQuery(
                null,
                this.databroker.namespaces.expand('rdf', 'type'),
                sequenceType,
                null)
        );
    }, this);

    var intersection = allSequences.intersection(aggregateUris);
    return sc.util.Namespaces.angleBracketStrip(intersection.getValues());
};

sc.data.DataModel.prototype.findManuscriptImageAnnoUris = function(manifestUri) {
     manifestUri = sc.util.Namespaces.angleBracketWrap(manifestUri);
    
    var aggregateUris = this.databroker.getPropertiesForResource(manifestUri, 'ore:aggregates');

    var allImageAnnos = this.databroker.quadStore.subjectsSetMatchingQuery(
        null,
        this.databroker.namespaces.expand('rdf', 'type'),
        this.databroker.namespaces.expand('dms', 'ImageAnnotationList'),
        null);

    var intersection = allImageAnnos.intersection(aggregateUris);
    return sc.util.Namespaces.angleBracketStrip(intersection.getValues());
};

sc.data.DataModel.prototype.findManifestsContainingCanvas = function(canvasUri) {
    canvasUri = sc.util.Namespaces.angleBracketWrap(canvasUri);

    var manifestUris = new goog.structs.Set();

    this.databroker.quadStore.forEachQuadMatchingQuery(
        null, this.databroker.namespaces.autoExpand('ore:aggregates'), canvasUri, null,
        function(quad) {
            var sequence = this.databroker.getResource(quad.subject);

            if (sequence.hasAnyType(sc.data.DataModel.VOCABULARY.sequenceTypes)) {
                this.databroker.quadStore.forEachQuadMatchingQuery(
                    null, this.databroker.namespaces.autoExpand('ore:aggregates'), quad.subject, null,
                    function(quad) {
                        var manifest = this.databroker.getResource(quad.subject);

                        if (manifest.hasAnyType(sc.data.DataModel.VOCABULARY.manifestTypes)) {
                            manifestUris.add(manifest.uri);
                        }
                    }.bind(this));
            }
        }.bind(this));

    return manifestUris.getValues();
};

sc.data.DataModel.prototype.findSelectorSpecificResourceUri = function(selectorUri) {
    var selectorResource = this.databroker.getResource(selectorUri);

    var specificResources = selectorResource.getReferencingResources('oa:hasSelector');

    if (specificResources.length > 0) {
        if (specificResources.length > 1) {
            console.warn(selectorUri, 'has more than one specific resource', specificResources);
        }
        return specificResources[0].uri;
    }
    else {
        return null;
    }
};

sc.data.DataModel.XYWH_REGEX = /#xywh\s*=\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*$/;
sc.data.DataModel.TIMECODE_REGEX = /#t\s*=\s*npt:\s*([\d:]+)\s*,\s*([\d:]+)\s*$/;
sc.data.DataModel.getConstraintAttrsFromUri = function(constraintUri) {
    var baseEndIndex = constraintUri.indexOf('#');
    var baseUri = constraintUri.substring(0, baseEndIndex);
    var constraintString = constraintUri.substring(baseEndIndex, constraintUri.length);

    var xywhMatch = sc.data.DataModel.XYWH_REGEX.exec(constraintUri);
    if (xywhMatch) {
        return {
            type: 'box',
            width: Number(xywhMatch[3]),
            height: Number(xywhMatch[4]),
            x: Number(xywhMatch[1]),
            y: Number(xywhMatch[2]),
            baseUri: baseUri,
            originalUri: constraintUri,
            constraintString: constraintString
        };
    }

    var timecodeMatch = sc.data.DataModel.TIMECODE_REGEX.exec(constraintUri);
    if (timecodeMatch) {
        var startTimecode = timecodeMatch[1];
        var endTimecode = timecodeMatch[2];
        var startSeconds = sc.data.DataModel.timecodeToSeconds(startTimecode);
        var endSeconds = sc.data.DataModel.timecodeToSeconds(endTimecode);
        return {
            type: 'timecode',
            startTimecode: startTimecode,
            endTimecode: endTimecode,
            startSeconds: startSeconds,
            endSeconds: endSeconds,
            baseUri: baseUri,
            originalUri: constraintUri,
            constraintString: constraintString
        };
    }
};

sc.data.DataModel.TIMECODE_PARTS_REGEX = /(\d+):(\d+):(\d+):(\d+)/;
sc.data.DataModel.timecodeToSeconds = function(timecode) {
    var numColons = goog.string.countOf(timecode, ':');
    var numColonsToAdd = 3 - numColons;
    for (var i = 0; i < numColonsToAdd; i++) {
        timecode = '00:' + timecode;
    }

    var match = sc.data.DataModel.TIMECODE_PARTS_REGEX.exec(timecode);

    var days = Number(match[1]);
    var hours = Number(match[2]);
    var minutes = Number(match[3]);
    var seconds = Number(match[4]);

    var time = seconds + (minutes * 60) + (hours * 3600) + (days * 86400);

    return time;
};

sc.data.DataModel.prototype.createAnno = function(bodyUri, targetUri, opt_annoType) {
    var body = this.databroker.getResource(bodyUri);
    var target = this.databroker.getResource(targetUri);

    var currentBodyAnnos = body.getReferencingResources('oa:hasBody');

    if (currentBodyAnnos.length > 0) {
        var anno = currentBodyAnnos[0];
    }
    else {
        var anno = this.databroker.createResource(this.databroker.createUuid(), 'oa:Annotation');
    }

    if (opt_annoType) {
        anno.addProperty('rdf:type', opt_annoType);
    }

    if (bodyUri) {
        anno.addProperty(
            sc.data.DataModel.VOCABULARY.hasBody,
            body
        );
    }

    if (targetUri) {
        anno.addProperty(
            sc.data.DataModel.VOCABULARY.hasTarget,
            target
        );
    }

    return anno;
};

sc.data.DataModel.prototype.findQuadsToSyncForAnno = function(uri) {
    var anno = this.databroker.getResource(uri);

    var quadsToPost = this.databroker.quadStore.queryReturningSet(anno.bracketedUri, null, null, null);

    var targetUris = anno.getProperties('oa:hasTarget');
    var bodyUris = anno.getProperties('oa:hasBody');

    for (var i=0, len=targetUris.length; i<len; i++) {
        var target = this.databroker.getResource(targetUris[i]);

        quadsToPost.addAll(this.databroker.quadStore.queryReturningSet(target.bracketedUri, null, null, null));

        if (target.hasType('oa:SpecificResource')) {
            goog.structs.forEach(target.getProperties('oa:hasSelector'), function(selectorUri) {
                quadsToPost.addAll(this.databroker.quadStore.queryReturningSet(
                    sc.util.Namespaces.angleBracketWrap(selectorUri), null, null, null));
            }, this);
        }
    }

    for (var i=0, len=bodyUris.length; i<len; i++) {
        var body = this.databroker.getResource(bodyUris[i]);

        quadsToPost.addAll(this.databroker.quadStore.queryReturningSet(body.bracketedUri, null, null, null));
    }

    return quadsToPost.getValues();
};

sc.data.DataModel.prototype.findResourcesForCanvas = function(canvasUri) {
    var resources = new goog.structs.Set();
    canvasUri = sc.util.Namespaces.angleBracketWrap(canvasUri);

    goog.structs.forEach(sc.data.DataModel.VOCABULARY.forCanvasPredicates, function(forCanvasPredicate) {
        resources.addAll(sc.util.Namespaces.angleBracketStrip(
            this.databroker.getUrisWithProperty(forCanvasPredicate, canvasUri)
        ));
    }, this);

    return resources.getValues();
};

sc.data.DataModel.prototype.createText = function(opt_title, opt_content) {
    var text = this.databroker.createResource(this.databroker.createUuid(), 'dctypes:Text');
    text.addProperty('rdf:type', 'cnt:ContentAsText');

    if (opt_title) {
        text.addProperty('dc:title', sc.util.Namespaces.quoteWrap(opt_title));
    }

    if (opt_content) {
        text.addProperty('cnt:chars', sc.util.Namespaces.quoteWrap(opt_content));
    }

    return text;
};