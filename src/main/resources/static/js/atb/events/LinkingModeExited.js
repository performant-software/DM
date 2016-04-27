goog.provide('atb.events.LinkingModeExited');

goog.require('goog.events.Event');


/**
 * Event to fire when a resource has been modified
 */
atb.events.LinkingModeExited = function (annoUri, target) {
    goog.events.Event.call(this, 'anno-linking-mode-exited', target);
    
    this.uri = annoUri;
};
goog.inherits(atb.events.LinkingModeExited, goog.events.Event);

atb.events.LinkingModeExited.EVENT_TYPE = 'anno-linking-mode-exited';

/**
 * Returns the id of the annotation used for linking
 * @return {string}
 */
atb.events.LinkingModeExited.prototype.getAnnoUri = function () {
    return this.uri;
};