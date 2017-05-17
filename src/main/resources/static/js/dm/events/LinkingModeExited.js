goog.provide('dm.events.LinkingModeExited');

goog.require('goog.events.Event');


/**
 * Event to fire when a resource has been modified
 */
dm.events.LinkingModeExited = function (annoUri, target) {
    goog.events.Event.call(this, 'anno-linking-mode-exited', target);
    
    this.uri = annoUri;
};
goog.inherits(dm.events.LinkingModeExited, goog.events.Event);

dm.events.LinkingModeExited.EVENT_TYPE = 'anno-linking-mode-exited';

/**
 * Returns the id of the annotation used for linking
 * @return {string}
 */
dm.events.LinkingModeExited.prototype.getAnnoUri = function () {
    return this.uri;
};