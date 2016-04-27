goog.provide('atb.events.ResourceModified');

goog.require('goog.events.Event');


/**
 * Event to fire when a resource has been modified
 */
atb.events.ResourceModified = function (resourceUri, target, opt_viewer) {
    goog.events.Event.call(this, 'resource-modified', target);
    
    this.viewer = opt_viewer;
    this.uri = resourceUri
};
goog.inherits(atb.events.ResourceModified, goog.events.Event);

atb.events.ResourceModified.EVENT_TYPE = 'resource-modified';

atb.events.ResourceModified.prototype.getResourceUri = function () {
    return this.uri;
};

/**
 * @return {atb.viewer.Viewer | null}
 */
atb.events.ResourceModified.prototype.getViewer = function () {
    return this.viewer;
};