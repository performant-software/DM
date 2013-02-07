goog.provide('atb.events.LinkingModeExited');

goog.require('goog.events.Event');


/**
 * Event to fire when a resource has been modified
 *
 * @param resourceId {string}
 * @param opt_resource {=atb.resource.Resource}
 * @param opt_viewer {=atb.viewer.Viewer}
 */
atb.events.LinkingModeExited = function (annoId, resource) {
    goog.events.Event.call(this, 'anno linking mode exited', annoId);
    
    this.resource = resource;
};
goog.inherits(atb.events.LinkingModeExited, goog.events.Event);

atb.events.LinkingModeExited.EVENT_TYPE = 'anno linking mode exited';

/**
 * Returns the id of the annotation used for linking
 * @return {string}
 */
atb.events.LinkingModeExited.prototype.getAnnoId = function () {
    return this.target;
};

/**
 * If one was provided, returns the annotation resource object
 * @return {!atb.resource.AnnotationResource}
 */
atb.events.LinkingModeExited.prototype.getResource = function () {
    return this.resource;
};