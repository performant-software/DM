goog.provide('dm.events.ResourceModified');

goog.require('goog.events.Event');


/**
 * Event to fire when a resource has been modified
 */
dm.events.ResourceModified = function (resourceUri, target, opt_viewer) {
    goog.events.Event.call(this, 'resource-modified', target);
    
    this.viewer = opt_viewer;
    this.uri = resourceUri
};
goog.inherits(dm.events.ResourceModified, goog.events.Event);

dm.events.ResourceModified.EVENT_TYPE = 'resource-modified';

dm.events.ResourceModified.prototype.getResourceUri = function () {
    return this.uri;
};

/**
 * @return {dm.viewer.Viewer | null}
 */
dm.events.ResourceModified.prototype.getViewer = function () {
    return this.viewer;
};