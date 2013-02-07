goog.provide('sc.canvas.KeyboardShortcutsControl');

goog.require('sc.canvas.Control');

goog.require('goog.events');

sc.canvas.KeyboardShortcutsControl = function(viewport, opt_element) {
    sc.canvas.Control.call(this, viewport);
    
    this.element = opt_element || viewport.getElement();
};
goog.inherits(sc.canvas.KeyboardShortcutsControl, sc.canvas.Control);

sc.canvas.KeyboardShortcutsControl.prototype.activate = function() {
    goog.events.listen(this.element, 'keydown', this.handleKeydown,
                       false, this);
};

sc.canvas.KeyboardShortcutsControl.prototype.deactivate = function() {
    goog.events.unlisten(this.element, 'keydown', this.handleKeydown,
                       false, this);
};

sc.canvas.KeyboardShortcutsControl.PAN_INCREMENT = 10;

sc.canvas.KeyboardShortcutsControl.prototype.handleKeydown = function(event) {
    var panIncrement = - Math.abs(
                              sc.canvas.KeyboardShortcutsControl.PAN_INCREMENT);
    
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