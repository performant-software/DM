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

    /** @type {string} */
    this.featureType = '';

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
};

/**
 * @override
 */
sc.canvas.DrawFeatureControl.prototype.deactivate = function() {
    sc.canvas.FeatureControl.prototype.deactivate.call(this);
};

/**
 * This method should be called when the first click is fired to begin drawing a
 * new feature.
 */
sc.canvas.DrawFeatureControl.prototype.beginDrawFeature = function() {
};

/**
 * This method should be called when a feature has been completed, and will add
 * the feature to the list of drawnFeatures and nullify this.feature.
 */
sc.canvas.DrawFeatureControl.prototype.finishDrawFeature = function() {
 
    this.sendFeatureToDatabroker();
    var event = new goog.events.Event(sc.canvas.DrawFeatureControl.EVENT_TYPES.finishDraw);
    this.dispatchEvent(event);
};