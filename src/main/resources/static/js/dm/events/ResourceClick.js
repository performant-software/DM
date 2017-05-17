goog.provide('dm.events.ResourceClick');

goog.require('goog.events.Event');


/**
 * Event to fire when a resource has been clicked
 */
dm.events.ResourceClick = function (resourceUri, target, opt_viewer) {
    goog.events.Event.call(this, 'resource-click', target);
    
    this.viewer = opt_viewer;
    this.uri = resourceUri;
};
goog.inherits(dm.events.ResourceClick, goog.events.Event);

dm.events.ResourceClick.EVENT_TYPE = 'resource-click';

dm.events.ResourceClick.prototype.getResourceUri = function () {
    return this.uri;
};

/**
 * @return {dm.viewer.Viewer | null}
 */
dm.events.ResourceClick.prototype.getViewer = function () {
    return this.viewer;
};