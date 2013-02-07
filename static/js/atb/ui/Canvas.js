goog.provide('atb.ui.Canvas');

goog.require('Raphael');

goog.require('goog.dom.DomHelper');
goog.require('goog.math.Size');
goog.require('goog.math.Coordinate');
goog.require('goog.structs.Map');

/**
 * An SVG or VML Canvas to represent images and markers
 *
 * @param clientApp {atb.ClientApp}
 * @param displaySize {goog.math.Size} The size of the desired representation in the dom in pixels
 * @param opt_domHelper {goog.dom.DomHelper}
 * @param opt_canvas {atb.resource.CanvasResource} An optional canvas to be loaded immediately
 */
atb.ui.Canvas = function (clientApp, displaySize, opt_domHelper, opt_canvas) {
    this.clientApp = clientApp;
    this.webService = clientApp.getWebService();
    this.crawler = clientApp.getResourceCrawler();
    this.domHelper = opt_domHelper || new goog.dom.DomHelper();
    
    this.baseDiv = this.domHelper.createDom('div', {'class': 'atb-Canvas'});
    
    this.displaySize = displaySize;
    
    this.paper = Raphael(this.baseDiv, this.displaySize.width, this.displaySize.height);
    
    this.elementsById = new goog.structs.Map();
    
    if (opt_canvas) {
        this.loadCanvas(opt_canvas);
    }
};

/**
 * Resizes the canvas
 *
 * @param size {goog.math.Size}
 */
atb.ui.Canvas.prototype.resize = function (size) {
    this.paper.setSize(size.width, size.height);
};

atb.ui.Canvas.prototype.render = function (div) {
    div.appendChild(this.baseDiv);
};

/**
 * Loads and displays a canvas resource
 *
 * @param canvas {atb.resource.CanvasResource}
 * @param opt_loadMarkers {Boolean} true to automatically load all markers
 */
atb.ui.Canvas.prototype.loadCanvas = function (canvas, opt_loadMarkers) {
    this.canvasResource = canvas;
    
    this.canvasSize = canvas.getSize();
    
    var defaultImage = canvas.getDefaultImage();
    var srcUrl = this.webService.resourceImageURI(canvas.getId(), canvas.getDefaultImageId(), this.canvasSize);
    this.addImage(srcUrl, new goog.math.Size(defaultImage.width, defaultImage.height));
    
    this.zoomOut();
    
    if (opt_loadMarkers) {
        this.loadAllMarkersOnCanvas(canvas);
    }
};

/**
 * Zooms the canvas out to show the entire image
 */
atb.ui.Canvas.prototype.zoomOut = function () {
    var longestSideLength = this.canvasSize.getLongest();
    
    var leftOffset = (longestSideLength - this.canvasSize.width) / 2;
    var topOffset = (longestSideLength - this.canvasSize.height) / 2;
    
    this.paper.setViewBox(-1*leftOffset, -1*topOffset, longestSideLength, longestSideLength);
};

/**
 * Zooms the canvas to the specified bounds
 */
atb.ui.Canvas.prototype.zoomToBounds = function (bounds) {
    bounds = this.normalizeBounds(bounds);
    
    var x = bounds.left;
    var y = bounds.top;
    
    var w = bounds.right - bounds.left;
    var h = bounds.bottom - bounds.top;
    
    var size = new goog.math.Size(w, h);
    var longestSideLength = size.getLongest();
    
    this.paper.setViewBox(x, y, longestSideLength, longestSideLength);
};

/**
 * Crawls for all markers on the given canvas and adds them to the canvas
 *
 * @param canvas {atb.resource.CanvasResource}
 * @param opt_doAfter {Function}
 * @param opt_scope {Object}
 */
atb.ui.Canvas.prototype.loadAllMarkersOnCanvas = function (canvas, opt_doAfter, opt_scope) {
    var afterMarkersLoaded = function () {
        var markers = this.crawler.getResources(canvas.getMarkerIds());
        
        this.addMarkers(markers);
        
        if (opt_doAfter) {
            atb.Util.scopeAsyncHandler(opt_doAfter, opt_scope)();
        }
    };
    
    this.crawler.crawl(canvas.getId(), null, afterMarkersLoaded, this);
};

/**
 * Adds a marker resource to the canvas
 *
 * @param marker {atb.resource.MarkerResource}
 */
atb.ui.Canvas.prototype.addMarker = function (marker) {
    var shapeType = marker.getShapeType();
    var shapeData = marker.getShapeData();
    
    var elementArr = this.paper.add([this.createRaphaelJSONFromShapeData(shapeType, shapeData)]);
    var element = elementArr[0];
    
    this.elementsById.set(marker.getId(), element);
};

/**
 * Adds marker resources to the canvas
 *
 * @param markers {Array.<atb.resource.MarkerResource>}
 */
atb.ui.Canvas.prototype.addMarkers = function (markers) {
    var jsonArr = [];
    
    for (var i=0, len=markers.length; i<len; i++) {
        var marker = markers[i];
        
        jsonArr.push(this.createRaphaelJSONFromShapeData(marker.getShapeType(), marker.getShapeData()));
    }
    
    var elementArr = this.paper.add(jsonArr);
    
    for (var i=0, len=elementArr.length; i<len; i++) {
        var marker = markers[i];
        var element = elementArr[i];
        
        this.elementsById.set(marker.getId(), element);
    }
};

/**
 * Adds an image to the canvas
 *
 * @param src {String} image source url
 * @param size {goog.math.Size}
 */
atb.ui.Canvas.prototype.addImage = function (src, size) {
    var image = this.paper.image(src, 0, 0, size.width, size.height);
};

/**
 * Removes the marker with the given id from the canvas, and returns true if it was successfully removed
 *
 * @param id {String}
 * @return {Boolean}
 */
atb.ui.Canvas.prototype.removeMarkerById = function (id) {
    var element = this.elementsById.get(id);
    
    if (!element) {
        return false;
    }
    else {
        element.remove();
        this.elementsById.remove(id);
        
        return true;
    }
};

/**
 * Removes the markers with the given ids from the canvas
 *
 * @param ids {Array.<String>}
 */
atb.ui.Canvas.prototype.removeMarkersByIds = function (ids) {
    for (var i=0, len=ids.length; i<len; i++) {
        this.removeMarkerById(ids[i]);
    }
};

/**
 * Flips the y coordinate (non-destructive)
 *
 * @param coordinate {goog.math.Coordinate}
 * @return {goog.math.Coordinate}
 */
atb.ui.Canvas.prototype.normalizeCoordinate = function (coordinate) {
    var x = coordinate.x;
    var y = coordinate.y;
    
    // Flip the y coordinate
    y = this.canvasSize.height - y;
    
    return new goog.math.Coordinate(x, y);
};

/**
 * Flips the y axis values of the bounds
 * @param bounds {OpenLayers.Bounds}
 * @param mapSize {goog.math.Size}
 */
atb.ui.Canvas.prototype.normalizeBounds = function (bounds) {
    var topLeftCoord = this.normalizeCoordinate(new goog.math.Coordinate(bounds.left, bounds.top));
    var bottomRightCoord = this.normalizeCoordinate(new goog.math.Coordinate(bounds.right, bounds.bottom));
    
    var newBounds = {
        bottom: bottomRightCoord.y,
        left: topLeftCoord.x,
        right: bottomRightCoord.x,
        top: topLeftCoord.y
    };
    
    var boundsSize = new goog.math.Size(newBounds.right - newBounds.left, newBounds.bottom - newBounds.top);
    var longestSideLength = boundsSize.getLongest();
    
    var leftOffset = (longestSideLength - boundsSize.width) / 2;
    var topOffset = (longestSideLength - boundsSize.height) / 2;
    
    newBounds.bottom -= topOffset;
    newBounds.top -= topOffset;
    newBounds.left -= leftOffset;
    newBounds.right -= leftOffset;
    
    return newBounds;
};

/**
 * Generates a Raphael formatted shape json object from a atb.resource.MarkerResource object's shape type and shape data
 *
 * @param shapeType {String} point, line, or polygon
 * @param shapeData {Object}
 * @return {Object}
 * @throws if shape type is unsupported
 */
atb.ui.Canvas.prototype.createRaphaelJSONFromShapeData = function (shapeType, shapeData) {
    var obj = {};
    var points = shapeData.points;
    var coords = [];
    
    if (shapeType == 'point') {
        obj['type'] = 'circle';
        
        var originalCoord = new goog.math.Coordinate(shapeData.cx, shapeData.cy);
        var normalizedCoord = this.normalizeCoordinate(originalCoord);
        
        obj['cx'] = normalizedCoord.x;
        obj['cy'] = normalizedCoord.y;
        
        var radius = shapeData.radius;
        obj['r'] = radius;
    }
    else if (shapeType == 'line' || shapeType == 'polygon') {
        obj['type'] = 'path';
        
        for (var i=0, len=points.length; i<len; i++) {
            var originalCoord = new goog.math.Coordinate(points[i][0], points[i][1]);
            var normalizedCoord = this.normalizeCoordinate(originalCoord);
            
            coords.push(normalizedCoord);
        }
    }
    else {
        throw "Unsupported shape type in convertResourceShapeDataToRaphaelJson()";
    }
    
    if (shapeType == 'line') {
        obj['path'] = this.createPathCommandsFromCoordinates(coords, false);
    }
    else if (shapeType == 'polygon') {
        obj['path'] = this.createPathCommandsFromCoordinates(coords, true);
    }
    
    obj['stroke'] = shapeData.strokeColor;
    obj['stroke-width'] = shapeData.stroke;
    obj['stroke-opacity'] = shapeData.strokeOpacity;
    obj['fill'] = shapeData.fill;
    obj['fill-opacity'] = shapeData.fillOpacity;
    
    obj['stroke-linecap'] = 'round';
    obj['stroke-linejoin'] = 'round';
    
    return obj;
};

/**
 * Generates a string of SVG path commands from an array of coordinates
 *
 * @param points {Array.<goog.math.Coordinate>}
 * @param closePath {Boolean} true if the path should be closed to create a polygon, false if the path should represent a polyline
 * @return {String}
 */
atb.ui.Canvas.prototype.createPathCommandsFromCoordinates = function (points, closePath) {
    var commands = '';
    
    // Move to the first point
    commands += 'M' + points[0].x + ' ' + points[0].y + ' ';
    
    // Line to all other points
    for (var i=1, len=points.length; i<len; i++) {
        commands += 'L' + points[i].x + ' ' + points[i].y + ' ';
    }
    
    if (closePath) {
        commands += 'Z';
    }
    else {
        for (var i=points.length-2; i>=0; i--) {
            commands += 'L' + points[i].x + ' ' + points[i].y + ' ';
        }
        
        commands += 'Z';
    }
    
    return commands;
};