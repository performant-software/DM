goog.provide('dm.canvas.DrawFeatureControl');

goog.require('goog.events.Event');
goog.require('dm.canvas.FeatureControl');

goog.require('dm.util.svg');

/**
 * Base class for CanvasViewport controls which allow svg features to be drawn
 * on a canvas.
 *
 * @author tandres@drew.edu (Tim Andres)
 *
 * @constructor
 * @extends {dm.canvas.Control}
 *
 * @param {dm.canvas.CanvasViewport} viewport The viewport to control.
 * @param {dm.data.Databroker} databroker The databroker from which to request
 * new uris and post new shape data.
 */
dm.canvas.DrawFeatureControl = function(viewport, databroker) {
    dm.canvas.FeatureControl.call(this, viewport, databroker);

    /** @type {string} */
    this.featureType = '';

};
goog.inherits(dm.canvas.DrawFeatureControl, dm.canvas.FeatureControl);

/**
 * The types of events fired by a DrawFeatureControl
 * @enum
 */
dm.canvas.DrawFeatureControl.EVENT_TYPES = {
    'beginDraw': 'beginDraw',
    'updateFeature': 'updateFeature',
    'finishDraw': 'finishDraw'
};

/**
 * @override
 * Also adds the sc-CanvasViewport-dragging class to the viewport
 */
dm.canvas.DrawFeatureControl.prototype.activate = function() {
    dm.canvas.FeatureControl.prototype.activate.call(this);
};

/**
 * @override
 */
dm.canvas.DrawFeatureControl.prototype.deactivate = function() {
    dm.canvas.FeatureControl.prototype.deactivate.call(this);
};

/**
 * This method should be called when the first click is fired to begin drawing a
 * new feature.
 */
dm.canvas.DrawFeatureControl.prototype.beginDrawFeature = function() {
};

/**
 * This method should be called when a feature has been completed, and will add
 * the feature to the list of drawnFeatures and nullify this.feature.
 */
dm.canvas.DrawFeatureControl.prototype.finishDrawFeature = function() {
 
    this.sendFeatureToDatabroker();
    var event = new goog.events.Event(dm.canvas.DrawFeatureControl.EVENT_TYPES.finishDraw);
    this.dispatchEvent(event);
};