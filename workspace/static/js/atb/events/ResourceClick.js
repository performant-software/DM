goog.provide('atb.events.ResourceClick');

goog.require('goog.events.Event');


/**
 * Event to fire when a resource has been clicked
 */
atb.events.ResourceClick = function (resourceUri, target, opt_viewer) {
    goog.events.Event.call(this, 'resource-click', target);
    
    this.viewer = opt_viewer;
    this.uri = resourceUri;
};
goog.inherits(atb.events.ResourceClick, goog.events.Event);

atb.events.ResourceClick.EVENT_TYPE = 'resource-click';

atb.events.ResourceClick.prototype.getResourceUri = function () {
    return this.uri;
};

/**
 * @return {atb.viewer.Viewer | null}
 */
atb.events.ResourceClick.prototype.getViewer = function () {
    return this.viewer;
};