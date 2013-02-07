goog.provide('sc.canvas.Canvas');

goog.require('Raphael');
goog.require('goog.dom');
goog.require('goog.events.EventTarget');
goog.require('goog.math.Size');
goog.require('goog.structs.Map');
goog.require('sc.util.stats');

/**
 * A UI representation of a canvas resource, drawn in svg or vml using the
 * RaphaelJS library
 *
 * @author tandres@drew.edu (Tim Andres)
 *
 * @constructor
 * @extends {goog.events.EventTarget}
 *
 * Each canvas class implements the W3C EventTarget interface, so any W3C
 * compliant events library (including jQuery) can be used to add event
 * listeners to a canvas. Most standard dom events such as clicks and mouse
 * movements will be dispatched on the canvas object in a custom event with a
 * reference to the original browser event, as well as references to the canvas
 * and the Raphael features used to draw them.
 *
 * Note: All methods take coordinates and dimensions in canvas coordinates (not
 * screen coordinates) unless otherwise specified.
 *
 * @param {string} uri The uri of the canvas resource.
 * @param {goog.math.Size | Object} displaySize The size (in screen pixels) at
 * which the canvas should be shown.
 * @param {goog.math.Size | Object} actualSize The actual size of the canvas
 * resource.
 */
sc.canvas.Canvas = function(uri, displaySize, actualSize) {
    goog.events.EventTarget.call(this);

    this.rootDiv = document.createElement('div');
    jQuery(this.rootDiv).addClass('sc-Canvas');

    this.uri = uri;
    this.actualSize = new goog.math.Size(actualSize.width, actualSize.height);
    this.displaySize = this.actualSize.clone().scaleToFit(
        new goog.math.Size(displaySize.width, displaySize.height)
    );

    this.paper = Raphael(this.rootDiv, displaySize.width, displaySize.height);
    this.paper.setViewBox(0, 0, actualSize.width, actualSize.height);

    this.featuresByUri = new goog.structs.Map();

    this.imagesBySrc = new goog.structs.Map();
    this.images = this.paper.set();
    this.imageOptionUris = [];

    this.pathsByUri = new goog.structs.Map();

    this.textsByUri = new goog.structs.Map();
    this.textBoxesByUri = new goog.structs.Map();
    this.textBackgroundBoxes = this.paper.set();

    this.audioAnnoSetsByUri = new goog.structs.Map();

    this.segmentUris = new goog.structs.Set();

    this.urisInOrder = null;
    this.currentIndex = null;

    this.isShowingTextAnnos = true;
};
goog.inherits(sc.canvas.Canvas, goog.events.EventTarget);

/**
 * @enum
 * An enumeration of common rdf predicates and types
 */
sc.canvas.Canvas.RDF_ENUM = {
    width: ['exif:width'],
    height: ['exif:height'],
    dmsImage: ['dms:Image'],
    dmsImageBody: ['dms:ImageBody'],
    image: ['http://purl.org/dc/dcmitype/Image'],
    imageTypes: ['dms:Image', 'dms:ImageBody',
        'http://purl.org/dc/dcmitype/Image'],
    imageChoice: ['dms:ImageChoice'],
    option: ['dms:option'],
    textAnno: 'dms:TextAnnotation',
    imageAnno: 'dms:ImageAnnotation',
    audioAnno: 'dms:AudioAnnotation',
    hasBody: ['oac:hasBody'],
    hasTarget: ['oac:hasTarget'],
    cntChars: ['cnt:chars'],
    constrainedBody: ['oac:ConstrainedBody'],
    constrainedTarget: ['oac:ConstrainedTarget'],
    constrains: 'oac:constrains',
    constrainedBy: 'oac:constrainedBy',
    commentAnno: 'dms:CommentAnnotation',
    title: ['dc:title']
};

/**
 * The default styles to be applied to features on the canvas
 */
sc.canvas.Canvas.DEFAULT_FEATURE_STYLES = {
    'fill': '#0F6CD6',
    'fill-opacity': 0.6,
    'stroke': '#034B9E',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-opacity': 0.7,
    'cursor': 'pointer'
};

/**
 * The default styles to be applied to text features on the canvas
 */
sc.canvas.Canvas.DEFAULT_TEXT_STYLES = {
    'fill': '#0F6CD6',
    'fill-opacity': 1,
    'stroke': 'none',
    'text-anchor': 'start'
};

/**
 * The default styles to be applied to the boxes which are placed behind text
 * features representing transcriptions
 */
sc.canvas.Canvas.DEFAULT_TEXT_BOX_STYLES = {
    'fill': '#FFFFFF',
    'fill-opacity': 0.85,
    'stroke': 'none',
    'r': 2
};

/**
 * Svg path command string for drawing the audio (speaker) icon
 */
sc.canvas.Canvas.AUDIO_ICON_PATH = 'M4.998,12.127v7.896h4.495l6.729,5.526l0.004-18.948l-6.73,5.526H4.998z M18.806,11.219c-0.393-0.389-1.024-0.389-1.415,0.002c-0.39,0.391-0.39,1.024,0.002,1.416v-0.002c0.863,0.864,1.395,2.049,1.395,3.366c0,1.316-0.531,2.497-1.393,3.361c-0.394,0.389-0.394,1.022-0.002,1.415c0.195,0.195,0.451,0.293,0.707,0.293c0.257,0,0.513-0.098,0.708-0.293c1.222-1.22,1.98-2.915,1.979-4.776C20.788,14.136,20.027,12.439,18.806,11.219z M21.101,8.925c-0.393-0.391-1.024-0.391-1.413,0c-0.392,0.391-0.392,1.025,0,1.414c1.45,1.451,2.344,3.447,2.344,5.661c0,2.212-0.894,4.207-2.342,5.659c-0.392,0.39-0.392,1.023,0,1.414c0.195,0.195,0.451,0.293,0.708,0.293c0.256,0,0.512-0.098,0.707-0.293c1.808-1.809,2.929-4.315,2.927-7.073C24.033,13.24,22.912,10.732,21.101,8.925z M23.28,6.746c-0.393-0.391-1.025-0.389-1.414,0.002c-0.391,0.389-0.391,1.023,0.002,1.413h-0.002c2.009,2.009,3.248,4.773,3.248,7.839c0,3.063-1.239,5.828-3.246,7.838c-0.391,0.39-0.391,1.023,0.002,1.415c0.194,0.194,0.45,0.291,0.706,0.291s0.513-0.098,0.708-0.293c2.363-2.366,3.831-5.643,3.829-9.251C27.115,12.389,25.647,9.111,23.28,6.746z';
/**
 * The styles to be applied to the audio icon
 */
sc.canvas.Canvas.AUDIO_ICON_STYLES = {
    'fill': '#0F6CD6',
    'stroke': 'none',
    'fill-opacity': 0.6,
    'cursor': 'pointer'
};
/**
 * The styles to be applied to the box behind the audio icon
 */
sc.canvas.Canvas.AUDIO_BOX_STYLES = {
    'fill': '#FFFFFF',
    'stroke': '#0F6CD6',
    'fill-opacity': 0.6,
    'cursor': 'pointer'
};

/**
 * The width and height of the audio icon in pixels
 */
sc.canvas.Canvas.AUDIO_ICON_SIZE = 36;

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
 * @param {?function(sc.canvas.Canvas)} opt_handler an optional function to be
 * called when the canvas is ready (Same as adding a callback with
 * deferred.done()).
 *
 * @return {jQuery.Deferred} The deferred canvas object.
 */
sc.canvas.Canvas.createDeferredCanvas = function(uri, databroker, displaySize,
                                      opt_urisInOrder, opt_index, opt_handler) {
    var deferredCanvas = jQuery.Deferred();
    var deferredResource = databroker.getDeferredResource(uri);

    var canvas = null;
    var addedConstraintValues = new goog.structs.Set();

    var withResource = function(resource) {
        if (!(resource.hasAnyPredicate(sc.canvas.Canvas.RDF_ENUM.width) &&
            resource.hasAnyPredicate(sc.canvas.Canvas.RDF_ENUM.height)) &&
            deferredResource.state() == 'resolved') {
            deferredCanvas.rejectWith(
                canvas,
                ['Manuscript ' + uri + ' has no width and height data', canvas]
            );
        }
        else {
            if (! canvas) {
                displaySize = new goog.math.Size(
                    displaySize.width,
                    displaySize.height
                );

                var actualWidth = resource.getOneProperty(
                                              sc.canvas.Canvas.RDF_ENUM.width);
                var actualHeight = resource.getOneProperty(
                                           sc.canvas.Canvas.RDF_ENUM.height);

                if (actualWidth == null || actualHeight == null) {
                    return;
                }

                var actualSize = new goog.math.Size(actualWidth, actualHeight);

                canvas = new sc.canvas.Canvas(
                    uri,
                    actualSize.clone().scaleToFit(displaySize),
                    actualSize
                );

                if (opt_urisInOrder != null) {
                    canvas.urisInOrder = opt_urisInOrder;
                }
                if (opt_index != null) {
                    canvas.currentIndex = opt_index;
                }
            }

            canvas.findAndAddImages(databroker);
            window.setTimeout(function() {
                canvas.findAndAddSegments(databroker); // Needs to be performed
                    //asynchronously due to DOM bounding box weirdness...
            }, 1);
            canvas.findAndAddConstraints(databroker);
            canvas.findAndAddComments(databroker);

            if (deferredResource.state() == 'resolved') {
                deferredCanvas.resolveWith(canvas, [canvas]);
            }
            else {
                deferredCanvas.notifyWith(canvas, [canvas]);
            }
        }
    };

    deferredResource.done(withResource).progress(withResource);

    if (opt_handler) {
        deferredCanvas.done(opt_handler);
    }

    return deferredCanvas;
};

/**
 * @param {sc.data.Databroker} databroker
 *
 * Finds and adds all images which annotate this canvas resource, and adds them
 * to the canvas.
 */
sc.canvas.Canvas.prototype.findAndAddImages = function(databroker) {
    var imageAnnoUris = databroker.getResourceTargetAnnoIds(
        this.uri,
        sc.canvas.Canvas.RDF_ENUM.imageAnno
    );

    var imageUris = [];

    for (var i = 0, len = imageAnnoUris.length; i < len; i++) {
        var imageAnnoUri = imageAnnoUris[i];
        var imageAnnoResource = databroker.getResource(imageAnnoUri);

        imageUris = imageUris.concat(
            imageAnnoResource.getProperties(sc.canvas.Canvas.RDF_ENUM.hasBody)
        );
    }

    for (var i = 0, len = imageUris.length; i < len; i++) {
        var imageUri = imageUris[i];
        var imageResource = databroker.getResource(imageUri);

        if (imageResource.hasAnyType(sc.canvas.Canvas.RDF_ENUM.imageTypes)) {
            if (! this.imagesBySrc.containsKey(imageUri)) {
                this.addImageResource(imageResource);
            }
        }
        else if (imageResource.hasAnyType(sc.canvas.Canvas.RDF_ENUM.
                                          imageChoice)) {
            var optionUris = imageResource.getProperties(
                sc.canvas.Canvas.RDF_ENUM.option
            );

            for (var j = 0, lenj = optionUris.length; j < lenj; j++) {
                var optionUri = optionUris[j];
                var optionResource = databroker.getResource(optionUri);

                if (! this.imagesBySrc.containsKey(optionUri)) {
                    this.addImageResource(optionResource);

                    this.imageOptionUris.push(optionUri);
                }
            }
        }
        else {
            this.addImage(databroker.getImageSrc(imageUri), this.actualSize);
        }
    }
};

/**
 * Finds all canvas segments (such as text annotations, image segments, and
 * audio annotations), and adds them to the canvas.
 *
 * @param {sc.data.Databroker} databroker A databroker containing the necessary
 * resource data.
 */
sc.canvas.Canvas.prototype.findAndAddSegments = function(databroker) {
    var addedTextUris = [];

    var partUris = databroker.getResourcePartUris(this.uri);
    for (var i = 0, len = partUris.length; i < len; i++) {
        var partUri = partUris[i];

        if (! this.segmentUris.contains(partUri)) {
            var constraintAttrs = sc.data.Databroker.getConstraintAttrsFromUri(
                                                                       partUri);
            var annoUris = databroker.getResourceAnnoIds(partUri);

            this.segmentUris.add(partUri);

            for (var j = 0, lenj = annoUris.length; j < lenj; j++) {
                var annoUri = annoUris[j];
                var annoResource = databroker.getResource(annoUri);

                if (annoResource.hasAnyType(sc.canvas.Canvas.RDF_ENUM.
                                            textAnno)) {
                    addedTextUris = addedTextUris.concat(
                        this.addTextAnnotation(annoResource, constraintAttrs)
                    );
                }
                else if (annoResource.hasAnyType(
                                        sc.canvas.Canvas.RDF_ENUM.imageAnno)) {
                    this.addImageAnnoSegment(annoResource, constraintAttrs);
                }
                else if (annoResource.hasAnyType(
                                        sc.canvas.Canvas.RDF_ENUM.audioAnno)) {
                    this.addAudioAnno(annoResource, constraintAttrs);
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

    this.autoAdjustFontSize(addedTextUris);
    this.showTextAnnos();
};

/**
 * Finds the comment annotations on a canvas.
 *
 * @param {sc.data.Databroker} databroker A databroker containing the necessary
 * resource data.
 */
sc.canvas.Canvas.prototype.findAndAddComments = function(databroker) {
    var annoUris = databroker.getResourceBodyAnnoIds(
        this.uri,
        sc.canvas.Canvas.RDF_ENUM.commentAnno
    );

    for (var i = 0, len = annoUris.length; i < len; i++) {
        var annoResource = databroker.getResource(annoUris[i]);

        var annoTitle = annoResource.getOneTitle();

        var bodyUri = annoResource.getOneProperty(sc.canvas.Canvas.RDF_ENUM.
                                                  hasBody);
        var bodyResource = databroker.getResource(bodyUri);

        var content = bodyResource.getOneProperty(sc.canvas.Canvas.RDF_ENUM.
                                                  cntChars);

        console.log(title, ':', content);
    }
};

/**
 * Finds and adds the constraint annotations (shapes, etc), and draws them on
 * the canvas.
 *
 * @param {sc.data.Databroker} databroker A databroker containing the necessary
 * resource data.
 */
sc.canvas.Canvas.prototype.findAndAddConstraints = function(databroker) {
    var constraintUris = databroker.getUrisWithProperty(
        sc.canvas.Canvas.RDF_ENUM.constrains, '<' + this.uri + '>'
    );

    var self = this;

    for (var i = 0, len = constraintUris.length; i < len; i++) {
        var constraintUri = constraintUris[i];
        var constrainedTargetResource = databroker.getResource(constraintUri);

        var contentResourceUris = constrainedTargetResource.getProperties(
                                      sc.canvas.Canvas.RDF_ENUM.constrainedBy);

        for (var j = 0, lenj = contentResourceUris.length; j < lenj; j++) {
            var contentResourceUri = contentResourceUris[j];
            var contentResource = databroker.getResource(contentResourceUri);

            var content = contentResource.getOneProperty(
                                         sc.canvas.Canvas.RDF_ENUM.cntChars);
            
            if (content) {
                if (self.featuresByUri.containsKey(constraintUri)) {
                    self.removeFeature(constraintUri);
                }
                
                self.addFeatureFromTagString(content, constraintUri);
            }
        }
    }
};

/**
 * Takes a text annotation resource with its constraint attributes, and draws it
 * on the canvas.
 *
 * @param {sc.data.Resource} annoResource The annotation which describes the
 * text relation.
 * @param {object} constraintAttrs The constraint attributes gleaned from the
 * segment uri (see sc.data.Databroker.getConstraintAttrsFromUri).
 * @return {Array.<string>} The uris of the text annotations added.
 */
sc.canvas.Canvas.prototype.addTextAnnotation = function(annoResource,
                                                 constraintAttrs) {
    var addedTextUris = [];
    var databroker = annoResource.getDatabroker();

    var bodyUris = annoResource.getProperties(
                                          sc.canvas.Canvas.RDF_ENUM.hasBody);
    for (var k = 0, lenk = bodyUris.length; k < lenk; k++) {
        var bodyUri = bodyUris[k];
        var bodyResource = databroker.getResource(bodyUri);
        if (bodyResource.hasAnyPredicate(sc.canvas.Canvas.RDF_ENUM.cntChars)) {
            var text = bodyResource.getOneProperty(
                                           sc.canvas.Canvas.RDF_ENUM.cntChars);

            var textBox = this.addTextBox(
                constraintAttrs.x,
                constraintAttrs.y,
                constraintAttrs.width,
                constraintAttrs.height,
                text,
                bodyUri
            );

            if (!this.isShowingTextAnnos) {
                textBox.hide();
            }

            addedTextUris.push(bodyUri);
        }
    }

    return addedTextUris;
};

/**
 * Takes an image annotation resource and its constraint attributes, and draws
 * it on the canvas.
 *
 * @param {sc.data.Resource} annoResource The image annotation resource object.
 * @param {object} constraintAttrs The constraint attributes gleaned from the
 * segment uri (see sc.data.Databroker.getConstraintAttrsFromUri).
 */
sc.canvas.Canvas.prototype.addImageAnnoSegment = function(annoResource,
                                                   constraintAttrs) {
    var databroker = annoResource.getDatabroker();

    var bodyUri = annoResource.getOneProperty(sc.canvas.Canvas.RDF_ENUM.
                                              hasBody);
    var bodyResource = databroker.getResource(bodyUri);

    var size = {
        width: constraintAttrs.width,
        height: constraintAttrs.height
    };
    var coords = {
        x: constraintAttrs.x,
        y: constraintAttrs.y
    };

    if (bodyResource.hasAnyType(sc.canvas.Canvas.RDF_ENUM.imageTypes)) {
        this.addImage(bodyResource, size, coords);
    }/*
    else if (bodyResource.hasAnyType(
                                 sc.canvas.Canvas.RDF_ENUM.constrainedBody)) {
        var imageUri = bodyResource.getOneProperty(
                                         sc.canvas.Canvas.RDF_ENUM.constrains);
        var constraintResource = databroker.getResource(
            bodyResource.getOneProperty(sc.canvas.Canvas.RDF_ENUM.constrainedBy)
        );

        var image = this.addImage(imageUri, size, coords);

        if (Raphael.svg) {
            var svgns = 'http://www.w3.org/2000/svg';
            var id = constraintResource.getUri() + '_clipPath';
            var clipPath = document.createElementNS(svgns, 'clipPath');
            jQuery(clipPath).attr('id', id);
            var path = document.createElementNS(svgns, 'path');
            var commands = sc.util.svg.parseAttrsFromString(
                constraintResource.getOneProperty(
                                          sc.canvas.Canvas.RDF_ENUM.cntChars)
            ).d;
            jQuery(path).attr('d', commands);
            jQuery(path).attr(
                'transform',
                'translate(' + constraintAttrs.x + ' ' + constraintAttrs.y +
                    ')' + ' scale(' + 0.53708 + ')' // How is scale calculated?
                // FIXME
            );

            clipPath.appendChild(path);
            this.paper.canvas.appendChild(clipPath);

            jQuery(image[0]).attr('clip-path', 'url(#' + id + ')');
        }
    }*/
};

/**
 * Takes an audio annotation resource and its constraint attributes, and draws
 * it on the canvas.
 *
 * @param {sc.data.Resource} annoResource The audio annotation resource object.
 * @param {object} constraintAttrs The constraint attributes gleaned from the
 * segment uri (see sc.data.Databroker.getConstraintAttrsFromUri).
 */
sc.canvas.Canvas.prototype.addAudioAnno = function(annoResource,
                                                   constraintAttrs) {
    var databroker = annoResource.getDatabroker();

    var x = Number(constraintAttrs.x);
    var y = Number(constraintAttrs.y);
    var width = Number(constraintAttrs.width);
    var height = Number(constraintAttrs.height);

    var bodyUri = annoResource.getOneProperty(sc.canvas.Canvas.RDF_ENUM.
                                              hasBody);
    var bodyResource = databroker.getResource(bodyUri);

    var audioAttrs = sc.data.Databroker.getConstraintAttrsFromUri(bodyUri);

    var rect = this.addRect(x, y, width, height);
    rect.attr(sc.canvas.Canvas.AUDIO_BOX_STYLES);

    var ratio = Math.min(width, height) / sc.canvas.Canvas.AUDIO_ICON_SIZE;
    var iconX = x + width / 2 - sc.canvas.Canvas.AUDIO_ICON_SIZE / 2;
    var iconY = y + height / 2 - sc.canvas.Canvas.AUDIO_ICON_SIZE / 2;

    var icon = this.paper.path(sc.canvas.Canvas.AUDIO_ICON_PATH);
    icon.transform('t' + iconX + ',' + iconY + 's' + ratio);
    icon.attr(sc.canvas.Canvas.AUDIO_ICON_STYLES);

    var set = this.paper.set();
    set.push(rect);
    set.push(icon);
    this.audioAnnoSetsByUri.set(annoResource.getUri(), set);

    this.bindEventHandlersToFeature(set, bodyUri);
    this.fireAddedFeature(set, bodyUri);
};

/**
 * Returns the div used to represent this canvas, and optionally appends it to a
 * given div.
 *
 * @param {?(Element|string)} opt_div The div to which the canvas should be
 * appended, or the id of that element.
 * @return {Element} The element which contains the gui.
 */
sc.canvas.Canvas.prototype.render = function(opt_div) {
    if (opt_div) {
        opt_div = goog.dom.getElement(opt_div);
        opt_div.appendChild(this.rootDiv);
    }

    return this.rootDiv;
};

/**
 * Returns the div used to represent this canvas.
 *
 * @return {Element} The element which contains the gui.
 */
sc.canvas.Canvas.prototype.getElement = function() {
    return this.rootDiv;
};

/**
 * Returns the uri of this canvas resource.
 *
 * @return {string} The uri of the canvas.
 */
sc.canvas.Canvas.prototype.getUri = function() {
    return this.uri;
};

/**
 * Resizes (by stretching) the canvas to the given width and height (relative to
 * the screen, not the canvas).
 *
 * @param {number} width The new width for the canvas.
 * @param {number} height The new height for the canvas.
 * @return {sc.canvas.Canvas} This canvas.
 */
sc.canvas.Canvas.prototype.resize = function(width, height) {
    if (width == this.displaySize.width && height == this.displaySize.height) {
        return this;
    }

    var size = this.actualSize.clone().scaleToFit(
                                             new goog.math.Size(width, height));

    this.paper.setSize(size.width, size.height);
    this.displaySize = size;
    return this;
};

/**
 * Gets the size in screen pixels at which the canvas is being displayed.
 *
 * @return {goog.math.Size} The size at which the canvas is being displayed.
 */
sc.canvas.Canvas.prototype.getDisplaySize = function() {
    if (jQuery.isFunction(this.displaySize.clone)) {
        return this.displaySize.clone();
    }
    else {
        return new goog.structs.Size(
            this.displaySize.width,
            this.displaySize.height
        );
    }
};

/**
 * Gets the actual size in pixels of the full-size canvas.
 *
 * @return {goog.math.Size} The actual size of the canvas.
 */
sc.canvas.Canvas.prototype.getActualSize = function() {
    if (jQuery.isFunction(this.actualSize.clone)) {
        return this.actualSize.clone();
    }
    else {
        return new goog.structs.Size(
            this.actualSize.width,
            this.actualSize.height
        );
    }
};

/**
 * Adds default event handlers to a given feature
 *
 * @protected
 * @param {Raphael.Element} feature The Raphael element to which the event
 * handlers should be bound.
 * @param {string} uri The uri of the feature.
 * @return {Raphael.Element} The given feature for method chaining.
 */
sc.canvas.Canvas.prototype.bindEventHandlersToFeature = function(feature, uri) {
    var self = this;

    feature.data('uri', uri);

    var fireCustomEvent = function(type, event) {
        event.uri = uri;
        event.feature = feature;
        event.canvas = self;
        self.dispatchEvent(event);
    };

    var autoFireCustomEvent = function(event) {
        fireCustomEvent(event.type, event);
    };

    var clickHandler = function(event) {
        fireCustomEvent('click', event);
    };

    feature.click(clickHandler);
    feature.mousedown(autoFireCustomEvent);
    feature.mouseup(autoFireCustomEvent);
    feature.mouseover(autoFireCustomEvent);
    feature.mouseout(autoFireCustomEvent);
    feature.mousemove(autoFireCustomEvent);
    feature.touchcancel(autoFireCustomEvent);
    feature.touchend(autoFireCustomEvent);
    feature.touchmove(autoFireCustomEvent);
    feature.touchstart(autoFireCustomEvent);

    return feature;
};

/**
 * Adds an image with a given source url, size, and optionally the canvas
 * coordinates at which it should be added.
 *
 * @param {string} src The source url for the image.
 * @param {object} size An object with width and height properties (such as a
 * goog.math.Size, or a raw object).
 * @param {?object} opt_coords An object with x and y properties (such as a
 * goog.math.Coordinate), defaults to (0,0).
 * @return {Raphael.image} The Raphael image object created.
 */
sc.canvas.Canvas.prototype.addImage = function(src, size, opt_coords) {
    if (this.imagesBySrc.containsKey(src)) {
        var image = this.imagesBySrc.get(src);
        image.remove();
        this.images.exclude(image);
    }

    var x = 0, y = 0;

    if (opt_coords) {
        x = opt_coords.x;
        y = opt_coords.y;
    }

    var image = this.paper.image(src, x, y, size.width, size.height);

    this.imagesBySrc.set(src, image);
    this.images.push(image);

    this.onFeatureAdded(image, src);

    return image;
};

/**
 * Adds a databroker image resource object to the canvas.
 *
 * @param {sc.data.Resource} resourceObject The image resource object.
 * @param {?object} opt_coords an object with x and y coordinates (defaults to
 * (0,0)) representing the location to draw the image.
 * @return {Raphael.image} The Raphael Image object created.
 */
sc.canvas.Canvas.prototype.addImageResource = function(resourceObject,
                                                       opt_coords) {
    var size = {
        width: resourceObject.getOneProperty(sc.canvas.Canvas.RDF_ENUM.width),
        height: resourceObject.getOneProperty(sc.canvas.Canvas.RDF_ENUM.height)
    };

    if (size.width == null || size.height == null) {
        size = this.actualSize;
    }

    var databroker = resourceObject.getDatabroker();

    return this.addImage(
        databroker.getImageSrc(resourceObject.getUri()),
        size,
        opt_coords
    );
};

/**
 * Chooses an image by its source uri to display as the default canvas image,
 * and hides the other non-segment images.
 *
 * @param {string} uri The uri of the image.
 * @return {Raphael.image} The Raphel Image object.
 */
sc.canvas.Canvas.prototype.chooseImage = function(uri) {
    if (! this.imagesBySrc.containsKey(uri)) {
        return false;
    }

    var image = this.imagesBySrc.get(uri);

    this.images.animate({'opacity': 0}, sc.canvas.Canvas.FADE_SPEED);
    image.animate({'opacity': 1}, sc.canvas.Canvas.FADE_SPEED);

    return image;
};

sc.canvas.Canvas.prototype.fireAddedFeature = function(feature, uri) {
    var event = new goog.events.Event('feature added', this);

    event.uri = uri;
    event.feature = feature;
    event.canvas = this;

    this.dispatchEvent(event);
};

sc.canvas.Canvas.prototype.onFeatureAdded = function(feature, uri) {
    this.featuresByUri.set(uri, feature);
    this.bindEventHandlersToFeature(feature, uri);

    this.fireAddedFeature(feature, uri);

    feature.data('uri', uri);
};

sc.canvas.Canvas.prototype.fireRemovedFeature = function(feature, uri) {
    var event = new goog.events.Event('feature removed', this);

    event.uri = uri;
    event.feature = feature;
    event.canvas = this;

    this.dispatchEvent(event);
};

sc.canvas.Canvas.prototype.fireModifiedFeature = function(feature, uri) {
    var event = new goog.events.Event('feature modified', this);

    event.uri = uri;
    event.feature = feature;
    event.canvas = this;

    this.dispatchEvent(event);
};

sc.canvas.Canvas.prototype.fireShownFeature = function(feature, uri) {
    var event = new goog.events.Event('feature shown', this);

    event.uri = uri;
    event.feature = feature;
    event.canvas = this;

    this.dispatchEvent(event);
};

sc.canvas.Canvas.prototype.fireHiddenFeature = function(feature, uri) {
    var event = new goog.events.Event('feature hidden', this);

    event.uri = uri;
    event.feature = feature;
    event.canvas = this;

    this.dispatchEvent(event);
};

/**
 * Adds a path with an svg command string to the canvas.
 *
 * @param {string} commands The svg commands which describe the path.
 * @param {string} uri The uri for the resource.
 * @return {Raphael.path} The Raphael element created.
 */
sc.canvas.Canvas.prototype.addPath = function(commands, uri) {
    var path = this.paper.path(commands);
    path.attr(sc.canvas.Canvas.DEFAULT_FEATURE_STYLES);

    this.pathsByUri.set(uri, path);

    this.onFeatureAdded(path, uri);

    return path;
};

/**
 * Adds a rectangle to the canvas.
 *
 * @param {Number} x The top left x coordinate of the rectangle.
 * @param {Number} y The top left y coordinate of the rectangle.
 * @param {Number} width The width of the rectangle.
 * @param {Number} height The height of the rectangle.
 * @param {string} uri The uri of the resource.
 * @return {Raphael.rect} The Raphael element created.
 */
sc.canvas.Canvas.prototype.addRect = function(x, y, width, height, uri) {
    var rect = this.paper.rect(x, y, width, height);
    rect.attr(sc.canvas.Canvas.DEFAULT_FEATURE_STYLES);

    this.onFeatureAdded(rect, uri);

    return rect;
};

/**
 * Adds a circle to the canvas.
 *
 * @param {Number} x The center x coordinate of the circle.
 * @param {Number} y The center y coordinate of the circle.
 * @param {Number} r The radius of the circle.
 * @param {string} uri The uri of the resource.
 * @return {Raphael.circle} The Raphael element created.
 */
sc.canvas.Canvas.prototype.addCircle = function(x, y, r, uri) {
    var circle = this.paper.circle(x, y, r);
    circle.attr(sc.canvas.Canvas.DEFAULT_FEATURE_STYLES);

    this.onFeatureAdded(circle, uri);

    return circle;
};

/**
 * Adds an ellipse to the canvas.
 *
 * @param {Number} cx The center x coordinate of the ellipse.
 * @param {Number} cy The center y coordinate of the ellipse.
 * @param {Number} rx The x radius of the ellipse.
 * @param {Number} ry The y radius of the ellipse.
 * @param {string} uri The uri of the resource.
 * @return {Raphael.ellipse} The Raphael element created.
 */
sc.canvas.Canvas.prototype.addEllipse = function(cx, cy, rx, ry, uri) {
    var ellipse = this.paper.ellipse(cx, cy, rx, ry);
    ellipse.attr(sc.canvas.Canvas.DEFAULT_FEATURE_STYLES);

    this.onFeatureAdded(ellipse, uri);

    return ellipse;
};

/**
 * Removes the feature with the given uri from the canvas.
 *
 * @param {string} uri The uri of the feature to be removed.
 * @return {(Raphael.Element|null)} The feature if it exists, otherwise null.
 */
sc.canvas.Canvas.prototype.removeFeature = function(uri) {
    if (this.featuresByUri.containsKey(uri)) {
        var feature = this.featuresByUri.get(uri);
        this.featuresByUri.remove(uri);

        feature.remove();

        this.fireRemovedFeature(feature, uri);

        return feature;
    }
    else {
        return null;
    }
};

/**
 * Returns the Raphael element (or possibly set) with the given uri.
 *
 * @param {string} uri The uri of the feature to get.
 * @return {(Raphael.Element|undefined)} The feature if it exists, otherwise
 * undefined.
 */
sc.canvas.Canvas.prototype.getFeature = function(uri) {
    return this.featuresByUri.get(uri);
};

/**
 * Returns a string representation of the svg feature with the given uri (using
 * the Raphael.export plugin.
 *
 * @param {string} uri The uri of the feature.
 * @return {string} The svg representation of the feature, or an empty string if
 * a feature with the given uri does not exist or that feature cannot be
 * exported using Raphael.export.
 */
sc.canvas.Canvas.prototype.getFeatureSvgString = function(uri) {
    var feature = this.featuresByUri.get(uri);

    if (! feature || ! jQuery.isFunction(feature.toSVG)) {
        return '';
    }
    else {
        return feature.toSVG();
    }
};

/**
 * Adds a line or polyline to the canvas.
 *
 * Note: implemented to draw the line or polyline using svg paths.
 *
 * @param {Array.<Object>} points An array of objects with each point's x and y
 * coordinates (such as goog.math.Coordinate}.
 * @param {string} uri The uri of the resource.
 * @return {Raphael.path} The Raphael element created.
 */
sc.canvas.Canvas.prototype.addLine = function(points, uri) {
    var commands = sc.canvas.Canvas.createPathCommandsFromPoints(points, false);

    return this.addPath(commands, uri);
};

/**
 * Adds a polygon to the canvas.
 *
 * Note: implemented to draw the polygon using svg paths.
 *
 * @param {Array.<Object>} points An array of objects with each point's x and y
 * coordinates (such as goog.math.Coordinate}.
 * @param {string} uri The uri of the resource.
 * @return {Raphael.path} The Raphael element created.
 */
sc.canvas.Canvas.prototype.addPolygon = function(points, uri) {
    var commands = sc.canvas.Canvas.createPathCommandsFromPoints(points, true);

    return this.addPath(commands, uri);
};

/**
 * Adds a text box to the canvas by drawing text with a rectangle behind it, and
 * then expanding the font size until the text fills the box on one line.
 *
 * Note: The font-size expansion to fill the box is a dom intensive operation.
 *
 * @param {Number} x The top left x coordinate of the text box.
 * @param {Number} y The top left y coordinate of the text box.
 * @param {Number} width The width of the text box.
 * @param {Number} height The height of the text box.
 * @param {string} text The contents of the text box.
 * @param {string} uri The uri of the resource.
 *
 * @return {Raphael.set} A Raphael set containing the text and rectangle
 * elements.
 */
sc.canvas.Canvas.prototype.addTextBox = function(x, y, width, height, text,
                                                 uri) {
    if (this.textsByUri.containsKey(uri)) {
        this.textsByUri.get(uri).remove();
    }

    x = Number(x);
    y = Number(y);
    width = Number(width);
    height = Number(height);

    var box = this.paper.rect(x, y, width, height);
    box.attr(sc.canvas.Canvas.DEFAULT_TEXT_BOX_STYLES);
    this.textBackgroundBoxes.push(box);
    this.textBoxesByUri.set(uri, box);

    var t = this.paper.text(x, y + (height / 2), text);
    t.attr(sc.canvas.Canvas.DEFAULT_TEXT_STYLES);

    var set = this.paper.set();
    set.push(t);
    set.push(box);

    this.textsByUri.set(uri, t);

    this.expandTextToFillBox(uri);

    this.onFeatureAdded(set, uri);

    return set;
};

/**
 * Adjusts the font size of the contents of a text box until they fill it on one
 * line (by enlarging or shrinking the font size).
 *
 * Note: Is a DOM intensive operation.
 *
 * @param {string} textUri The uri of the text box to expand.
 */
sc.canvas.Canvas.prototype.expandTextToFillBox = function(textUri) {
    var text = this.textsByUri.get(textUri);
    var textBox = this.textBoxesByUri.get(textUri);

    var width = textBox.attr('width');
    var height = textBox.attr('height');

    var padding = Math.min(width, height) * 0.07;
    var sizeIncrement = 3;

    text.attr('font-size', height);

    var count = 0;

    var bbox = text.getBBox();
    if (bbox.width == 0 || bbox.width == 0) {
        console.error('bad bounding box', bbox, 'with text', text);
    }
    else if (bbox.width < width - padding || bbox.height < height - padding) {
        while ((bbox.width < width - padding ||
                bbox.height < height - padding) && count < 1000) {
            var oldFontSize = Number(text.attr('font-size'));
            var newFontSize = oldFontSize + sizeIncrement;
            text.attr('font-size', newFontSize);

            bbox = text.getBBox();
            count++;
        }
        if (oldFontSize) {
            text.attr('font-size', oldFontSize);
        }
    }
    else {
        while ((bbox.width >= width - padding ||
                bbox.height >= height - padding) && count < 1000) {
            var oldFontSize = Number(text.attr('font-size'));
            var newFontSize = oldFontSize - sizeIncrement;
            text.attr('font-size', newFontSize);

            bbox = text.getBBox();
            count++;
        }
    }
};

/**
 * Adjusts the font size of all text boxes with nearly average font sizes to
 * match, but leaves outlier text boxes alone.
 *
 * @param {?Array.<string>} opt_textUris The uris of the text boxes to adjust
 * (defaults to all).
 */
sc.canvas.Canvas.prototype.autoAdjustFontSize = function(opt_textUris) {
    if (opt_textUris && opt_textUris.length == 0) {
        return;
    }

    var textUris = opt_textUris || this.textsByUri.getKeys();
    var allTextUris = this.textsByUri.getKeys();

    var fontSizes = [];

    for (var i = 0, len = allTextUris.length; i < len; i++) {
        var uri = allTextUris[i];
        var text = this.textsByUri.get(uri);

        var fontSize = Number(text.attr('font-size'));
        fontSizes.push(fontSize);
    }

    var average = sc.util.stats.mean(fontSizes);
    var median = sc.util.stats.median(fontSizes, true);
    var standardDeviation = sc.util.stats.standardDeviation(fontSizes);

    var min = Math.min.apply(Math, fontSizes);

    var zScoreCutoff = 0.7;

    if (Math.abs((min - average) / standardDeviation) < zScoreCutoff) {
        for (var i = 0, len = textUris.length; i < len; i++) {
            var uri = textUris[i];
            var text = this.textsByUri.get(uri);

            var fontSize = text.attr('font-size');

            var zScore = (fontSize - average) / standardDeviation;

            if (zScore != NaN &&
                zScore < zScoreCutoff && zScore > -zScoreCutoff) {
                text.attr('font-size', min);
            }
        }
    }
};

/**
 * Sets the opacity of all text box backgrounds.
 *
 * @param {Number} opacity An opacity value between 0 and 1.
 */
sc.canvas.Canvas.prototype.setTextBoxBackgroundOpacity = function(opacity) {
    this.textBackgroundBoxes.attr('fill-opacity', opacity);
};

/**
 * The speed in ms at which objects being hidden or shown should animate.
 * @const
 */
sc.canvas.Canvas.FADE_SPEED = 300;

/**
 * Shows the specified (or all) text boxes on the canvas.
 *
 * @param {?Array.<string>} opt_textUris The uris of the annos to show, defaults
 * to all.
 */
sc.canvas.Canvas.prototype.showTextAnnos = function(opt_textUris) {
    this.isShowingTextAnnos = true;

    var textUris = opt_textUris || this.textsByUri.getKeys();

    for (var i = 0, len = textUris.length; i < len; i++) {
        var uri = textUris[i];
        var text = this.textsByUri.get(uri);
        var textBox = this.textBoxesByUri.get(uri);

        textBox.animate({'opacity': sc.canvas.Canvas.
                        DEFAULT_TEXT_BOX_STYLES['fill-opacity']},
                        sc.canvas.Canvas.FADE_SPEED);
        textBox.toFront();

        text.animate({'opacity': 1}, sc.canvas.Canvas.FADE_SPEED);
        text.toFront();
    }
};

sc.canvas.Canvas.prototype.fadeTextAnnosToOpacity =
function(opacity, opt_textUris) {
    var textUris = opt_textUris || this.textsByUri.getKeys();

    for (var i = 0, len = textUris.length; i < len; i++) {
        var uri = textUris[i];
        var text = this.textsByUri.get(uri);
        var textBox = this.textBoxesByUri.get(uri);

        textBox.animate({'opacity': opacity * sc.canvas.Canvas.
                        DEFAULT_TEXT_BOX_STYLES['fill-opacity']},
                        sc.canvas.Canvas.FADE_SPEED);
        textBox.toFront();

        text.animate({'opacity': opacity}, sc.canvas.Canvas.FADE_SPEED);
        text.toFront();

        this.fireShownFeature(this.paper.set().push(text, textBox), uri);
    }
};

/**
 * Hides the specified (or all) text boxes on the canvas.
 *
 * @param {?Array.<string>} opt_textUris The uris of the annos to hide, defaults
 * to all.
 */
sc.canvas.Canvas.prototype.hideTextAnnos = function(opt_textUris) {
    if (!opt_textUris) {
        this.isShowingTextAnnos = false;
    }

    var textUris = opt_textUris || this.textsByUri.getKeys();

    for (var i = 0, len = textUris.length; i < len; i++) {
        var uri = textUris[i];
        var text = this.textsByUri.get(uri);
        var textBox = this.textBoxesByUri.get(uri);

        text.animate({'opacity': 0}, sc.canvas.Canvas.FADE_SPEED);

        textBox.animate({'opacity': 0}, sc.canvas.Canvas.FADE_SPEED);

        this.fireHiddenFeature(this.paper.set().push(text, textBox), uri);
    }
};

sc.canvas.Canvas.prototype.showFeatureByUri = function(uri) {
    if (this.featuresByUri.containsKey(uri)) {
        if (this.textsByUri.containsKey(uri)) {
            this.showTextAnnos([uri]);
        }
        else {
            var feature = this.featuresByUri.get(uri);

            var opacity = feature.data('old-opacity') || 1;

            feature.animate({'opacity': opacity}, sc.canvas.Canvas.FADE_SPEED);

            this.fireShownFeature(feature, uri);
        }

        return true;
    }
    return false;
};

sc.canvas.Canvas.prototype.hideFeatureByUri = function(uri) {
    if (this.featuresByUri.containsKey(uri)) {
        if (this.textsByUri.containsKey(uri)) {
            this.hideTextAnnos([uri]);
        }
        else {
            var feature = this.featuresByUri.get(uri);

            feature.data('old-opacity', feature.attr('opacity'));

            feature.animate({'opacity': 0}, sc.canvas.Canvas.FADE_SPEED);

            this.fireHiddenFeature(feature, uri);
        }

        return true;
    }
    return false;
};

/**
 * Determines whether this canvas knows its position in a specific sequence of
 * canvases in order to allow page flipping.
 *
 * @return {boolean} True if the canvas knows the list of canvases and its index
 * in that list.
 */
sc.canvas.Canvas.prototype.knowsSequenceInformation = function() {
    return this.urisInOrder != null && this.currentIndex != null;
};

/**
 * Adds a feature to the canvas from a string in the svg feature format
 * (e.g., <path d="m 1 2..." />).
 *
 * @param {string} str The svg feature tag.
 * @param {string} uri The uri of the feature.
 * @return {Raphael.Element} The Raphael element created.
 */
sc.canvas.Canvas.prototype.addFeatureFromTagString = function(str, uri) {
    var re = /^<?\s*(?:svg:)?([\w\-:]+)[\s*>]/;
    var match = re.exec(str);

    if (match) {
        var featureType = match[1].toLowerCase();

        var attrs = sc.util.svg.parseAttrsFromString(str);

        if (featureType == 'path') {
            return this.addPath(attrs.d, uri);
        }
        else if (featureType == 'circle') {
            return this.addCircle(attrs.cx, attrs.cy, attrs.r, uri);
        }
        else if (featureType == 'rect') {
            return this.addRect(
                attrs.x,
                attrs.y,
                attrs.width,
                attrs.height,
                uri
            );
        }
        else if (featureType == 'ellipse') {
            return this.addEllipse(attrs.cx, attrs.cy, attrs.rx, attrs.ry, uri);
        }
        else if (featureType == 'line') {
            var points = [
                {x: attrs.x1, y: attrs.y1},
                {x: attrs.x2, y: attrs.y2}
            ];
            return this.addLine(points, uri);
        }
        else if (featureType == 'polyline') {
            var points = sc.canvas.Canvas.pointsStringToPointsArray(
                                                                attrs.points);
            return this.addLine(points, uri);
        }
        else if (featureType == 'polygon') {
            var points = sc.canvas.Canvas.pointsStringToPointsArray(
                                                                attrs.points);
            return this.addPolygon(points, uri);
        }
        else {
            console.warn('Unrecognized feature type', str);
        }
    }
};

/**
 * Converts canvas coordinates into coordinates in proportions from 0 to 1 of
 * the canvas size.
 *
 * @param {(number|Object)} x The canvas x coordinate or an object with x and y
 * properties.
 * @param {?number} y The canvas y coordinate.
 * @return {Object} An object with x and y properties.
 */
sc.canvas.Canvas.prototype.canvasToProportionalCoord = function(x, y) {
    if (y == null) {
        y = x.y;
        x = x.x;
    }

    return {
        'x': x / this.actualSize.width,
        'y': y / this.actualSize.height
    };
};

/**
 * Converts proportional coordinates from 0 to 1 into canvas coordinates.
 *
 * @param {(number|Object)} x The canvas x coordinate or an object with x and y
 * properties.
 * @param {?number} y The canvas y coordinate.
 * @return {Object} An object with x and y properties.
 */
sc.canvas.Canvas.prototype.proportionalToCanvasCoord = function(x, y) {
    if (y == null) {
        y = x.y;
        x = x.x;
    }

    return {
        'x': x * this.actualSize.width,
        'y': y * this.actualSize.height
    };
};

/**
 * Takes a string of points in the svg polyline or polygon format, and returns
 * an array of point objects.
 *
 * @param {string} str e.g. "50,375 150,375 150,325".
 * @return {Array.<Object>} An array of objects with x and y properties.
 */
sc.canvas.Canvas.pointsStringToPointsArray = function(str) {
    var xyStrings = str.split(' ');
    var points = [];

    for (var i = 0, len = xyStrings.length; i < len; i++) {
        var xyString = xyStrings[i];

        var indexOfComma = xyString.indexOf(',');

        if (indexOfComma == -1) {
            continue;
        }

        var x = xyString.substring(0, indexOfComma);
        var y = xyString.substring(indexOfComma + 1, xyString.length);

        points.push({x: Number(x), y: Number(y)});
    }

    return points;
};

/**
 * Takes an array of objects with x and y properties, and returns a string of
 * svg path commands describing a line or polygon.
 *
 * @param {Array.<Object>} points An array of objects with x and y properties.
 * @param {boolean} closePath If true, the path will be closed at the end,
 * otherwise, the path will retrace the points in reverse and then close.
 * @return {string} The svg path commands.
 */
sc.canvas.Canvas.createPathCommandsFromPoints = function(points, closePath) {
    var commands = '';

    // Move to the first point
    commands += 'M' + points[0].x + ' ' + points[0].y + ' ';

    // Line to all other points
    for (var i = 1, len = points.length; i < len; i++) {
        commands += 'L' + points[i].x + ' ' + points[i].y + ' ';
    }

    if (closePath) {
        commands += 'Z';
    }
    else {
        for (var i = points.length - 2; i >= 0; i--) {
            commands += 'L' + points[i].x + ' ' + points[i].y + ' ';
        }

        commands += 'Z';
    }

    return commands;
};
