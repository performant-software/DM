goog.provide('atb.events.ViewerHasEnteredBackground');

goog.require('goog.events.Event');


/**
 * Event to fire when a viewer has entered the background, fired by a panel container
 */
atb.events.ViewerHasEnteredBackground = function (viewer, panelContainer) {
    goog.events.Event.call(this, 'viewer has entered background', viewer);
    
    this.panelContainer = panelContainer;
};
goog.inherits(atb.events.ViewerHasEnteredBackground, goog.events.Event);

atb.events.ViewerHasEnteredBackground.EVENT_TYPE = 'viewer has entered background';

atb.events.ViewerHasEnteredBackground.prototype.getViewer = function () {
    return this.target;
};

atb.events.ViewerHasEnteredBackground.prototype.getPanelContainer = function () {
    return this.panelContainer;
};