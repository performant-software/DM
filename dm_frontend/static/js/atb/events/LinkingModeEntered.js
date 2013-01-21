goog.provide('atb.events.LinkingModeEntered');

goog.require('goog.events.Event');


/**
 * Event to fire when a resource has been modified
 *
 * @param resourceId {string}
 * @param opt_resource {=atb.resource.Resource}
 * @param opt_viewer {=atb.viewer.Viewer}
 */
atb.events.LinkingModeEntered = function (annoId) {
    goog.events.Event.call(this, 'anno linking mode entered', annoId);
};
goog.inherits(atb.events.LinkingModeEntered, goog.events.Event);

atb.events.LinkingModeEntered.EVENT_TYPE = 'anno linking mode entered';

/**
 * Returns the id of the annotation used for linking
 * @return {string}
 */
atb.events.LinkingModeEntered.prototype.getAnnoId = function () {
    return this.target;
};