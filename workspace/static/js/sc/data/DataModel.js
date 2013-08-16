goog.provide('sc.data.DataModel');

goog.require('goog.structs.Set');
goog.require('goog.structs.Map');

/**
 * @author  tandres@drew.edu (Tim Andres)
 * 
 * @fileOverview
 * Utility functions for querying rdf using the Shared Canvas data model.
 */

sc.data.DataModel = function (databroker) {
    this.databroker = databroker;

    // Try to use local storage to store text contents, but if it's not available, use Javascript Memory
    // var storageMechanism = goog.storage.mechanism.mechanismfactory.create('sc.data.DataModel-' + goog.string.getRandomString() + '-');
    // if (storageMechanism) {
    //     this.textContentByUri = new goog.storage.Storage(storageMechanism);
    // }
    // else {
        this.textContentByUri = new goog.structs.Map();
    // }
    this.modifiedTextUris = new goog.structs.Set();
};

/**
 * @enum
 * Annotation predicates and types
 */
sc.data.DataModel.VOCABULARY = {
    annotationType: '<http://www.w3.org/ns/oa#Annotation>',
    hasTarget: '<http://www.w3.org/ns/oa#hasTarget>',
    hasBody: '<http://www.w3.org/ns/oa#hasBody>',
    imageAnno: '<http://dms.stanford.edu/ns/ImageAnnotation>',
    constrains: '<http://www.w3.org/ns/oa#constrains>',
    constrainedBy: '<http://www.w3.org/ns/oa#constrainedBy>',
    constraint: '<http://www.w3.org/ns/oa#ConstrainedBody>',
    isPartOf: '<http://purl.org/dc/terms/isPartOf>',
    forCanvasPredicates: ['<http://dms.stanford.edu/ns/forCanvas>', '<http://www.shared-canvas.org/ns/forCanvas>'],
    manifestTypes: ['<http://www.shared-canvas.org/ns/Manifest>', '<http://dms.stanford.edu/ns/Manifest>'],
    canvasTypes: ['<http://dms.stanford.edu/ns/Canvas>', '<http://www.shared-canvas.org/ns/Canvas>'],
    sequenceTypes: ['<http://dms.stanford.edu/ns/Sequence>', '<http://www.shared-canvas.org/ns/Sequence>'],
    imageTypes: ['<http://dms.stanford.edu/ns/Image>', '<http://dms.stanford.edu/ns/ImageBody>', '<http://purl.org/dc/dcmitype/Image>'],
    imageChoiceTypes: ['<http://dms.stanford.edu/ns/ImageChoice>'],
    textTypes: ['<http://purl.org/dc/dcmitype/Text>'],
    option: '<http://dms.stanford.edu/ns/option>',
    metadataPredicates: [
        '<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>',
        '<http://www.openarchives.org/ore/terms/isDescribedBy>',
        '<http://purl.org/dc/elements/1.1/title>'
    ]
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
    resourceUri = sc.data.Term.wrapUri(resourceUri);
    
    var annoIds = this.databroker.getUrisSetWithProperty(sc.data.DataModel.VOCABULARY.hasTarget, resourceUri);

    if (! opt_annoType) {
        return sc.data.Term.unwrapUri(annoIds.getValues());
    }
    else {
        var typeCheckedAnnoIds = [];

        goog.structs.forEach(annoIds, function(annoId) {
            var anno = this.databroker.getResource(annoId);

            if (anno.hasType(opt_annoType)) {
                typeCheckedAnnoIds.push(anno.uri);
            }
        }, this);

        return typeCheckedAnnoIds;
    }
};

/**
 * Returns a list of the uris of resources that list the given resource uri as a body
 * @param {string} resourceUri
 * @param {?string} opt_annoType the specific type of anno for which to return uris.
 * @return {Array.<string>}
 */
sc.data.DataModel.prototype.findAnnosReferencingResourceAsBody = function(resourceUri, opt_annoType) {
    resourceUri = sc.data.Term.wrapUri(resourceUri);
    
    var annoIds = this.databroker.getUrisSetWithProperty(sc.data.DataModel.VOCABULARY.hasBody, resourceUri);

    if (! opt_annoType) {
        return annoIds.getValues();
    }
    else {
        var typeCheckedAnnoIds = [];

        goog.structs.forEach(annoIds, function(annoId) {
            var anno = this.databroker.getResource(annoId);

            if (anno.hasType(opt_annoType)) {
                typeCheckedAnnoIds.push(anno.uri);
            }
        }, this);

        return typeCheckedAnnoIds;
    }
};

/**
 * Returns a list of the uris of the images for a given canvas (which are given by image annotations on that canvas)
 * @param {string} canvasUri
 * @return {Array.<string>}
 */
sc.data.DataModel.prototype.findCanvasImageUris = function(canvasUri) {
    var annoIds = this.findAnnosReferencingResourceAsTarget(canvasUri, sc.data.DataModel.VOCABULARY.annotationType);

    var imageUris = new goog.structs.Set();

    for (var i = 0, len = annoIds.length; i < len; i++) {
        var annoId = annoIds[i];
        annoId = sc.data.Term.wrapUri(annoId);

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
        }
    }

    return sc.data.Term.unwrapUri(imageUris.getValues());
};

sc.data.DataModel.prototype.getResourcePartUris = function(uri) {
    uri = sc.data.Term.wrapUri(uri);
    
    return sc.data.Term.unwrapUri(
        this.databroker.getUrisWithProperty(sc.data.DataModel.VOCABULARY.isPartOf, uri)
    );
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

    var bodyUris = [];
    goog.structs.forEach(annoUrisSet, function(annoUri) {
        var anno = this.databroker.getResource(annoUri);

        goog.structs.forEach(anno.getProperties('oa:hasBody'), function(bodyUri) {
            var body = this.databroker.getResource(bodyUri);

            if (body.hasType(sc.data.DataModel.VOCABULARY.constraint)) {
                bodyUris.push(body.uri);
            }
        }, this);
    }, this);

    return bodyUris;
};

/**
 * Returns every uri which an aggregation aggregates (in effect, the contents of an aggregation)
 * @param {string} aggregationUri
 * @return {Array.<string>}
 */
sc.data.DataModel.prototype.findAggregationContentsUris = function(aggregationUri) {
    return this.databroker.getResource(aggregationUri).getProperties('ore:aggregates');
};

sc.data.DataModel.prototype.findAggregationContentsUrisForRepoBrowser = function(aggregationUri) {
    var uris = [];

    var contentUris = this.findAggregationContentsUris(aggregationUri);
    goog.structs.forEach(contentUris, function(contentUri) {
        var contentResource = this.databroker.getResource(contentUri);

        if (! contentResource.hasType('dms:AnnotationList')) {
            uris.push(contentResource.uri);
        }
    }, this);

    return uris;
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

    return sc.data.Term.unwrapUri(uris.getValues());
};

sc.data.DataModel.prototype.findManuscriptSequenceUris = function(manifestUri) {
    var manifest = this.databroker.getResource(manifestUri);
    var sequenceUris = new goog.structs.Set();

    goog.structs.forEach(manifest.getProperties('ore:aggregates'), function(aggregateUri) {
        var aggregateResource = this.databroker.getResource(aggregateUri);

        if (aggregateResource.hasAnyType(sc.data.DataModel.VOCABULARY.sequenceTypes)) {
            sequenceUris.add(aggregateResource.uri);
        }
    }, this);

    var sequencesList = manifest.getOneProperty('sc:hasSequences');
    if (sequencesList) {
        sequenceUris.addAll(this.databroker.getListUrisInOrder(sequencesList));
    }

    return sequenceUris.getValues();
};

sc.data.DataModel.prototype.listSequenceContents = function(sequence) {
    sequence = this.databroker.getResource(sequence);

    var uris = [];

    if (sequence.hasType('rdf:List')) {
        uris = this.databroker.getListUrisInOrder(sequence);
    }
    else {
        var canvasListUri = sequence.getOneProperty('sc:hasCanvases');
        uris = this.databroker.getListUrisInOrder(canvasListUri);
    }

    return uris;
};

sc.data.DataModel.prototype.findManuscriptImageAnnoUris = function(manifestUri) {
    var manifest = this.databroker.getResource(manifestUri);
    var imageAnnoUris = new goog.structs.Set();

    goog.structs.forEach(manifest.getProperties('ore:aggregates'), function(aggregateUri) {
        var aggregateResource = this.databroker.getResource(aggregateUri);

        if (aggregateResource.hasType('dms:ImageAnnotationList')) {
            imageAnnoUris.add(aggregateResource.uri);
        }
    }, this);

    return imageAnnoUris.getValues();
};

sc.data.DataModel.prototype.findManifestsContainingCanvas = function(canvasUri) {
    canvasUri = sc.data.Term.wrapUri(canvasUri);

    var manifestUris = new goog.structs.Set();

    this.databroker.quadStore.forEachQuadMatchingQuery(
        null, this.databroker.namespaces.expand('ore', 'aggregates'), canvasUri, null,
        function(quad) {
            var sequence = this.databroker.getResource(quad.subject);

            if (sequence.hasAnyType(sc.data.DataModel.VOCABULARY.sequenceTypes)) {
                this.databroker.quadStore.forEachQuadMatchingQuery(
                    null, this.databroker.namespaces.expand('ore', 'aggregates'), quad.subject, null,
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
        var anno = this.databroker.createResource(null, 'oa:Annotation');
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

sc.data.DataModel.prototype.unlinkTargetFromAnno = function(anno, target, opt_deleteIfEmpty) {
    anno = this.databroker.getResource(anno);
    target = this.databroker.getResource(target);

    anno.deleteProperty('oa:hasTarget', target);

    if (opt_deleteIfEmpty) {
        if (anno.getProperties('oa:hasTarget').length == 0 && anno.getProperties('oa:hasBody').length <= 1) {
            anno.deleteAllProperties();
        }
    }
};

sc.data.DataModel.prototype.unlinkBodyFromAnno = function(anno, body, opt_deleteIfEmpty) {
    anno = this.databroker.getResource(anno);
    body = this.databroker.getResource(body);

    anno.deleteProperty('oa:hasBody', target);

    if (opt_deleteIfEmpty) {
        if (anno.getProperties('oa:hasBody').length == 0 && anno.getProperties('oa:hasTarget').length <= 1) {
            anno.deleteAllProperties();
        }
    }
};

sc.data.DataModel.prototype.findQuadsToSyncForAnno = function(uri, opt_quadStore) {
    var anno = this.databroker.getResource(uri);
    var quadStore = opt_quadStore || this.databroker.quadStore;

    var quadsToPost = quadStore.queryReturningSet(anno.bracketedUri, null, null, null);

    var targetUris = anno.getProperties('oa:hasTarget');
    var bodyUris = anno.getProperties('oa:hasBody');

    for (var i=0, len=targetUris.length; i<len; i++) {
        var target = this.databroker.getResource(targetUris[i]);

        quadsToPost.addAll(quadStore.queryReturningSet(target.bracketedUri, null, null, null));

        if (target.hasType('oa:SpecificResource')) {
            goog.structs.forEach(target.getProperties('oa:hasSelector'), function(selectorUri) {
                quadsToPost.addAll(quadStore.queryReturningSet(
                    sc.data.Term.wrapUri(selectorUri), null, null, null));
            }, this);
        }
    }

    for (var i=0, len=bodyUris.length; i<len; i++) {
        var body = this.databroker.getResource(bodyUris[i]);

        quadsToPost.addAll(quadStore.queryReturningSet(body.bracketedUri, null, null, null));
    }

    return quadsToPost.getValues();
};

sc.data.DataModel.prototype.findQuadsToSyncForProject = function(project, opt_quadStore) {
    project = this.databroker.getResource(project);
    var quadStore = opt_quadStore || this.databroker.quadStore;

    var quads = quadStore.query(project.bracketedUri, null, null, null);
    quads = quads.concat(quadStore.query(null, null, project.bracketedUri, null));

    goog.structs.forEach(project.getProperties('ore:aggregates'), function(contentUri) {
        var contentResource = this.databroker.getResource(contentUri);

        goog.structs.forEach(sc.data.DataModel.VOCABULARY.metadataPredicates, function(predicate) {
            quads = quads.concat(quadStore.query(contentResource.bracketedUri, predicate, null, null))
        }, this);
    }, this);

    return quads;
};

sc.data.DataModel.prototype.findQuadsToSyncForUser = function(user, opt_quadStore){
    user = this.databroker.getResource(user);
    var quadStore = opt_quadStore || this.databroker.quadStore;

    var quads = quadStore.query(user.bracketedUri, null, null, null);

    return quads
};

sc.data.DataModel.prototype.findQuadsToSyncForText = function(text, opt_quadStore) {
    text = this.databroker.getResource(text);
    var quadStore = opt_quadStore || this.databroker.quadStore;

    var quads = quadStore.query(text.bracketedUri, null, null, null)
    goog.structs.forEach(this.findSpecificResourcesInResource(text), function(specificResourceUri) {
        specificResourceUri = sc.data.Term.wrapUri(specificResourceUri);

        quads = quads.concat(quadStore.query(specificResourceUri, null, null, null));

        var selectorUri = quadStore.objectsMatchingQuery(specificResourceUri, this.databroker.namespaces.expand('oa', 'hasSelector'), null, null)[0];
        if (selectorUri) {
            selectorUri = sc.data.Term.wrapUri(selectorUri)
            quads = quads.concat(quadStore.query(selectorUri, null, null, null));
        }
    }, this);

    return quads;
};

sc.data.DataModel.prototype.findResourcesForCanvas = function(canvasUri) {
    var resources = new goog.structs.Set();
    canvasUri = sc.data.Term.wrapUri(canvasUri);

    goog.structs.forEach(sc.data.DataModel.VOCABULARY.forCanvasPredicates, function(forCanvasPredicate) {
        resources.addAll(sc.data.Term.unwrapUri(
            this.databroker.getUrisWithProperty(forCanvasPredicate, canvasUri)
        ));
    }, this);

    return resources.getValues();
};

sc.data.DataModel.prototype.findSpecificResourcesInResource = function(resource, opt_quadStore) {
    resource = this.databroker.getResource(resource);
    var quadStore = opt_quadStore || this.databroker.quadStore;

    var uris = quadStore.subjectsMatchingQuery(null, this.databroker.namespaces.expand('oa', 'hasSource'), resource.bracketedUri, null);
    return uris;
};

sc.data.DataModel.prototype.createText = function(opt_title, opt_content) {
    var text = this.databroker.createResource(null, 'dctypes:Text');
    text.addProperty('rdf:type', 'cnt:ContentAsText');
    text.addProperty('dc:format', '"text/html"');

    if (opt_title) {
        this.setTitle(text, opt_title);
    }

    if (opt_content) {
        this.setTextContent(text, opt_content);
    }
    else {
        text.addProperty('cnt:chars', '""');
    }

    return text;
};

sc.data.DataModel.prototype.textContents = function(text, handler, opt_forceReload) {
    window.setTimeout(function() {
        text = this.databroker.getResource(text);

        var content = text.getOneProperty('cnt:chars')
        if (content) {
            handler(content);
        }
        else {
            text.defer().done(function() {
                var content = text.getOneProperty('cnt:chars')
                if (content) {
                    handler(content);
                }
                else {
                    var error = new Error();
                    error.message = "No text content for " + text;
                    handler(null, error);
                }
            }.bind(this));
        }
    }.bind(this), 1);
};

sc.data.DataModel.prototype.setTextContent = function(text, content) {
    text = this.databroker.getResource(text);

    text.setProperty('cnt:chars', new sc.data.Literal(content));
};

sc.data.DataModel.prototype.getTitle = function(resource) {
    resource = this.databroker.getResource(resource);

    return resource.getOneProperty('dc:title') || resource.getOneProperty('rdfs:label') || '';
};

sc.data.DataModel.prototype.setTitle = function(resource, title) {
    resource = this.databroker.getResource(resource);

    var wrappedTitle = new sc.data.Literal(title);

    resource.setProperty('dc:title', wrappedTitle);
    resource.setProperty('rdfs:label', wrappedTitle);
};

sc.data.DataModel.prototype.removeResourceFromProject = function(project, resource) {
    project = this.databroker.getResource(project);
    resource = this.databroker.getResource(resource);

    project.deleteProperty('ore:aggregates', resource);
};