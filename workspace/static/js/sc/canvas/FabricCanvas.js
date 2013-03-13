goog.provide('sc.canvas.FabricCanvas');

goog.require('fabric');
goog.require('goog.events.EventTarget');
goog.require('goog.math.Size');
goog.require('goog.structs.Map');
goog.require('goog.structs.Set');

/**
 * A UI representation of a canvas resource, drawn using HTML5 Canvas via the
 * Fabric JS library for fast performance.
 *
 * @author tandres@drew.edu (Tim Andres)
 *
 * @constructor
 * @extends {goog.events.EventTarget}
 *
 * Each canvas class implements the W3C EventTarget interface, so any W3C
 * compliant events library (including jQuery) can be used to add event
 * listeners to a canvas.
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
sc.canvas.FabricCanvas = function(uri, databroker, size) {
    goog.events.EventTarget.call(this);

    if (goog.isString(uri)) {
        this.resource = databroker.getResource(uri);
        this.databroker = databroker;
    }
    else if (uri.uri) {
        this.resource = uri;

        if (! databroker) {
            this.databroker = this.resource.getDatabroker();
        }
        else {
            this.databroker = databroker;
        }
    }
    this.uri = this.resource.getUri();

    this.size = size;

    this.group = new fabric.Group([], {
        width: size.width,
        height: size.height,
        selectable: false,
        top: size.height / 2,
        left: size.width / 2
    });
    this.objectsByUri = new goog.structs.Map();
    this.urisByObject = new goog.structs.Map();

    this.imageOptionUris = [];
    this.imagesBySrc = new goog.structs.Map();
    this.imageSrcsInProgress = new goog.structs.Set();
    this.textsByUri = new goog.structs.Map();

    /**
     * @type {sc.canvas.FabricCanvasViewport}
     */
    this.viewport = null;

    this.segmentUris = new goog.structs.Set();

    var textCanvasElement = document.createElement('canvas');
    this.textCanvas = new fabric.StaticCanvas(textCanvasElement, {
        renderOnAddition: false
    });
    this.textCanvas.setDimensions(this.size);
};
goog.inherits(sc.canvas.FabricCanvas, goog.events.EventTarget);

/**
 * @enum
 * An enumeration of common rdf predicates and types
 */
sc.canvas.FabricCanvas.RDF_ENUM = {
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
sc.canvas.FabricCanvas.DEFAULT_FEATURE_STYLES = {
    fill: 'rgba(15, 108, 214, 0.6)',
    stroke: 'rgba(3, 75, 158, 0.7)',
    strokeWidth: 5
};

sc.canvas.FabricCanvas.DEFAULT_TEXT_STYLE = {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    textBackgroundColor: 'rgba(3, 75, 158, 1.0)',
    fontFamily: 'Helvetica, Arial, Sans-Sefif',
    opacity: 1
};

sc.canvas.FabricCanvas.prototype.clone = function() {
    //TODO
};

/**
 * Returns the uri of this canvas resource.
 *
 * @return {string} The uri of the canvas.
 */
sc.canvas.FabricCanvas.prototype.getUri = function() {
    return this.uri;
};

sc.canvas.FabricCanvas.prototype.addTextAnnotation = function(annoResource, constraintAttrs) {
    var addedTextUris = [];
    var databroker = annoResource.getDatabroker();

    var bodyUris = annoResource.getProperties(sc.canvas.FabricCanvas.RDF_ENUM.hasBody);
    for (var k = 0, lenk = bodyUris.length; k < lenk; k++) {
        var bodyUri = bodyUris[k];
        var bodyResource = databroker.getResource(bodyUri);
        if (bodyResource.hasAnyPredicate(sc.canvas.FabricCanvas.RDF_ENUM.cntChars)) {
            var text = bodyResource.getOneProperty(sc.canvas.FabricCanvas.RDF_ENUM.cntChars);

            var textBox = this.addTextBox(
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
sc.canvas.FabricCanvas.prototype.addTextBox = function(x, y, width, height, text, uri) {
    return this.addTextBoxes([{
        x: x,
        y: y,
        width: width,
        height: height,
        text: text,
        uri: uri
    }])[0];
};

sc.canvas.FabricCanvas.prototype.addTextBoxes = function(options_list) {;
    var texts = [];

    for (var i=0, len=options_list.length; i<len; i++) {
        var options = options_list[i];

        if (options.uri == null) {
            options.uri = this.databroker.createUuid();
        }

        var t = new fabric.Text(options.text, sc.canvas.FabricCanvas.DEFAULT_TEXT_STYLE);
        t.set({
            left: options.x,
            top: options.y
        });
        this.textCanvas.add(t)
        texts.push(t);
        this.textsByUri.set(options.uri, t);
    }

    this.textCanvas.renderAll();

    for (var i=0, len=texts.length; i<len; i++) {
        var t = texts[i];
        var options = options_list[i];

        var currentSize = new goog.math.Size(t.get('width'), t.get('height'));
        var desiredSize = new goog.math.Size(options.width, options.height);

        var renderedSize = currentSize.clone().scaleToFit(desiredSize);
        t.scaleToHeight(renderedSize.height);

        t.set({
            left: t.get('left') + renderedSize.width / 2 - this.group.get('width') / 2,
            top: t.get('top') + renderedSize.height / 2 - this.group.get('height') / 2
        });

        this.textCanvas.remove(t);
        this.addFabricObject(t, options.uri);
    }

    return texts;
};

sc.canvas.FabricCanvas.prototype.showTextAnnos = function() {
    this.isShowingTextAnnos = true;

    goog.structs.forEach(this.textsByUri, function(text, uri) {
        this.group.add(text);
    }, this);

    this.requestFrameRender();
};

sc.canvas.FabricCanvas.prototype.hideTextAnnos = function() {
    this.isShowingTextAnnos = false;

    goog.structs.forEach(this.textsByUri, function(text, uri) {
        this.group.remove(text);
    }, this);

    this.requestFrameRender();
};

/**
 * The speed in ms at which objects being hidden or shown should animate.
 * @const
 */
sc.canvas.FabricCanvas.FADE_SPEED = 300;

sc.canvas.FabricCanvas.prototype.fadeTextAnnosToOpacity = function(opacity) {
    if (!this.isShowingTextAnnos) {
        this.pauseRendering();

        this.showTextAnnos();
        goog.structs.forEach(this.textsByUri, function(text, uri) {
            text.set('opacity', 0);
        }, this);

        this.resumeRendering();
    }

    goog.structs.forEach(this.textsByUri, function(text, uri) {
        var params = {
            onChange: this.requestFrameRender.bind(this),
            duration: sc.canvas.FabricCanvas.FADE_SPEED
        };

        if (opacity == 0) {
            params.onComplete = this.hideTextAnnos.bind(this);
        }

        text.animate('opacity', opacity, params);
    }, this);
};

sc.canvas.FabricCanvas.MARKER_TYPES = new goog.structs.Set([
    'circle',
    'ellipse',
    'polyline',
    'path',
    'line',
    'pathgroup',
    'polygon',
    'rect',
    'triangle'
]);

sc.canvas.FabricCanvas.prototype.showObject = function(obj) {
    obj.set('opacity', 1);
};

sc.canvas.FabricCanvas.prototype.hideObject = function(obj) {
    obj.set('opacity', 0);
};

sc.canvas.FabricCanvas.prototype.showMarkers = function() {
    goog.structs.forEach(this.objectsByUri, function(obj, uri) {
        if (sc.canvas.FabricCanvas.MARKER_TYPES.contains(obj.type)) {
            this.showObject(obj);
        }
    }, this);

    this.requestFrameRender();
};

sc.canvas.FabricCanvas.prototype.hideMarkers = function() {
    goog.structs.forEach(this.objectsByUri, function(obj, uri) {
        if (sc.canvas.FabricCanvas.MARKER_TYPES.contains(obj.type)) {
            this.hideObject(obj);
        }
    }, this);

    this.requestFrameRender();
};

sc.canvas.FabricCanvas.prototype.isHidingAllMarkers = function() {
    return goog.structs.every(this.objectsByUri, function(obj, uri) {
        if (sc.canvas.FabricCanvas.MARKER_TYPES.contains(obj.type) && 
            obj.get('opacity') != 0) {
            return false;
        }
        else {
            return true;
        }
    }, this);
};

sc.canvas.FabricCanvas.prototype.getNumMarkers = function() {
    var count = 0;

    goog.structs.forEach(this.objectsByUri, function(obj, uri) {
        if (sc.canvas.FabricCanvas.MARKER_TYPES.contains(obj.type) && obj.get('opacity') != 0) {
            count ++;
        }
    }, this);

    return count;
};

/**
 * Adds a databroker image resource object to the canvas.
 *
 * @param {sc.data.Resource} resourceObject The image resource object.
 * @param {?object} opt_coords an object with x and y coordinates (defaults to
 * (0,0)) representing the location to draw the image.
 */
sc.canvas.FabricCanvas.prototype.addImageResource = function(resource, opt_coords) {
    var size = new goog.math.Size(
        Number(resource.getOneProperty(sc.canvas.FabricCanvas.RDF_ENUM.width)),
        Number(resource.getOneProperty(sc.canvas.FabricCanvas.RDF_ENUM.height))
    );

    if (size.isEmpty()) {
        size = this.size.clone();
    }

    var databroker = resource.getDatabroker();

    return this.addImage(
        databroker.getImageSrc(resource.getUri()),
        size,
        opt_coords
    );
};

sc.canvas.FabricCanvas.prototype.setFeatureCoords = function(feature, x, y) {
    if (y == null) {
        y = x.y;
        x = x.x;
    }

    var featureCenteredCoords = sc.canvas.FabricCanvas.toCenteredCoords(x, y,
        feature.getBoundingRectWidth(), feature.getBoundingRectHeight());

    x = featureCenteredCoords.x - this.group.get('width') / 2;
    y = featureCenteredCoords.y - this.group.get('height') / 2;

    feature.set('left', x).set('top', y);
};

sc.canvas.FabricCanvas.prototype.getFeatureCoords = function(feature) {
    console.log("setting feature coords");
    var x = feature.get('left');
    var y = feature.get('top');

    var featureTopLeftCoords = sc.canvas.FabricCanvas.toTopLeftCoords(x, y,
        feature.getBoundingRectWidth(), feature.getBoundingRectHeight());

    x = featureTopLeftCoords.x + this.group.get('width') / 2;
    y = featureTopLeftCoords.y + this.group.get('height') / 2;

    return {
        x: x,
        y: y
    };
};

sc.canvas.FabricCanvas.prototype.addFabricObject = function(obj, uri, opt_noEvent) {
    this.group.add(obj);

    if (uri == null) {
        uri = this.databroker.createUuid();
    }

    this.objectsByUri.set(uri, obj);
    this.urisByObject.set(obj, uri);

    if (!opt_noEvent) {
        this.fireAddedFeature(obj, uri);
    }

    return this;
};

sc.canvas.FabricCanvas.prototype.removeFabricObject = function(obj, opt_noEvent) {
    this.group.remove(obj);

    var uri = this.getFabricObjectUri(obj);
    this.objectsByUri.remove(uri);
    this.urisByObject.remove(obj);

    if (!opt_noEvent) {
        this.fireRemovedFeature(obj, uri);
    }

    return this;
};

sc.canvas.FabricCanvas.prototype.bringObjectToFront = function(obj) {
    this.group.remove(obj);
    this.group.add(obj);

    this.requestFrameRender();
};

sc.canvas.FabricCanvas.prototype.sendObjectToBack = function(obj) {
    this.group.remove(obj);

    goog.array.insertAt(this.group.objects, obj, 0);

    this.requestFrameRender();
};

sc.canvas.FabricCanvas.prototype.removeObjectByUri = function(uri, opt_noEvent) {
    var obj = this.objectsByUri.get(uri);

    return this.removeFabricObject(obj, opt_noEvent);
};

sc.canvas.FabricCanvas.prototype.getFabricObjectUri = function(obj) {
    return this.urisByObject.get(obj);
};

sc.canvas.FabricCanvas.prototype.getFabricObjectByUri = function(uri) {
    return this.objectsByUri.get(uri);
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
 * @return {fabric.Image} The Fabric image object created.
 */
sc.canvas.FabricCanvas.prototype.addImage = function(src, size, opt_coords, opt_callback) {
    if (this.imageSrcsInProgress.contains(src)) {
        return;
    }

    this.imageSrcsInProgress.add(src);

    if (this.imagesBySrc.containsKey(src)) {
        var image = this.imagesBySrc.get(src);
        this.group.remove(image);
    }

    var x = 0, y = 0;

    if (opt_coords) {
        x = opt_coords.x;
        y = opt_coords.y;
    }

    fabric.Image.fromURL(src, function(image) {
        this.imagesBySrc.set(src, image);
        this.imageSrcsInProgress.remove(src);

        if (! size.isEmpty()) {
            image.set('scaleX', size.width / image.get('width'));
            image.set('scaleY', size.height / image.get('height'));
        }

        this.setFeatureCoords(image, x, y);

        this.addFabricObject(image, src);
        this.sendObjectToBack(image);

        this.requestFrameRender();

        this.fireAddedFeature(image, src);

        if (goog.isFunction(opt_callback)) {
            opt_callback(image);
        }
    }.bind(this));
};

/**
 * Chooses an image by its source uri to display as the default canvas image,
 * and hides the other non-segment images.
 *
 * @param {string} uri The uri of the image.
 * @return {fabric.Image} The Fabric Image object.
 */
sc.canvas.FabricCanvas.prototype.chooseImage = function(uri) {
    if (! this.imagesBySrc.containsKey(uri)) {
        return false;
    }

    var image = this.imagesBySrc.get(uri);

    goog.structs.forEach(this.imagesBySrc, function(image, src) {
        this.group.remove(image);
    }, this);

    this.group.add(image);
    this.sendObjectToBack(image);

    this.requestFrameRender();

    return image;
};

/**
 * Adds a rectangle to the canvas.
 *
 * @param {Number} x The top left x coordinate of the rectangle.
 * @param {Number} y The top left y coordinate of the rectangle.
 * @param {Number} width The width of the rectangle.
 * @param {Number} height The height of the rectangle.
 * @param {string} uri The uri of the resource.
 * @return {fabric.Rect} The fabric element created.
 */
sc.canvas.FabricCanvas.prototype.addRect = function(x, y, width, height, uri) {
    var rect = new fabric.Rect(sc.canvas.FabricCanvas.DEFAULT_FEATURE_STYLES);
    rect.set({
        width: width,
        height: height
    });
    this.setFeatureCoords(rect, x, y);

    this.addFabricObject(rect, uri);

    return rect;
};

/**
 * Adds a circle to the canvas.
 *
 * @param {Number} x The center x coordinate of the circle.
 * @param {Number} y The center y coordinate of the circle.
 * @param {Number} r The radius of the circle.
 * @param {string} uri The uri of the resource.
 * @return {fabric.Circle} The fabric element created.
 */
sc.canvas.FabricCanvas.prototype.addCircle = function(cx, cy, r, uri) {
    var circle = new fabric.Circle(sc.canvas.FabricCanvas.DEFAULT_FEATURE_STYLES);
    circle.set({
        r: r
    });
    this.setFeatureCoords(circle, cx + r/2, cy + r/2);

    this.addFabricObject(circle, uri);

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
 * @return {fabric.Ellipse} The fabric circle created.
 */
sc.canvas.FabricCanvas.prototype.addEllipse = function(cx, cy, rx, ry, uri) {
    var ellipse = new fabric.Ellipse(sc.canvas.FabricCanvas.DEFAULT_FEATURE_STYLES);
    ellipse.set({
        left: cx - this.group.get('width') / 2,
        top: cy - this.group.get('height') / 2,
        width: rx,
        height: ry,
        rx: rx,
        ry: ry
    });

    this.addFabricObject(ellipse, uri);

    return ellipse;
};

/**
 * Adds a line or polyline to the canvas.
 *
 * Note: implemented to draw the line or polyline using svg paths.
 *
 * @param {Array.<Object>} points An array of objects with each point's x and y
 * coordinates (such as goog.math.Coordinate}.
 * @param {string} uri The uri of the resource.
 * @return {fabric.Path} The fabric element created.
 */
sc.canvas.FabricCanvas.prototype.addPolyline = function(points, uri) {
    points = this.originToCenterPoints(points);

    var line = new fabric.Polyline(points);
    line.set(sc.canvas.FabricCanvas.DEFAULT_FEATURE_STYLES);

    this.addFabricObject(line, uri);

    return line;
};

/**
 * Adds a polygon to the canvas.
 *
 * Note: implemented to draw the polygon using svg paths.
 *
 * @param {Array.<Object>} points An array of objects with each point's x and y
 * coordinates (such as goog.math.Coordinate}.
 * @param {string} uri The uri of the resource.
 * @return {fabric.Path} The fabric element created.
 */
sc.canvas.FabricCanvas.prototype.addPolygon = function(points, uri) {
    points = this.originToCenterPoints(points);

    var polygon = new fabric.Polygon(points);
    polygon.set(sc.canvas.FabricCanvas.DEFAULT_FEATURE_STYLES);

    this.addFabricObject(polygon, uri);

    return polygon;
};

sc.canvas.FabricCanvas.svgStringToElement = function(string) {
    //Based on fabric.js implementation

    string = string.trim();
    var doc;
    if (typeof DOMParser !== 'undefined') {
        var parser = new DOMParser();
        if (parser && parser.parseFromString) {
            doc = parser.parseFromString(string, 'text/xml');
        }
    }
    else if (fabric.window.ActiveXObject) {
        doc = new ActiveXObject('Microsoft.XMLDOM');
        doc.async = 'false';
        //IE chokes on DOCTYPE
        doc.loadXML(string.replace(/<!DOCTYPE[\s\S]*?(\[[\s\S]*\])*?>/i,''));
    }

    return doc.firstChild;
}

/**
 * Adds a feature to the canvas from a string in the svg feature format
 * (e.g., <path d="m 1 2..." />).
 *
 * @param {string} str The svg feature tag.
 * @param {string} uri The uri of the feature.
 * @return {fabric.Object|null} The fabric element created, or null if
 * the feature type is unrecognized.
 */
sc.canvas.FabricCanvas.prototype.addFeatureFromTagString = function(str, uri) {
    var self = this;

    var svgDoc = 
        '<?xml version="1.0" standalone="no"?>'
        + '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN"'
        + ' "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">'
        + ' <svg xmlns="http://www.w3.org/2000/svg" version="1.1">'
        + str
        + '</svg>';
    console.log("about to loadSVGFromString: ", svgDoc);
    fabric.loadSVGFromString(svgDoc, function(objects, options) {
        var obj = objects[0];
//        console.log("obj: ", obj);
//        console.log("obj svg transform:", obj.getSvgTransform());

        var x = 0;
        var y = 0;
        if (obj.hasOwnProperty("x")) {
            x = obj.x;
            y = obj.y;
        } else if (obj.hasOwnProperty("rx")) {
            x = Math.round((-obj.rx / 2.0) * 100) / 100;
            y = Math.round((-obj.ry / 2.0) * 100) / 100;
        } else {
            x = Math.round((-obj.width / 2.0) * 100) / 100;
            y = Math.round((-obj.height / 2.0) * 100) / 100;
        }

        var clonedObject = obj.clone();
        clonedObject.left = Math.ceil(obj.transformMatrix[4] - x - self.group.get('width') / 2.0);
        clonedObject.top = Math.ceil(obj.transformMatrix[5] - y - self.group.get('height') / 2.0);
//        console.log("clonedObject: ", clonedObject);
        self.addFabricObject(clonedObject, uri);
    });

/*
    var re = /^<?\s*(?:svg:)?([\w\-:]+)[\s*>]/;
    var match = re.exec(str);

    if (match) {
        var featureType = match[1].toLowerCase();

        var attrs = sc.util.svg.parseAttrsFromString(str);

        switch (featureType) {
            case 'path':
                return this.addPath(attrs.d, uri);
                break;
            case 'circle':
                return this.addCircle(attrs.cx, attrs.cy, attrs.r, uri);
                break;
            case 'rect':
                return this.addRect(
                    attrs.x,
                    attrs.y,
                    attrs.width,
                    attrs.height,
                    uri
                );
                break;
            case 'ellipse':
                return this.addEllipse(attrs.cx, attrs.cy, attrs.rx, attrs.ry, uri);
                break;
            case 'line':
                var points = [
                    {x: attrs.x1, y: attrs.y1},
                    {x: attrs.x2, y: attrs.y2}
                ];
                return this.addPolyline(points, uri);
                break;
            case 'polyline':
                var points = sc.canvas.FabricCanvas.pointsStringToPointsArray(
                                                                    attrs.points);
                return this.addPolyline(points, uri);
                break;
            case 'polygon':
                var points = sc.canvas.FabricCanvas.pointsStringToPointsArray(
                                                                    attrs.points);
                return this.addPolygon(points, uri);
                break;
            default:
                console.warn('Unrecognized feature type', str);
                return null;
                break;
        }
    }
*/
};


/**
 * Takes a string of points in the svg polyline or polygon format, and returns
 * an array of point objects.
 *
 * @param {string} str e.g. "50,375 150,375 150,325".
 * @return {Array.<Object>} An array of objects with x and y properties.
 */
sc.canvas.FabricCanvas.pointsStringToPointsArray = function(str) {
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

sc.canvas.FabricCanvas.prototype.fireAddedFeature = function(feature, uri) {
    var event = new goog.events.Event('featureAdded', this);

    event.uri = uri;
    event.feature = feature;
    event.canvas = this;

    this.dispatchEvent(event);
};

sc.canvas.FabricCanvas.prototype.fireRemovedFeature = function(feature, uri) {
    var event = new goog.events.Event('featureRemoved', this);

    event.uri = uri;
    event.feature = feature;
    event.canvas = this;

    this.dispatchEvent(event);
};

sc.canvas.FabricCanvas.prototype.fireModifiedFeature = function(feature, uri) {
    var event = new goog.events.Event('featureModified', this);

    event.uri = uri;
    event.feature = feature;
    event.canvas = this;

    this.dispatchEvent(event);
};

sc.canvas.FabricCanvas.prototype.fireShownFeature = function(feature, uri) {
    var event = new goog.events.Event('featureShown', this);

    event.uri = uri;
    event.feature = feature;
    event.canvas = this;

    this.dispatchEvent(event);
};

sc.canvas.FabricCanvas.prototype.fireHiddenFeature = function(feature, uri) {
    var event = new goog.events.Event('featureHidden', this);

    event.uri = uri;
    event.feature = feature;
    event.canvas = this;

    this.dispatchEvent(event);
};

sc.canvas.FabricCanvas.toCenteredCoords = function(x, y, width, height) {
    if (y == null) {
        width = x.width;
        height = x.height;
        y = x.y;
        x = x.x;
    }

    x += width / 2;
    y += height / 2

    return {
        x: x,
        y: y,
        left: x,
        top: y
    };
};

sc.canvas.FabricCanvas.prototype.originToCenterPoints = function(points) {
    var newPoints = [];

    for (var i=0, len=points.length; i<len; i++) {
        var point = {
            x: points[i].x,
            y: points[i].y
        };

        point.x -= this.group.get('width') / 2;
        point.y -= this.group.get('height') / 2;

        newPoints.push(point);
    }

    return newPoints;
};

sc.canvas.FabricCanvas.prototype.originToCenterPoint = function(point) {
    return this.originToCenterPoints([point]);
};

sc.canvas.FabricCanvas.prototype.toCenteredCanvasCoord = function(x, y) {
    if (y == null) {
        y = x.y;
        x = x.x;
    }

    var size = this.getSize();

    return sc.canvas.FabricCanvas.toTopLeftCoords(x, y, size.width, size.height);
};

sc.canvas.FabricCanvas.toTopLeftCoords = function(x, y, width, height) {
    if (y == null) {
        width = x.width;
        height = x.height;
        y = x.y;
        x = x.x;
    }

    x -= width / 2;
    y -= height / 2;

    return {
        x: x,
        y: y,
        left: x,
        top: y
    };
};

sc.canvas.FabricCanvas.objectTopLeftCoords = function(object) {
    return sc.canvas.FabricCanvas.toTopLeftCoords(
        object.get('left'),
        object.get('top'),
        object.get('width'),
        object.get('height')
    );
};

sc.canvas.FabricCanvas.prototype.requestFrameRender = function() {
    if (this.viewport) {
        this.viewport.requestFrameRender();
    }
};

sc.canvas.FabricCanvas.prototype.pauseRendering = function() {
    if (this.viewport) {
        this.viewport.pauseRendering();
    }
};

sc.canvas.FabricCanvas.prototype.resumeRendering = function() {
    if (this.viewport) {
        this.viewport.resumeRendering();
    }
};

/**
 * Gets the actual size in pixels of the full-size canvas.
 *
 * @return {goog.math.Size} The actual size of the canvas.
 */
sc.canvas.FabricCanvas.prototype.getSize = function() {
    return this.size;
};

/**
 * Determines whether this canvas knows its position in a specific sequence of
 * canvases in order to allow page flipping.
 *
 * @return {boolean} True if the canvas knows the list of canvases and its index
 * in that list.
 */
sc.canvas.FabricCanvas.prototype.knowsSequenceInformation = function() {
    return this.urisInOrder != null && this.currentIndex != null;
};

/**
 * Gets the size in screen pixels at which the canvas is being displayed
 * within the viewport.
 *
 * @return {goog.math.Size} The size at which the canvas is being displayed.
 */
sc.canvas.FabricCanvas.prototype.getDisplaySize = function() {
    return new goog.math.Size(
        this.group.get('width') * this.group.get('scaleX'),
        this.group.get('height') * this.group.get('scaleY')
    );
};

/**
 * Returns the ratio of the display size of the canvas to the actual size of the
 * canvas.
 * @return {number} display width / actual width
 */
sc.canvas.FabricCanvas.prototype.getDisplayToActualSizeRatio = function() {
    var actualWidth = this.getSize().width;
    var displayWidth = this.getDisplaySize().width;

    return displayWidth / actualWidth;
};

sc.canvas.FabricCanvas.prototype.objectContainsPoint = function(target, event) {
    var canvas = this.group.canvas;

    var pointer = canvas.getPointer(event);
    var xy = canvas._normalizePointer(target, pointer);
    var x = (xy.x - this.group.get('left')) / this.group.get('scaleX');
    var y = (xy.y - this.group.get('top')) / this.group.get('scaleY');

    // http://www.geog.ubc.ca/courses/klink/gis.notes/ncgia/u32.html
    // http://idav.ucdavis.edu/~okreylos/TAship/Spring2000/PointInPolygon.html
    
    if (!target.oCoords) {
        return false;
    }

    // we iterate through each object. If target found, return it.
    var iLines = target._getImageLines(target.oCoords);
    var xpoints = target._findCrossPoints(x, y, iLines);

    // if xcount is odd then we clicked inside the object
    // For the specific case of square images xcount === 1 in all true cases
    if ((xpoints && xpoints % 2 === 1) || target._findTargetCorner(event, canvas._offset)) {
        return true;
    }
    else {
        return false;
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
sc.canvas.FabricCanvas.prototype.canvasToProportionalCoord = function(x, y) {
    if (y == null) {
        y = x.y;
        x = x.x;
    }

    return {
        'x': x / this.size.width,
        'y': y / this.size.height
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
sc.canvas.FabricCanvas.prototype.proportionalToCanvasCoord = function(x, y) {
    if (y == null) {
        y = x.y;
        x = x.x;
    }

    return {
        'x': x * this.size.width,
        'y': y * this.size.height
    };
};
