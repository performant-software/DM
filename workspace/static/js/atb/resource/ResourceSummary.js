//ResourceSummary
goog.provide('atb.resource.ResourceSummary');

goog.require('goog.dom');
goog.require('goog.dom.DomHelper');
goog.require('goog.object');
goog.require('jquery.jQuery');
goog.require('goog.events');
goog.require('goog.events.EventTarget');


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
 * @param viewer {atb.viewer.Viewer} the click handler will be called with
 * this scope
 * @param clientApp {atb.ClientApp}
 * @param opt_domHelper {!goog.dom.DomHelper}
 * @param opt_styleOptions {!Object} defaults to atb.resource.ResourceSummary.DEFAULT_STYLE_OPTIONS
 */
atb.resource.ResourceSummary = function (uri, viewer, clientApp, opt_domHelper, opt_styleOptions) {
    goog.events.EventTarget.call(this);

    this.uri = uri;
    this.view = null;
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
goog.inherits(atb.resource.ResourceSummary, goog.events.EventTarget);

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

atb.resource.ResourceSummary.prototype.getElement = function() {
    return this.outerDiv;
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

    var customEvent = new goog.events.BrowserEvent(e.getBrowserEvent(), this);
    customEvent.resource = this.resource;
    this.dispatchEvent(customEvent);
};

atb.resource.ResourceSummary.prototype.deleteClickHandler = function(event) {
    event.stopPropagation();

    var customEvent = new goog.events.BrowserEvent(event, this);
    customEvent.resource = this.resource;
    customEvent.type = 'delete-click';

    this.dispatchEvent(customEvent);
};

/**
 * Enables deletion of the summary by showing the delete button on hover
 */
atb.resource.ResourceSummary.prototype.enableDelete = function () {
    goog.events.listen(this.deleteButton, goog.events.EventType.CLICK, this.deleteClickHandler, false, this);
    jQuery(this.panelCtrls).append(this.deleteButton);
    
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
        
        
    });
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

atb.resource.ResourceSummary.prototype.getSortTitle = function() {
    var getTitle = this.databroker.dataModel.getTitle;
    return jQuery.trim(getTitle(this.resource).toLowerCase());
};



// Static methods:
/**
 * Comparator function for sorting resource summaries by their titles
 * @param summaryA {atb.resource.ResourceSummary}
 * @param summaryB {atb.resource.ResourceSummary}
 */
atb.resource.ResourceSummary.sortByTitle = function (summaryA, summaryB) {
    var aTitle = summaryA.getSortTitle();
    var bTitle = summaryB.getSortTitle();
    
    if (aTitle > bTitle)
        return 1;
    else if (aTitle < bTitle)
        return -1;
    else
        return 0;
};
