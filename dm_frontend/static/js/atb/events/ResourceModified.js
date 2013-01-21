goog.provide('atb.events.ResourceModified');

goog.require('goog.events.Event');


/**
 * Event to fire when a resource has been modified
 *
 * @param resourceId {string}
 * @param opt_resource {=atb.resource.Resource}
 * @param opt_viewer {=atb.viewer.Viewer}
 */
atb.events.ResourceModified = function (resourceId, opt_resource, opt_viewer) {
    goog.events.Event.call(this, 'resource modified', resourceId);
    
    this.viewer = opt_viewer;
    this.resource = opt_resource;
};
goog.inherits(atb.events.ResourceModified, goog.events.Event);

atb.events.ResourceModified.EVENT_TYPE = 'resource modified';

atb.events.ResourceModified.prototype.getResourceId = function () {
    return this.target;
};

/**
 * @return {atb.viewer.Viewer | null}
 */
atb.events.ResourceModified.prototype.getViewer = function () {
    return this.viewer;
};

/**
 * @return {atb.resource.Resource | null}
 */
atb.events.ResourceModified.prototype.getResource = function () {
    return this.resource;
};