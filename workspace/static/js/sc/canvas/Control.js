goog.provide('sc.canvas.Control');

goog.require('goog.events.Event');
goog.require('goog.events.EventTarget');

/**
 * An abstract class for controlling a canvas viewport
 * The control should not activate itself within the constructor.
 *
 * @author tandres@drew.edu (Tim Andres)
 *
 * @extends {goog.events.EventTarget}
 * @constructor
 *
 * @param {sc.canvas.CanvasViewport} viewport The CanvasViewport to
 * control.
 */
sc.canvas.Control = function(viewport) {
    goog.events.EventTarget.call(this);

    this.viewport = viewport;
    this.isActive = false;

    this.viewport.inactiveControls.add(this);
};
goog.inherits(sc.canvas.Control, goog.events.EventTarget);

/**
 * This method will be called to activate the control. Any event listeners and
 * handlers should be added at this point. (Handlers should not be anonymous
 * functions in order to allow them to be removed by reference upon
 * deactivation).
 */
sc.canvas.Control.prototype.activate = function() {
    this.isActive = true;

    this.viewport.inactiveControls.remove(this);
    this.viewport.activeControls.add(this);

    var event = new goog.events.Event('activated', this);
    this.dispatchEvent(event);
};

/**
 * This method will be called to deactivate the control. Any event listeners or
 * handlers should be removed at this point. However, the control may still be
 * reactivated, and state will be preserved.
 */
sc.canvas.Control.prototype.deactivate = function() {
    this.isActive = false;

    this.viewport.activeControls.remove(this);
    this.viewport.inactiveControls.add(this);

    var event = new goog.events.Event('deactivated', this);
    this.dispatchEvent(event);
};
