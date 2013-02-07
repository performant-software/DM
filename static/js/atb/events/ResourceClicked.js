goog.provide('atb.events.ResourceClicked');

goog.require('goog.events.Event');


/**
 * Event to fire when a resource has been clicked
 *
 * @param resourceId {string}
 * @param opt_resource {=atb.resource.Resource}
 * @param opt_viewer {=atb.viewer.Viewer}
 */
atb.events.ResourceClicked = function (resourceId, opt_resource, opt_viewer) {
    goog.events.Event.call(this, 'resource clicked', resourceId);
    
    this.viewer = opt_viewer;
    this.resource = opt_resource;
    this.resourceId = resourceId;
};
goog.inherits(atb.events.ResourceClicked, goog.events.Event);

atb.events.ResourceClicked.prototype.getResourceId = function () {
    return this.target;
};

/**
 * @return {atb.viewer.Viewer | null}
 */
atb.events.ResourceClicked.prototype.getViewer = function () {
    return this.viewer;
};

/**
 * @return {atb.resource.Resource | null}
 */
atb.events.ResourceClicked.prototype.getResource = function () {
    return this.resource;
};