goog.provide('sc.canvas.FeatureControl');

goog.require('sc.canvas.Control');

/**
 * Base class for CanvasViewport controls which deal with svg features.
 *
 * @author tandres@drew.edu (Tim Andres)
 *
 * @constructor
 * @extends {sc.canvas.Control}
 *
 * @param {sc.canvas.CanvasViewport} viewport The viewport to control.
 * @param {sc.data.Databroker} databroker The databroker from which to request
 * new uris and post new shape data.
 */
sc.canvas.FeatureControl = function(viewport, databroker) {
    sc.canvas.Control.call(this, viewport);
    
    /** @type {sc.data.Databroker} */
    this.databroker = databroker;
    
    this.resetFeature();
    
    this.shouldSaveChanges = true;
};
goog.inherits(sc.canvas.FeatureControl, sc.canvas.Control);

sc.canvas.FeatureControl.prototype.resetFeature = function() {
    /**
     * The current feature being drawn.
     * @type {(Raphael.Element|null)}
     */
    this.feature = null;
    
    /**
     * The uri for the feature being drawn
     * @type {string}
     */
    this.uri = this.databroker.createUuid();
};

sc.canvas.FeatureControl.prototype.updateFeatureCoords = function() {
    this.feature.setCoords();
    if (this.feature._calcDimensions) {
        this.feature._calcDimensions(true);
    }
};

/**
 * This method should be called when the shape of a feature is updated.
 */
sc.canvas.FeatureControl.prototype.updateFeature = function() {
    var event = new goog.events.Event(sc.canvas.DrawFeatureControl.
                                      EVENT_TYPES.updateFeature, this.uri);
    event.feature = this.feature;

    this.updateFeatureCoords();

    this.viewport.requestFrameRender();

    this.dispatchEvent(event);
};

/**
 * If a feature is currently being drawn, it will be returned; otherwise, null
 * will be returned.
 * @return {(Raphael.Element|null)} The in progress drawing element or null if
 * drawing is not in progress.
 */
sc.canvas.FeatureControl.prototype.getInProgressFeature = function() {
    return this.feature;
};

/**
 * Converts page coordinates (such as those from a mouse event) into coordinates
 * on the canvas. (Useful with jQuery events, which calculate pageX and pageY
 * using client coordinates and window scroll values).
 *
 * @see sc.canvas.CanvasViewport.prototype.pageToCanvasCoord
 *
 * @param {(number|Object)} x The page x coordinate or an object with x and y
 * properties.
 * @param {?number} y The page y coordinate.
 * @return {Object} An object with x and y properties.
 */
sc.canvas.FeatureControl.prototype.pageToCanvasCoord = function(x, y) {
    return this.viewport.pageToCanvasCoord(x, y);
};

/**
 * Converts client coordinates (such as those from a mouse event) into
 * coordinates on the canvas.
 *
 * @see sc.Canvas.CanvasViewport.prototype.canvasToPageCoord
 *
 * @param {(number|Object)} x The client x coordinate or an object with x and y
 * properties.
 * @param {?number} y The client y coordinate.
 * @return {Object} An object with x and y properties.
 */
sc.canvas.FeatureControl.prototype.clientToCanvasCoord = function(x, y) {
    return this.viewport.clientToCanvasCoord(x, y);
};

sc.canvas.FeatureControl.prototype.layerToCanvasCoord = function(x, y) {
    return this.viewport.layerToCanvasCoord(x, y);
};

/**
 * Takes a Raphael feature and converts it to a string representation of an svg
 * feature
 *
 * @return {string} The svg representation.
 */
sc.canvas.FeatureControl.prototype.exportFeatureToSvg = function() {
    var canvas = this.viewport.canvas;

    var featureClone = canvas.getCanvasSizedFeatureClone(this.feature);
    
    var svgString = featureClone.toSVG();
    svgString = svgString.replace(/\"/g, "'");

    return svgString;
};

/**
 * Sends the finished drawn feature data to the databroker as new triples
 */
sc.canvas.FeatureControl.prototype.sendFeatureToDatabroker = function() {
    if (! this.shouldSaveChanges) {
        return;
    }
    
    var svgString = this.exportFeatureToSvg();
    console.log("svgString: ", svgString);
    
    var contentUri = this.viewport.canvas.getFabricObjectUri(this.feature);
    var canvasUri = this.viewport.canvas.getUri();

    var selector = this.databroker.createResource(
        contentUri, 'oa:SvgSelector');
    selector.addType('cnt:ContentAsText');
    selector.addProperty('cnt:chars', '"' + svgString + '"');
    selector.addProperty('cnt:characterEncoding', '"UTF-8"');
    
    var specificResource = this.databroker.createResource(
        this.databroker.createUuid(), 'oa:SpecificResource');
    specificResource.addProperty('oa:hasSource', '<' + canvasUri + '>');
    specificResource.addProperty('oa:hasSelector', selector.bracketedUri);
    specificResource.addProperty('dc:creator', this.databroker.user);

    var annotation = this.databroker.createResource(null, 'oa:Annotation');
    annotation.addProperty('oa:hasTarget', specificResource.bracketedUri);
    annotation.addProperty('dc:creator', this.databroker.user);

    this.resetFeature();
};

/**
 * Returns the top left coordinates of the bounding box for a feature
 *
 * @return {Object} The x and y coordinates of the feature's bounding box.
 */
sc.canvas.FeatureControl.prototype.getFeatureCoordinates = function() {
    var feature = this.feature;
    
    return this.viewport.canvas.getFeatureCoords(feature);
};

/**
 * Effectively sets the x an y coordinates of the feature's bounding box using
 * transforms.
 *
 * @param {number} x The new x coordinate.
 * @param {number} y The new Y coordinate.
 */
sc.canvas.FeatureControl.prototype.setFeatureCoordinates = function(x, y) {
    var feature = this.feature;
    
    this.viewport.canvas.setFeatureCoords(feature, x, y);
};
/**
 * Sets whether the control should save its changes to the databroker.
 *
 * @param {boolean} b True to save changes, false to not.
 */
sc.canvas.FeatureControl.prototype.setShouldSaveChanges = function(b) {
    this.shouldSaveChanges = b;
};

/**
 * Toggles whether the control saves its changes to the databroker.
 *
 * @return {boolean} Whether the control will now save changes.
 */
sc.canvas.FeatureControl.prototype.toggleShouldSaveChanges = function() {
    this.setShouldSaveChanges(!this.shouldSaveChanges);
    
    return this.shouldSaveChanges;
};
