//ResourceSummary
goog.provide('atb.resource.ResourceSummary');

goog.require('goog.dom');
goog.require('goog.dom.DomHelper');
goog.require('goog.object');
goog.require('jquery.jQuery');
goog.require('goog.events');


atb.resource.TARGET_VIEW = 'target';
atb.resource.BODY_VIEW = 'body';
atb.resource.RESOURCE_VIEW = 'resource';


/**
 * atb.resource.ResourceSummary
 *
 * Provides an overview of a Resource, usually to be rendered by a subclass
 * of
 * {atb.viewer.ResourceListViewer}
 *
 * @author tandres@drew.edu (Tim Andres)
 * @constructor
 * @abstract
 *
 * @param uri {string}
 * @param clickHandler {function (string, atb.resource.ResourceSummary,
 * goog.events.Event, Object)}
 * @param viewer {atb.viewer.Viewer} the click handler will be called with
 * this scope
 * @param resource {atb.resource.Resource}
 * @param clientApp {atb.ClientApp}
 * @param opt_domHelper {!goog.dom.DomHelper}
 * @param opt_styleOptions {!Object} defaults to atb.resource.ResourceSummary.DEFAULT_STYLE_OPTIONS
 */
atb.resource.ResourceSummary = function (uri, clickHandler, viewer, clientApp, opt_domHelper, opt_styleOptions) {
    this.uri = uri;
    this.view = null;
    this.clickHandler = clickHandler;
    this.viewer = viewer;
    this.clientApp = clientApp;
    if (clientApp) {
        this.webService = clientApp.getWebService();
        this.databroker = clientApp.databroker;
        this.resource = this.databroker.getResource(this.uri);
    }

    this.domHelper = opt_domHelper || new goog.dom.DomHelper ();

    this.div = this.domHelper.createDom('div', {
        'class': 'atb-resourcesummary',
        'title': 'Open this resource'
    }, null);
    this.outerDiv = this.domHelper.createDom('div', {
        'class': 'atb-resourcesummary-outer'
    });
    this.deleteButton = this.domHelper.createDom('div', {
        'class': 'atb-resourcesummary-delete-button',
        'style': 'display: none;',
        'title': 'Click to delete this resource, alt+click to bypass warning'
    });

    this.annoIds = [];
    this.deletableResources = [];
    this.resourceType = '';

    if (!opt_styleOptions)
        opt_styleOptions = {};
    this.styleOptions = jQuery.extend(
        goog.object.clone(atb.resource.ResourceSummary.DEFAULT_STYLE_OPTIONS),
        opt_styleOptions
    );
};

/**
 * Renders the panel selection controls in the top right corner
 */
atb.resource.ResourceSummary.prototype.renderPanelCtrls = function () {
    this.panelCtrls = this.domHelper.createDom(
        'div',
        {
            'class' : 'atb-resourcesummary-panel-ctrls'
        }
    );
    this.openInNewWindowBtn = this.domHelper.createDom(
        'div',
        {
            'class' : 'atb-resourcesummary-new-window',
            'title' : 'Open this resource in a new window'
        }
    );
    this.swapPanelsBtn = this.domHelper.createDom(
        'div',
        {
            'class' : 'atb-resourcesummary-swap-panels',
            'title' : 'Open this resource in a different panel'
        }
    );
    
    goog.events.listen(this.swapPanelsBtn, goog.events.EventType.CLICK, this.handleSwapPanelsClick, false, this);
    goog.events.listen(this.openInNewWindowBtn, goog.events.EventType.CLICK, this.handleNewWindowClick, false, this);
    
// Note(tandres): Use jQuery's fadeTo rather than fadeIn and fadeOut, because
// fadeIn and fadeOut set display to none, which collapses the div and changes
// the layout
    
    var $div = jQuery(this.div);
    var $panelCtrls = jQuery(this.panelCtrls);
    
    var self = this;
    $panelCtrls.fadeTo(0, 0);
    $div.hover(function () {
        $panelCtrls.fadeTo(200, 1);
    }, function () {
        $panelCtrls.fadeTo(200, 0);
    });

    this.panelCtrls.appendChild(this.swapPanelsBtn);
    this.panelCtrls.appendChild(this.openInNewWindowBtn);
    $div.prepend(this.panelCtrls); 
};

/**
 * Default options for a Resource Summary layout
 */
atb.resource.ResourceSummary.DEFAULT_STYLE_OPTIONS = {
    showControls: true,
    titleOnly: false
};

/**
 * If a div is provided, the summary will append itself to it, and a rendered
 * div will always be returned
 * @param opt_div {!Element}
 * @return {Element} the rendered summary div
 */
atb.resource.ResourceSummary.prototype.render = function (opt_div) {
    if (this.styleOptions.showControls) {
        this.renderPanelCtrls();
    }

    jQuery(this.div).hover(function () {
        jQuery(this).addClass('atb-resourcesummary-hover');
    }, function () {
        jQuery(this).removeClass('atb-resourcesummary-hover');
    });

    goog.events.listen(this.div, goog.events.EventType.CLICK, this.handleClick, false, this);

    this.outerDiv.appendChild(this.div);

    if (opt_div) {
        opt_div.appendChild(this.outerDiv);
    }
    return this.outerDiv;
};

/**
 * Calls the click handler function for this summary
 * @param opt_event {goog.events.Event}
 * @param opt_params {Object}
 */
atb.resource.ResourceSummary.prototype.callClickHandler = function (opt_event, opt_params) {
    this.clickHandler.call(this.viewer, this.uri, this, opt_event, opt_params);
};

/**
 * Click handler for the base div
 * @param e {goog.events.Event}
 */
atb.resource.ResourceSummary.prototype.handleClick = function (e) {
    e.stopPropagation();
    
    // When a new viewer opens, the unhover events will not fire, so the layout must be cleaned up here
    jQuery(this.div).removeClass('atb-resourcesummary-hover');
    jQuery(this.panelCtrls).fadeTo(200, 0);

    this.callClickHandler(e);
};

goog.provide('atb.resource.ResourceSummary.HANDLER_MSG');
atb.resource.ResourceSummary.HANDLER_MSG.swapPanels = 'swapPanels';
atb.resource.ResourceSummary.HANDLER_MSG.newWindow = 'newWindow';

/**
 * Handles a click on the swap panels button
 * @param e {goog.events.Event}
 */
atb.resource.ResourceSummary.prototype.handleSwapPanelsClick = function (e) {
    e.stopPropagation();

    var params = {
        openLocation: atb.resource.ResourceSummary.HANDLER_MSG.swapPanels
    };
    
    this.callClickHandler(e, params);
};

/**
 * Handles a click on the new window button
 * @param e {goog.events.Event}
 */
atb.resource.ResourceSummary.prototype.handleNewWindowClick = function (e) {
    e.stopPropagation();
    
    var params = {
        openLocation: atb.resource.ResourceSummary.HANDLER_MSG.newWindow
    };

    this.callClickHandler(e, params);
};

/**
 * Enables deletion of the summary by showing the delete button on hover
 * @param deleteClickHandler {Function(atb.resource.ResourceSummary, goog.events.Event)}
 * the function to be called when the delete button is clicked
 */
atb.resource.ResourceSummary.prototype.enableDelete = function (deleteClickHandler) {
    this.deleteClickHandler = function (e) {
        e.stopPropagation();
        deleteClickHandler(this, e);
    };
    
    goog.events.listen(this.deleteButton, goog.events.EventType.CLICK, this.deleteClickHandler, false, this);
    jQuery(this.panelCtrls).append(this.deleteButton);
    
    jQuery(this.openInNewWindowBtn).hide();
    jQuery(this.swapPanelsBtn).hide();
    jQuery(this.deleteButton).show();
};

/**
 * Disables deletion of the summary by hiding the delete button
 */
atb.resource.ResourceSummary.prototype.disableDelete = function () {
    goog.events.unlisten(this.deleteButton, goog.events.EventType.CLICK, this.deleteClickHandler, false, this);
    
    var self = this;
    jQuery(this.deleteButton).fadeOut(300, function() {
        jQuery(self.deleteButton).hide();
        
        jQuery(self.openInNewWindowBtn).fadeIn(300);
        jQuery(self.swapPanelsBtn).fadeIn(300);
    });
};

/**
 * Changes the click handler to a new function, but does not discard the original
 * @param tempClickHandler {Function}
 */
atb.resource.ResourceSummary.prototype.changeClickHandler = function (tempClickHandler) {
    this.tempClickHandler = tempClickHandler;
    
    goog.events.unlisten(this.div, goog.events.EventType.CLICK, this.handleClick, false, this);
    
    goog.events.listen(this.div, goog.events.EventType.CLICK, this.tempHandleClick_, false, this);
};

/**
 * Resets the click handler to the original function
 */
atb.resource.ResourceSummary.prototype.resetClickHandler = function () {
    goog.events.unlisten(this.div, goog.events.EventType.CLICK, this.tempHandleClick_, false, this);
    
    goog.events.listen(this.div, goog.events.EventType.CLICK, this.handleClick, false, this);
    
    this.tempClickHandler = null;
};

/**
 * The click handler to be called when a temporary handler has been set by the user of this class
 * @param e {goog.events.Event}
 */
atb.resource.ResourceSummary.prototype.tempHandleClick_ = function (e) {
    e.stopPropagation();

    this.tempClickHandler(this.meta_data, this, e);
};

/**
 * Returns true if the given object has the same id as this resource summary
 * @param other {Object}
 */
atb.resource.ResourceSummary.prototype.equals = function (other) {
    if (!other)
        return false;
    
    return other.uri == this.uri;
};

/**
 * Sets the tooltip for this summary using the browser native tooltip
 * @param tooltipText {string}
 */
atb.resource.ResourceSummary.prototype.setTooltip = function (tooltipText) {
    this.div.title = '' + tooltipText;
};

/**
 * Toggles the selection of this summary
 */
atb.resource.ResourceSummary.prototype.toggleSelected = function () {
    this.setSelected(! this.selected);
};

/**
 * Sets whether this summary is selected
 * @param selected {boolean}
 */
atb.resource.ResourceSummary.prototype.setSelected = function (selected) {
    if (selected) {
        jQuery(this.div).addClass('atb-resourcesummary-selected');
        this.selected = true;
        
        if (this.parent && this.parent.onChildSelected) {
            this.parent.onChildSelected(this);
        }
    }
    else {
        jQuery(this.div).removeClass('atb-resourcesummary-selected');
        this.selected = false;
        
        if (this.parent && this.parent.setSelected) {
            this.parent.setSelected(false);
        }
    }
};

/**
 * Sets the list of anno ids for the resource
 * //TODO check if this is still needed
 * @param ids {Array.<string>}
 */
atb.resource.ResourceSummary.prototype.setAnnoIds = function (ids) {
    this.annoIds = ids;
};


atb.resource.ResourceSummary.prototype.addAnnoId = function (id) {
    this.annoIds.push(id);
};

atb.resource.ResourceSummary.prototype.getAnnoIds = function () {
    return this.annoIds;
};

/**
 * Sets the arbitrary view type of the object
 * @param view {string}
 */
atb.resource.ResourceSummary.prototype.setView = function (view) {
    this.view = view;
};

/**
 * Gets the arbitrary view type of the object
 * @return {string}
 */
atb.resource.ResourceSummary.prototype.getView = function () {
    return this.view;
};

/**
 * Sets the array of ids of resources to be deleted when this resource is
 * deleted (the summary is not responsible for performing the deletion)
 * @param resourceIds {Array.<string>}
 */
atb.resource.ResourceSummary.prototype.setDeletableResources = function (resourceIds) {
    this.deletableResources = resourceIds;
}; 

/**
 * Adds a resource id to the list of resources to be deleted upon the
 * deletion of this resource
 * @param uri {string}
 */
atb.resource.ResourceSummary.prototype.addDeletableResource = function (uri) {
    this.deletableResources.push(uri);
};

/**
 * Returns a list of resource ids which should be deleted upon the deletion
 * of this resource
 * @return {Array.<string>}
 */
atb.resource.ResourceSummary.prototype.getDeletableResources = function () {
    return this.deletableResources;
};

/**
 * Returns the type of this resource
 * @return {string}
 */
atb.resource.ResourceSummary.prototype.getResourceType = function () {
    return this.resourceType;
}; 

atb.resource.ResourceSummary.prototype.getSortTitle = function() {
    return this.resource.getOneProperty('dc:title') || '';
};



// Static methods:
/**
 * Comparator function for sorting resource summaries by their titles
 * @param summaryA {atb.resource.ResourceSummary}
 * @param summaryB {atb.resource.ResourceSummary}
 */
atb.resource.ResourceSummary.sortByTitle = function (summaryA, summaryB) {
    var getTitle = function (summary) {
        if (summary.resource) {
            return jQuery.trim(summary.resource.getTitle().toLowerCase());
        }
        else if (summary.topSummary && summary.topSummary.resource) {
            return jQuery.trim(summary.topSummary.resource.getTitle().toLowerCase());
        }
        else {
            return '';
        }
    }
    
    var aTitle = summaryA.getSortTitle();
    var bTitle = summaryB.getSortTitle();
    
    if (aTitle > bTitle)
        return 1;
    else if (aTitle < bTitle)
        return -1;
    else
        return 0;
};

/**
 * Comparator function for sorting summaries by their resource ids
 * @param summaryA {atb.resource.ResourceSummary}
 * @param summaryB {atb.resource.ResourceSummary}
 */
atb.resource.ResourceSummary.sortById = function (summaryA, summaryB) {
    return summaryA.meta_data.id - summaryB.meta_data.id;
};

