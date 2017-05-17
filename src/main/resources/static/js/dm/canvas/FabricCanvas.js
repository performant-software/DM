goog.provide('dm.canvas.FabricCanvas');

goog.require('fabric');
goog.require('goog.events.EventTarget');
goog.require('goog.math.Size');
goog.require('goog.math.Coordinate');
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
dm.canvas.FabricCanvas = function(uri, databroker, size) {
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
    this.displayToActualSizeRatio = 1;
    this.offset = new goog.math.Coordinate(0, 0);

    this.objects = [];
    this.objectsByUri = new goog.structs.Map();
    this.urisByObject = new goog.structs.Map();

    this.imageOptionUris = [];
    this.imagesBySrc = new goog.structs.Map();
    this.imageSrcsInProgress = new goog.structs.Set();
    this.textsByUri = new goog.structs.Map();
     
    /**
     * @type {dm.canvas.FabricCanvasViewport}
     */
    this.viewport = null;

    this.segmentUris = new goog.structs.Set();
};
goog.inherits(dm.canvas.FabricCanvas, goog.events.EventTarget);

/**
 * @enum
 * An enumeration of common rdf predicates and types
 */
dm.canvas.FabricCanvas.RDF_ENUM = {
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
    hasBody: ['oa:hasBody'],
    hasTarget: ['oa:hasTarget'],
    cntChars: ['cnt:chars'],
    cnt08Chars: ['cnt08:chars'],
    constrainedBody: ['oa:ConstrainedBody'],
    constrainedTarget: ['oa:ConstrainedTarget'],
    constrains: 'oa:constrains',
    constrainedBy: 'oa:constrainedBy',
    commentAnno: 'dms:CommentAnnotation',
    title: ['dc:title', 'rdfs:label']
};

/**
 * The default styles to be applied to features on the canvas
 */
dm.canvas.FabricCanvas.DEFAULT_FEATURE_STYLES = {
    fill: 'rgba(15, 108, 214, 0)',
    stroke: 'rgba(3, 75, 158, 0.7)',
    strokeWidth: 5,
    selectable: false,
    perPixelTargetFind: true
};

/**
 * These styles should even override what is specified in saved feature data.
 */
dm.canvas.FabricCanvas.GLOBAL_FEATURE_STYLES = {
    selectable: false,
    perPixelTargetFind: true,
    minScaleLimit: 0
};

dm.canvas.FabricCanvas.DEFAULT_TEXT_STYLE = {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    textBackgroundColor: 'rgba(3, 75, 158, 0.6)',
    fontFamily: 'Helvetica, Arial, Sans-Sefif',
    opacity: 1
};

dm.canvas.FabricCanvas.prototype.clone = function() {
    //TODO
};

/**
 * Returns the uri of this canvas resource.
 *
 * @return {string} The uri of the canvas.
 */
dm.canvas.FabricCanvas.prototype.getUri = function() {
    return this.uri;
};

/**
 *
 * @param {Number} x The top left x coordinate of the text box.
 * @param {Number} y The top left y coordinate of the text box.
 * @param {Number} width The width of the text box.
 * @param {Number} height The height of the text box.
 * @param {string} text The contents of the text box.
 * @param {string} uri The uri of the resource.
 */
dm.canvas.FabricCanvas.prototype.addTextBox = function(x, y, width, height, text, uri) {
    var t = new fabric.Text(text, dm.canvas.FabricCanvas.GLOBAL_FEATURE_STYLES);
    t.set(dm.canvas.FabricCanvas.DEFAULT_TEXT_STYLE);

    var currentSize = new goog.math.Size(t.get('width'), t.get('height'));
    var desiredSize = new goog.math.Size(width, height);
    var renderedSize = currentSize.clone().scaleToFit(desiredSize);
    t.scale(renderedSize.width / currentSize.width);

    t.set({
        left: x + desiredSize.width / 2,
        top: y + desiredSize.height / 2
    });

    this._scaleAndPositionNewFeature(t);

    if (! uri) uri = this.databroker.createUuid();
    this.textsByUri.set(uri, t);
    this.addFabricObject(t, uri);

    return t;
};

dm.canvas.FabricCanvas.prototype.showTextAnnos = function() {
    this.isShowingTextAnnos = true;

    goog.structs.forEach(this.textsByUri, function(text, uri) {
        text.set('visible', true).set('opacity', 1);
    }, this);

    this.requestFrameRender();
};

dm.canvas.FabricCanvas.prototype.hideTextAnnos = function() {
    this.isShowingTextAnnos = false;

    goog.structs.forEach(this.textsByUri, function(text, uri) {
        text.set('visible', false);
    }, this);

    this.requestFrameRender();
};

/**
 * The speed in ms at which objects being hidden or shown should animate.
 * @const
 */
dm.canvas.FabricCanvas.FADE_SPEED = 300;

dm.canvas.FabricCanvas.prototype.fadeTextAnnosToOpacity = function(opacity) {
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
            duration: dm.canvas.FabricCanvas.FADE_SPEED
        };

        if (opacity == 0) {
            params.onComplete = this.hideTextAnnos.bind(this);
        }

        text.animate('opacity', opacity, params);
    }, this);
};

dm.canvas.FabricCanvas.MARKER_TYPES = new goog.structs.Set([
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

dm.canvas.FabricCanvas.prototype.showObject = function(obj) {
    obj.set('visible', true);

    this.fireShownFeature(obj, this.getFabricObjectUri(obj));
};

dm.canvas.FabricCanvas.prototype.hideObject = function(obj) {
    obj.set('visible', false);

    this.fireHiddenFeature(obj, this.getFabricObjectUri(obj));
};

dm.canvas.FabricCanvas.prototype.showMarkers = function() {
    goog.structs.forEach(this.objectsByUri, function(obj, uri) {
        if (dm.canvas.FabricCanvas.MARKER_TYPES.contains(obj.type)) {
            this.showObject(obj);
        }
    }, this);

    this.requestFrameRender();
};

dm.canvas.FabricCanvas.prototype.hideMarkers = function() {
    goog.structs.forEach(this.objectsByUri, function(obj, uri) {
        if (dm.canvas.FabricCanvas.MARKER_TYPES.contains(obj.type)) {
            this.hideObject(obj);
        }
    }, this);

    this.requestFrameRender();
};

dm.canvas.FabricCanvas.prototype.isHidingAllMarkers = function() {
    return goog.structs.every(this.objectsByUri, function(obj, uri) {
        if (dm.canvas.FabricCanvas.MARKER_TYPES.contains(obj.type) && 
            obj.get('visible') === true) {
            return false;
        }
        else {
            return true;
        }
    }, this);
};

dm.canvas.FabricCanvas.prototype.getNumMarkers = function() {
    var count = 0;

    goog.structs.forEach(this.objectsByUri, function(obj, uri) {
        if (dm.canvas.FabricCanvas.MARKER_TYPES.contains(obj.type) && obj.get('opacity') != 0) {
            count ++;
        }
    }, this);

    return count;
};

/**
 * Adds a databroker image resource object to the canvas.
 *
 * @param {dm.data.Resource} resourceObject The image resource object.
 * @param {?object} opt_coords an object with x and y coordinates (defaults to
 * (0,0)) representing the location to draw the image.
 */
dm.canvas.FabricCanvas.prototype.addImageResource = function(resource, opt_coords) {
    var size = new goog.math.Size(
        Number(resource.getOneProperty(dm.canvas.FabricCanvas.RDF_ENUM.width)),
        Number(resource.getOneProperty(dm.canvas.FabricCanvas.RDF_ENUM.height))
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

dm.canvas.FabricCanvas.prototype.setFeatureCoords = function(feature, x, y) {
    if (y == null) {
        y = x.y;
        x = x.x;
    }

    x += feature.getBoundingRectWidth() / 2;
    y += feature.getBoundingRectHeight() / 2;

    feature.set('left', x).set('top', y);
};

dm.canvas.FabricCanvas.prototype.getFeatureCoords = function(feature) {
    var x = feature.get('left');
    var y = feature.get('top');

    var featureTopLeftCoords = dm.canvas.FabricCanvas.toTopLeftCoords(x, y,
        feature.getBoundingRectWidth(), feature.getBoundingRectHeight());

    x = featureTopLeftCoords.x;
    y = featureTopLeftCoords.y;

    return {
        x: x,
        y: y
    };
};

dm.canvas.FabricCanvas.prototype.addFabricObject = function(obj, uri, opt_noEvent) {
    if (uri == null) {
        uri = this.databroker.createUuid();
    }

    if (this.hasFeature(uri)) {
        throw "Fabric Object with uri " + uri + " has already been added to the canvas";
    }

    this.objects.push(obj);

    this.objectsByUri.set(uri, obj);
    this.urisByObject.set(goog.getUid(obj), uri);

    if (!opt_noEvent) {
        this.fireAddedFeature(obj, uri);
    }

    return this;
};

dm.canvas.FabricCanvas.prototype.hasFeature = function(uri) {
    return this.objectsByUri.containsKey(uri);
};

dm.canvas.FabricCanvas.prototype.removeFabricObject = function(obj, opt_noEvent) {
    goog.asserts.assert(obj != null, 'Attempting to remove a null object from a canvas');

    goog.array.remove(this.objects, obj);

    var uri = this.getFabricObjectUri(obj);
    this.objectsByUri.remove(uri);
    this.urisByObject.remove(goog.getUid(obj));

    if (!opt_noEvent) {
        this.fireRemovedFeature(obj, uri);
    }

    return this;
};

dm.canvas.FabricCanvas.prototype.bringObjectToFront = function(obj) {
    goog.array.remove(this.objects, obj);
    this.objects.push(obj);

    this.requestFrameRender();
};

dm.canvas.FabricCanvas.prototype.sendObjectToBack = function(obj) {
    goog.array.remove(this.objects, obj);

    goog.array.insertAt(this.objects, obj, 0);

    this.requestFrameRender();
};

dm.canvas.FabricCanvas.prototype.removeObjectByUri = function(uri, opt_noEvent) {
    var obj = this.objectsByUri.get(uri);

    return this.removeFabricObject(obj, opt_noEvent);
};

dm.canvas.FabricCanvas.prototype.getFabricObjectUri = function(obj) {
    if (obj == null) {
        return null;
    }
    else {
        return this.urisByObject.get(goog.getUid(obj));
    }
};

dm.canvas.FabricCanvas.prototype.getFabricObjectByUri = function(uri) {
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
dm.canvas.FabricCanvas.prototype.addImage = function(src, size, opt_coords, opt_callback) {
    if (this.imageSrcsInProgress.contains(src)) {
        return;
    }

    this.imageSrcsInProgress.add(src);

    if (this.imagesBySrc.containsKey(src)) {
        var image = this.imagesBySrc.get(src);
        goog.array.remove(this.objects, image);
    }

    var x = 0, y = 0;

    if (opt_coords) {
        x = opt_coords.x;
        y = opt_coords.y;
    }

    fabric.Image.fromURL(src, function(image) {
        this.imagesBySrc.set(src, image);
        this.imageSrcsInProgress.remove(src);

        image.set('selectable', false);
        image.set('perPixelTargetFind', false);

        if (! size.isEmpty()) {
            image.set('scaleX', size.width / image.get('width'));
            image.set('scaleY', size.height / image.get('height'));
        }

        this._scaleAndPositionNewFeature(image);
        image.set({
            left: image.getBoundingRectWidth() / 2 + x * this.displayToActualSizeRatio + this.offset.x,
            top: image.getBoundingRectHeight() / 2 + y * this.displayToActualSizeRatio + this.offset.y
        });

        if (this.hasFeature(src)) {
            this.removeObjectByUri(src);
        }

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
dm.canvas.FabricCanvas.prototype.chooseImage = function(uri) {
    if (! this.imagesBySrc.containsKey(uri)) {
        return false;
    }

    var image = this.imagesBySrc.get(uri);

    goog.structs.forEach(this.imagesBySrc, function(image, src) {
        goog.array.remove(this.objects, image);
    }, this);

    goog.array.insertAt(this.objects, image, 0);

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
dm.canvas.FabricCanvas.prototype.addRect = function(x, y, width, height, uri) {
    var rect = new fabric.Rect(dm.canvas.FabricCanvas.DEFAULT_FEATURE_STYLES);
    rect.set({
        width: width,
        height: height
    });
    this.setFeatureCoords(rect, x, y);

    this._scaleAndPositionNewFeature(rect);

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
dm.canvas.FabricCanvas.prototype.addCircle = function(cx, cy, r, uri) {
    var circle = new fabric.Circle(dm.canvas.FabricCanvas.DEFAULT_FEATURE_STYLES);
    circle.set({
        r: r
    });
    this.setFeatureCoords(circle, cx + r/2, cy + r/2);

    this._scaleAndPositionNewFeature(circle);

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
dm.canvas.FabricCanvas.prototype.addEllipse = function(cx, cy, rx, ry, uri) {
    var ellipse = new fabric.Ellipse(dm.canvas.FabricCanvas.DEFAULT_FEATURE_STYLES);
    ellipse.set({
        left: cx,
        top: cy,
        width: rx,
        height: ry,
        rx: rx,
        ry: ry
    });

    this._scaleAndPositionNewFeature(ellipse);

    this.addFabricObject(ellipse, uri);

    return ellipse;
};

dm.canvas.FabricCanvas.prototype.getFeatureBoundingBox = function(feature) {
    feature = this.getCanvasSizedFeatureClone(feature);

    var width = feature.getBoundingRectWidth();
    var height = feature.getBoundingRectHeight();

    var x = feature.get('left') - width / 2;
    var y = feature.get('top') - height / 2;

    return {
        width: width,
        height: height,
        x: x,
        y: y
    };
};

dm.canvas.FabricCanvas.getPointsBoundingBox = function(points) {
    var utilMin = fabric.util.array.min;
    var utilMax = fabric.util.array.max;

    var xBounds = [];
    var yBounds = [];

    goog.structs.forEach(points, function(point) {
        xBounds.push(Number(point.x));
        yBounds.push(Number(point.y));
    }, this);

    var box = {
        x1: utilMin(xBounds),
        y1: utilMin(yBounds),
        x2: utilMax(xBounds),
        y2: utilMax(yBounds)
    };

    box.width = box.x2 - box.x1;
    box.height = box.y2 - box.y1;

    return box;
};

dm.canvas.FabricCanvas.convertPointsToSVGPathCommands = function(points, opt_smooth, opt_boundingBox, opt_close) {
    var fabricPoints = [];
    goog.structs.forEach(points, function(pt) {
        fabricPoints.push(new fabric.Point(pt.x, pt.y));
    }, this);

    var boundingBox = opt_boundingBox || dm.canvas.FabricCanvas.getPointsBoundingBox(points);

    var pathCommands = [];
    var p1 = new fabric.Point(fabricPoints[0].x - boundingBox.x1, fabricPoints[0].y - boundingBox.y1);
    if (points.length > 1) {
        var p2 = new fabric.Point(fabricPoints[1].x - boundingBox.x1, fabricPoints[1].y - boundingBox.y1);
    }

    pathCommands.push('M ', fabricPoints[0].x - boundingBox.x1, ' ', fabricPoints[0].y - boundingBox.y1, ' ');
    for (var i = 1, len = fabricPoints.length; i < len; i++) {
        // p1 is our bezier control point
        // midpoint is our endpoint
        // start point is p(i-1) value.
        if (opt_smooth) {
            var midPoint = p1.midPointFrom(p2);
            path.push('Q ', p1.x, ' ', p1.y, ' ', midPoint.x, ' ', midPoint.y, ' ');
        }
        else {
            pathCommands.push('L ', p1.x, ' ', p1.y, ' ');
        }
        p1 = new fabric.Point(fabricPoints[i].x - boundingBox.x1, fabricPoints[i].y - boundingBox.y1);
        if ((i+1) < fabricPoints.length) {
            p2 = new fabric.Point(fabricPoints[i+1].x - boundingBox.x1, fabricPoints[i+1].y - boundingBox.y1);
        }
    }
    pathCommands.push('L ', p1.x, ' ', p1.y, ' ');

    if (opt_close) {
        pathCommands.push('Z');
    }

    return pathCommands.join('');
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
dm.canvas.FabricCanvas.prototype.addPolyline = function(points, uri) {
    var line = new fabric.Polyline(points);
    line.set(dm.canvas.FabricCanvas.DEFAULT_FEATURE_STYLES);

    this._scaleAndPositionNewFeature(line);

    this.addFabricObject(line, uri);

    return line;
};

dm.canvas.FabricCanvas.prototype.addPath = function(pathCommands, uri) {
    var path = new fabric.Path(pathCommands);
    path.set(dm.canvas.FabricCanvas.DEFAULT_FEATURE_STYLES);

    this._scaleAndPositionNewFeature(path);

    this.addFabricObject(path, uri);

    return path;
};

dm.canvas.FabricCanvas.prototype.updatePath = function(path, pathCommands) {
    this.removeFabricObject(path, true);
    var uri = this.getFabricObjectUri(path);

    path = new fabric.Path(pathCommands);
    path.set(dm.canvas.FabricCanvas.DEFAULT_FEATURE_STYLES); // In the future, this should copy the old path's styles

    this._scaleAndPositionNewFeature(path);

    this.addFabricObject(path, uri, true); // In the future, this should ensure that the path remains at the same z-index

    return path;
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
dm.canvas.FabricCanvas.prototype.addPolygon = function(points, uri) {
    var polygon = new fabric.Polygon(points);
    polygon.set(dm.canvas.FabricCanvas.DEFAULT_FEATURE_STYLES);

    this._scaleAndPositionNewFeature(polygon);

    this.addFabricObject(polygon, uri);

    return polygon;
};

/**
 * Adds a feature to the canvas from a string in the svg feature format
 * (e.g., <path d="m 1 2..." />).
 *
 * @param {string} str The svg feature tag.
 * @param {string} uri The uri of the feature.
 * @return {fabric.Object|null} The fabric element created, or null if
 * the feature type is unrecognized.
 */
dm.canvas.FabricCanvas.prototype.addFeatureFromSVGString = function(str, uri) {
    var svgDoc = 
        '<?xml version="1.0" standalone="no"?>'
        + '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN"'
        + ' "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">'
        + ' <svg xmlns="http://www.w3.org/2000/svg" version="1.1">'
        + str
        + '</svg>';

    fabric.loadSVGFromString(svgDoc, function(objects, options) {
        var obj = objects[0];

        if (obj.transformMatrix) {
            var transformMatrix = obj.transformMatrix;
            delete obj.transformMatrix;

            obj.set('left', obj.get('left') + transformMatrix[4]);
            obj.set('top', obj.get('top') + transformMatrix[5]);
        }

        obj.set(dm.canvas.FabricCanvas.GLOBAL_FEATURE_STYLES);
        if (obj.isType('image')) {
            obj.set('perPixelTargetFind', false);
        }

        this._scaleAndPositionNewFeature(obj);

        this.addFabricObject(obj, uri);

        this.requestFrameRender();
    }.bind(this));
};


/**
 * Takes a string of points in the svg polyline or polygon format, and returns
 * an array of point objects.
 *
 * @param {string} str e.g. "50,375 150,375 150,325".
 * @return {Array.<Object>} An array of objects with x and y properties.
 */
dm.canvas.FabricCanvas.pointsStringToPointsArray = function(str) {
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

dm.canvas.FabricCanvas.prototype.fireAddedFeature = function(feature, uri) {
    var event = new goog.events.Event('featureAdded', this);

    event.uri = uri;
    event.feature = feature;
    event.canvas = this;

    this.dispatchEvent(event);
};

dm.canvas.FabricCanvas.prototype.fireRemovedFeature = function(feature, uri) {
    var event = new goog.events.Event('featureRemoved', this);

    event.uri = uri;
    event.feature = feature;
    event.canvas = this;

    this.dispatchEvent(event);
};

dm.canvas.FabricCanvas.prototype.fireModifiedFeature = function(feature, uri) {
    var event = new goog.events.Event('featureModified', this);

    event.uri = uri;
    event.feature = feature;
    event.canvas = this;

    this.dispatchEvent(event);
};

dm.canvas.FabricCanvas.prototype.fireShownFeature = function(feature, uri) {
    var event = new goog.events.Event('featureShown', this);

    event.uri = uri;
    event.feature = feature;
    event.canvas = this;

    this.dispatchEvent(event);
};

dm.canvas.FabricCanvas.prototype.fireHiddenFeature = function(feature, uri) {
    var event = new goog.events.Event('featureHidden', this);

    event.uri = uri;
    event.feature = feature;
    event.canvas = this;

    this.dispatchEvent(event);
};

dm.canvas.FabricCanvas.prototype.requestFrameRender = function() {
    if (this.viewport) {
        this.viewport.requestFrameRender();
    }
};

dm.canvas.FabricCanvas.prototype.pauseRendering = function() {
    if (this.viewport) {
        this.viewport.pauseRendering();
    }
};

dm.canvas.FabricCanvas.prototype.resumeRendering = function() {
    if (this.viewport) {
        this.viewport.resumeRendering();
    }
};

/**
 * Gets the actual size in pixels of the full-size canvas.
 *
 * @return {goog.math.Size} The actual size of the canvas.
 */
dm.canvas.FabricCanvas.prototype.getSize = function() {
    return this.size;
};

/**
 * Determines whether this canvas knows its position in a specific sequence of
 * canvases in order to allow page flipping.
 *
 * @return {boolean} True if the canvas knows the list of canvases and its index
 * in that list.
 */
dm.canvas.FabricCanvas.prototype.knowsSequenceInformation = function() {
    return this.urisInOrder != null && this.currentIndex != null;
};

/**
 * Gets the size in screen pixels at which the canvas is being displayed
 * within the viewport.
 *
 * @return {goog.math.Size} The size at which the canvas is being displayed.
 */
dm.canvas.FabricCanvas.prototype.getDisplaySize = function() {
    return new goog.math.Size(
        this.size.width * this.displayToActualSizeRatio,
        this.size.height * this.displayToActualSizeRatio
    );
};

/**
 * Returns the ratio of the display size of the canvas to the actual size of the
 * canvas.
 * @return {number} display width / actual width
 */
dm.canvas.FabricCanvas.prototype.getDisplayToActualSizeRatio = function() {
    return this.displayToActualSizeRatio;
};

dm.canvas.FabricCanvas.prototype.setDisplayToActualSizeRatio = function(ratio) {
    goog.asserts.assert(ratio !== 0, 'Display to actual size ratio cannot be 0');
    ratio = Math.abs(ratio);

    goog.structs.forEach(this.objects, function(obj) {
        obj.set({
            scaleX: (obj.get('scaleX') / this.displayToActualSizeRatio) * ratio,
            scaleY: (obj.get('scaleY') / this.displayToActualSizeRatio) * ratio,
            left: (obj.get('left') / this.displayToActualSizeRatio) * ratio,
            top: (obj.get('top') / this.displayToActualSizeRatio) * ratio
        });
    }, this);

    this.offset.x = (this.offset.x / this.displayToActualSizeRatio) * ratio;
    this.offset.y = (this.offset.y / this.displayToActualSizeRatio) * ratio;

    this.displayToActualSizeRatio = ratio;
};

dm.canvas.FabricCanvas.prototype._scaleAndPositionNewFeature = function(feature) {
    feature.set({
        scaleX: feature.get('scaleX') * this.displayToActualSizeRatio,
        scaleY: feature.get('scaleY') * this.displayToActualSizeRatio,
        left: feature.get('left') * this.displayToActualSizeRatio + this.offset.x,
        top: feature.get('top') * this.displayToActualSizeRatio + this.offset.y
    });
};

dm.canvas.FabricCanvas.prototype.getCanvasSizedFeatureClone = function(feature) {
    var newFeature = feature.clone();

    newFeature.set({
        scaleX: feature.get('scaleX') / this.displayToActualSizeRatio,
        scaleY: feature.get('scaleY') / this.displayToActualSizeRatio,
        left: (feature.get('left') - this.offset.x) / this.displayToActualSizeRatio,
        top: (feature.get('top') - this.offset.y) / this.displayToActualSizeRatio
    });

    return newFeature;
};

dm.canvas.FabricCanvas.prototype.getOffset = function() {
    return this.offset;
};

dm.canvas.FabricCanvas.prototype.setOffset = function(x, y) {
    if (y == null) {
        y = x.y;
        x = x.x;
    }

    goog.structs.forEach(this.objects, function(obj) {
        obj.set({
            left: Number(obj.get('left')) - this.offset.x + x,
            top: Number(obj.get('top')) - this.offset.y + y
        });
    }, this);

    this.offset = new goog.math.Coordinate(x, y);
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
dm.canvas.FabricCanvas.prototype.canvasToProportionalCoord = function(x, y) {
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
dm.canvas.FabricCanvas.prototype.proportionalToCanvasCoord = function(x, y) {
    if (y == null) {
        y = x.y;
        x = x.x;
    }

    return {
        'x': x * this.size.width,
        'y': y * this.size.height
    };
};

dm.canvas.FabricCanvas.toCenteredCoords = function(x, y, width, height) {
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
