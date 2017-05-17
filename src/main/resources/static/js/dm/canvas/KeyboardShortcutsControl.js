goog.provide('dm.canvas.KeyboardShortcutsControl');

goog.require('dm.canvas.Control');

goog.require('goog.events');

dm.canvas.KeyboardShortcutsControl = function(viewport, opt_element) {
    dm.canvas.Control.call(this, viewport);
    
    this.element = opt_element || viewport.getElement();
};
goog.inherits(dm.canvas.KeyboardShortcutsControl, dm.canvas.Control);

dm.canvas.KeyboardShortcutsControl.prototype.controlName = 'KeyboardShortcutsControl';

dm.canvas.KeyboardShortcutsControl.prototype.activate = function() {
    goog.events.listen(this.element, 'keydown', this.handleKeydown,
                       false, this);
};

dm.canvas.KeyboardShortcutsControl.prototype.deactivate = function() {
    goog.events.unlisten(this.element, 'keydown', this.handleKeydown,
                       false, this);
};

dm.canvas.KeyboardShortcutsControl.PAN_INCREMENT = 10;

dm.canvas.KeyboardShortcutsControl.prototype.handleKeydown = function(event) {
    var panIncrement = - Math.abs(
                              dm.canvas.KeyboardShortcutsControl.PAN_INCREMENT);
    
    var keycode = event.keyCode;
    
    if (keycode == goog.events.KeyCodes.UP) {
        this.viewport.panByPageCoords(0, -panIncrement);
    }
    else if (keycode == goog.events.KeyCodes.DOWN) {
        this.viewport.panByPageCoords(0, panIncrement);
    }
    else if (keycode == goog.events.KeyCodes.LEFT) {
        this.viewport.panByPageCoords(-panIncrement, 0);
    }
    else if (keycode == goog.events.KeyCodes.RIGHT) {
        this.viewport.panByPageCoords(panIncrement, 0);
    }
};