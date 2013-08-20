goog.provide('atb.events.LinkingModeEntered');

goog.require('goog.events.Event');


/**
 * Event to fire when a resource has been modified
 */
atb.events.LinkingModeEntered = function (annoUri, target) {
    goog.events.Event.call(this, 'anno-linking-mode-entered', target);

    this.uri = annoUri;
};
goog.inherits(atb.events.LinkingModeEntered, goog.events.Event);

atb.events.LinkingModeEntered.EVENT_TYPE = 'anno-linking-mode-entered';

/**
 * Returns the id of the annotation used for linking
 * @return {string}
 */
atb.events.LinkingModeEntered.prototype.getAnnoUri = function () {
    return this.uri;
};