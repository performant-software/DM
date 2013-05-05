goog.provide('sc.canvas.FabricCanvasFactory');

goog.require('sc.canvas.FabricCanvas');
goog.require('goog.array');

sc.canvas.FabricCanvasFactory.createFromResource = function(resource) {
    var uri = resource.getUri();
    var databroker = resource.getDatabroker();

    var size = new goog.math.Size(
        Number(resource.getOneProperty(sc.canvas.FabricCanvas.RDF_ENUM.width)),
        Number(resource.getOneProperty(sc.canvas.FabricCanvas.RDF_ENUM.height))
    );

    var canvas = new sc.canvas.FabricCanvas(uri, databroker, size);

    return canvas;
};

sc.canvas.FabricCanvasFactory.createFromUri = function(uri, databroker) {
    return sc.canvas.FabricCanvas.createFromResource(
        databroker.getResource(uri)
    );
};

sc.canvas.FabricCanvasFactory.createFromDeferredResource = function(deferred, callback) {
    deferred.done(function() {
        var canvas = sc.canvas.FabricCanvas.createFromResource(this);

        if (goog.isFunction(callback)) {
            callback(canvas, deferred);
        }
    });
};

/**
 * Creates a Canvas given the uri of the canvas to create, and a reference to a
 * databroker which holds the appropriate canvas data
 *
 * Returns a jQuery.Deferred object, as the canvas is generated asynchronously
 * using queries to the databroker
 *
 * @param {string} uri the uri of the canvas resource.
 * @param {sc.data.Databroker} databroker a databroker which can be queried for
 * information about the canvas.
 * @param {Object|sc.util.Size} displaySize the initial screen display size of
 * the entire canvas.
 * @param {?Array.<string>} opt_urisInOrder A list of canvas uris representing
 * the desired sequence for use with forward and back buttons.
 * @param {?number} opt_index The index of the current canvas in the urisInOrder
 * list.
 *
 * @return {jQuery.Deferred} The deferred canvas object.
 */
sc.canvas.FabricCanvasFactory.createDeferredCanvas = function(uri, databroker, opt_urisInOrder, opt_index, opt_doAfter) {
    var deferredCanvas = jQuery.Deferred();
    var deferredResource = databroker.getDeferredResource(uri);

    var canvas = null;

    var withResource = function(resource) {
        if (
                !(
                    resource.hasAnyPredicate(sc.canvas.FabricCanvas.RDF_ENUM.width) &&
                    resource.hasAnyPredicate(sc.canvas.FabricCanvas.RDF_ENUM.height)
                ) &&
                deferredResource.state() == 'resolved'
            ) {
            deferredCanvas.rejectWith(
                canvas,
                ['Manuscript ' + uri + ' has no width and height data', canvas]
            );
        }
        else {
            if (! canvas) {
                var width = Number(resource.getOneProperty(
                    sc.canvas.FabricCanvas.RDF_ENUM.width
                ));
                var height = Number(resource.getOneProperty(
                    sc.canvas.FabricCanvas.RDF_ENUM.height
                ));

                if (width == null || height == null) {
                    return;
                }

                var actualSize = new goog.math.Size(width, height);

                canvas = new sc.canvas.FabricCanvas(
                    uri,
                    databroker,
                    actualSize
                );

                if (opt_urisInOrder != null) {
                    canvas.urisInOrder = opt_urisInOrder;
                }
                if (opt_index != null) {
                    canvas.currentIndex = opt_index;
                }
            }

            canvas.pauseRendering();

            sc.canvas.FabricCanvasFactory.findAndAddImages(canvas);
            sc.canvas.FabricCanvasFactory.findAndAddSegments(canvas);
            sc.canvas.FabricCanvasFactory.findAndAddSelectors(canvas);
            sc.canvas.FabricCanvasFactory.findAndAddComments(canvas);

            canvas.resumeRendering();

            if (deferredResource.state() == 'resolved') {
                deferredCanvas.resolveWith(canvas, [canvas]);
            }
            else if (deferredResource.state() == 'rejected') {
                deferredCanvas.rejectWith(canvas, [canvas]);
            }
            else {
                deferredCanvas.notifyWith(canvas, [canvas]);
            }
        }
    }
    deferredResource.progress(withResource).done(withResource).fail(withResource);

    if (opt_doAfter) {
        deferredResource.done(opt_doAfter);
    }

    return deferredCanvas;
};

sc.canvas.FabricCanvasFactory.findAndAddImages = function(canvas) {
    var databroker = canvas.databroker;

    var imageAnnoUris = databroker.getResourceTargetAnnoIds(
        canvas.uri,
        sc.canvas.FabricCanvas.RDF_ENUM.imageAnno
    );

    var imageUris = [];

    for (var i = 0, len = imageAnnoUris.length; i < len; i++) {
        var imageAnnoUri = imageAnnoUris[i];
        var imageAnnoResource = databroker.getResource(imageAnnoUri);

        imageUris = imageUris.concat(
            imageAnnoResource.getProperties(sc.canvas.FabricCanvas.RDF_ENUM.hasBody)
        );
    }

    for (var i = 0, len = imageUris.length; i < len; i++) {
        var imageUri = imageUris[i];
        var imageResource = databroker.getResource(imageUri);

        if (imageResource.hasAnyType(sc.canvas.FabricCanvas.RDF_ENUM.imageTypes)) {
            if (! canvas.imagesBySrc.containsKey(imageUri)) {
                canvas.addImageResource(imageResource);
            }
        }
        else if (imageResource.hasAnyType(sc.canvas.FabricCanvas.RDF_ENUM.
                                          imageChoice)) {
            var optionUris = imageResource.getProperties(
                sc.canvas.FabricCanvas.RDF_ENUM.option
            );

            for (var j = 0, lenj = optionUris.length; j < lenj; j++) {
                var optionUri = optionUris[j];
                var optionResource = databroker.getResource(optionUri);

                if (! canvas.hasFeature(optionUri)) {
                    canvas.addImageResource(optionResource);

                    canvas.imageOptionUris.push(optionUri);
                }
            }
        }
        else {
            canvas.addImage(databroker.getImageSrc(imageUri), canvas.getSize());
        }
    }
};

sc.canvas.FabricCanvasFactory.findAndAddComments = function(canvas) {
    var databroker = canvas.databroker;

    var annoUris = databroker.getResourceBodyAnnoIds(
        canvas.uri,
        sc.canvas.FabricCanvas.RDF_ENUM.commentAnno
    );

    for (var i = 0, len = annoUris.length; i < len; i++) {
        var annoResource = databroker.getResource(annoUris[i]);

        var annoTitle = annoResource.getOneTitle();

        var bodyUri = annoResource.getOneProperty(sc.canvas.FabricCanvas.RDF_ENUM.
                                                  hasBody);
        var bodyResource = databroker.getResource(bodyUri);

        var content = bodyResource.getOneProperty(sc.canvas.FabricCanvas.RDF_ENUM.
                                                  cntChars);

        console.log(title, ':', content);
    }
};

sc.canvas.FabricCanvasFactory.findAndAddSelectors = function(canvas) {
    var databroker = canvas.databroker;

    var specificResourceUris = databroker.getUrisWithProperty(
        'oac:hasSource', '<' + canvas.uri + '>');
    for (var i=0; i<specificResourceUris.length; i++) {
        var specificResource = databroker.getResource(specificResourceUris[i]);

        if (!specificResource.hasType('oac:SpecificResource')) {
            goog.array.removeAt(specificResourceUris, i);
            i--;

            // In the future, this should also check that there exists an annotation which targets the specific resource
        }
    }

    for (var i=0, len=specificResourceUris.length; i<len; i++) {
        var specificResource = databroker.getResource(specificResourceUris[i]);

        var selectorUris = specificResource.getProperties('oac:hasSelector');
        for (var j=0, lenj=selectorUris.length; j<lenj; j++) {
            var selector = databroker.getResource(selectorUris[j]);

            if (!selector.hasType('oac:SvgSelector')) {
                continue;
            }

            if (selector.hasType('cnt:ContentAsText')) {
                var svgText = selector.getOneUnescapedProperty('cnt:chars');

                if (svgText) {
                    if (canvas.hasFeature(selector.getUri())) {
                        canvas.removeObjectByUri(selector.getUri());
                    }
                    
                    canvas.addFeatureFromSVGString(svgText, selector.getUri());
                }
            }
            else {
                // The selector uri should be treated as a url to an svg document
                // TODO
            }
        }
    }
};

sc.canvas.FabricCanvasFactory.findAndAddSegments = function(canvas) {
    var databroker = canvas.databroker;

    var addedTextUris = [];

    var partUris = databroker.getResourcePartUris(canvas.uri);
    for (var i = 0, len = partUris.length; i < len; i++) {
        var partUri = partUris[i];

        if (! canvas.segmentUris.contains(partUri)) {
            var constraintAttrs = sc.data.Databroker.getConstraintAttrsFromUri(
                                                                       partUri);
            var annoUris = databroker.getResourceAnnoIds(partUri);

            canvas.segmentUris.add(partUri);

            for (var j = 0, lenj = annoUris.length; j < lenj; j++) {
                var annoUri = annoUris[j];
                var annoResource = databroker.getResource(annoUri);

                if (annoResource.hasAnyType(sc.canvas.FabricCanvas.RDF_ENUM.
                                            textAnno)) {
                    addedTextUris = addedTextUris.concat(
                        sc.canvas.FabricCanvasFactory.addTextAnnotation(canvas, annoResource, constraintAttrs)
                    );
                }
                else if (annoResource.hasAnyType(
                                        sc.canvas.FabricCanvas.RDF_ENUM.imageAnno)) {
                    // canvas.addImageAnnoSegment(annoResource, constraintAttrs);
                    console.log('found image segment with anno uri', annoResource.getUri());
                }
                else if (annoResource.hasAnyType(
                                        sc.canvas.FabricCanvas.RDF_ENUM.audioAnno)) {
                    // canvas.addAudioAnno(annoResource, constraintAttrs);
                    console.log('found audio anno', annoUri)
                }
                else {
                    console.log(
                        'found segment', partUri,
                        'with anno types', annoResource.getTypes(),
                        annoResource
                    );
                }
            }
        }
    }
    canvas.showTextAnnos();
};

sc.canvas.FabricCanvasFactory.addTextAnnotation = function(canvas, annoResource, constraintAttrs) {
    var addedTextUris = [];
    var databroker = annoResource.getDatabroker();

    var bodyUris = annoResource.getProperties(sc.canvas.FabricCanvas.RDF_ENUM.hasBody);
    for (var k = 0, lenk = bodyUris.length; k < lenk; k++) {
        var bodyUri = bodyUris[k];
        var bodyResource = databroker.getResource(bodyUri);

        if (canvas.hasFeature(bodyUri)) {
            continue;
        }

        var text = null;
        if (bodyResource.hasAnyPredicate(sc.canvas.FabricCanvas.RDF_ENUM.cntChars)) {
            text = bodyResource.getOneProperty(
                sc.canvas.FabricCanvas.RDF_ENUM.cntChars);
        } else if (
            bodyResource.hasAnyPredicate(sc.canvas.FabricCanvas.RDF_ENUM.cnt08Chars)
        ){
            text = bodyResource.getOneProperty(
                sc.canvas.FabricCanvas.RDF_ENUM.cnt08Chars);
        }

        if (text) {
            var textBox = canvas.addTextBox(
                Number(constraintAttrs.x),
                Number(constraintAttrs.y),
                Number(constraintAttrs.width),
                Number(constraintAttrs.height),
                text,
                bodyUri
            );

            addedTextUris.push(bodyUri);
        }
    }

    return addedTextUris;
};
