goog.provide('sc.canvas.DrawFeatureControl');

goog.require('goog.events.Event');
goog.require('sc.canvas.FeatureControl');

goog.require('sc.util.svg');

/**
 * Base class for CanvasViewport controls which allow svg features to be drawn
 * on a canvas.
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
sc.canvas.DrawFeatureControl = function(viewport, databroker) {
    sc.canvas.FeatureControl.call(this, viewport, databroker);

    /**
     * Features which have been drawn with this tool since its initialization
     * (not its activation)
     * @type {Array.<Raphael.Element>}
     */
    this.drawnFeatures = [];

    /** @type {string} */
    this.featureType = '';

    /** @type {boolean} */
    this.isDrawingInProgress = false;
};
goog.inherits(sc.canvas.DrawFeatureControl, sc.canvas.FeatureControl);

/**
 * The types of events fired by a DrawFeatureControl
 * @enum
 */
sc.canvas.DrawFeatureControl.EVENT_TYPES = {
    'beginDraw': 'beginDraw',
    'updateFeature': 'updateFeature',
    'finishDraw': 'finishDraw'
};

/**
 * @override
 * Also adds the sc-CanvasViewport-dragging class to the viewport
 */
sc.canvas.DrawFeatureControl.prototype.activate = function() {
    sc.canvas.FeatureControl.prototype.activate.call(this);

    jQuery(this.viewport.getElement()).addClass('sc-CanvasViewport-draw');
};

/**
 * @override
 */
sc.canvas.DrawFeatureControl.prototype.deactivate = function() {
    sc.canvas.FeatureControl.prototype.deactivate.call(this);

    jQuery(this.viewport.getElement()).removeClass('sc-CanvasViewport-draw');
};

/**
 * Gets a uri for a new resource from the databroker
 * @return {string} The new uri.
 */
sc.canvas.DrawFeatureControl.prototype.getNewUri = function() {
    return this.databroker.createUuid();
};

/**
 * This method should be called when the first click is fired to begin drawing a
 * new feature.
 */
sc.canvas.DrawFeatureControl.prototype.beginDrawFeature = function() {
    this.isDrawingInProgress = true;

    this.uri = this.getNewUri();

    var event = new goog.events.Event(sc.canvas.DrawFeatureControl.
                                      EVENT_TYPES.beginDraw, this.uri);
    event.feature = this.feature;
    this.dispatchEvent(event);
};

/**
 * This method should be called when a feature has been completed, and will add
 * the feature to the list of drawnFeatures and nullify this.feature.
 */
sc.canvas.DrawFeatureControl.prototype.finishDrawFeature = function() {
    var feature = this.feature;
    var uri = this.uri;
    
    if (feature == null) {
        return;
    }

    this.drawnFeatures.push(feature);

    this.sendFeatureToDatabroker();

    this.viewport.canvas.requestFrameRender();
    
    this.viewport.canvas.fireModifiedFeature(feature, uri);

    var event = new goog.events.Event(sc.canvas.DrawFeatureControl.
                                      EVENT_TYPES.finishDraw, uri);
    event.feature = this.feature;
    this.dispatchEvent(event);

    this.feature = null;
    this.uri = '';

    this.isDrawingInProgress = false;
};

/**
 * Returns a reference to the list of features this control has drawn since it
 * has been instantiated (not since it was last activated).
 * @return {Array.<Raphael.Element>} The list of drawn features.
 */
sc.canvas.DrawFeatureControl.prototype.getDrawnFeatures = function() {
    return this.drawnFeatures;
};