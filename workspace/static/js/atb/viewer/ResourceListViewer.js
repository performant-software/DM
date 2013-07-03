goog.provide('atb.viewer.ResourceListViewer');

goog.require('atb.viewer.Viewer');

goog.require('jquery.jQuery');

goog.require('goog.dom');
goog.require('goog.events');
goog.require("atb.util.StyleUtil");

goog.require("atb.util.ReferenceUtil");
goog.require("atb.ClientApp");

goog.require('goog.ui.ToolbarButton');
goog.require('goog.array');

/**
 * atb.viewer.ResourceListViewer
 *
 * Displays a list of atb.resource.ResourceSummaryView objects
 * 
 * {atb.viewer.Finder} should now be used to display a list of resources
 *
 * @author tandres@drew.edu (Tim Andres)
 * @constructor
 * @extends {atb.viewer.Viewer}
 * 
 * @abstract
 * 
 * @param set_clientApp {atb.ClientApp}
 */
atb.viewer.ResourceListViewer = function(set_clientApp) {
	atb.viewer.Viewer.call(this, set_clientApp);
    this.currentPanel = null;
    
    this.summaries = [];
	
    this.title = " ";
    this.loading = false;
    
    this.summariesById = {};
    this.renderedById = {};
    
    this.summariesByGroup = {
        canvas: [],
        text: [],
        textHighlight: [],
        marker: [],
        markerCollection: [],
        other: []
    };
};
goog.inherits(atb.viewer.ResourceListViewer, atb.viewer.Viewer);

atb.viewer.ResourceListViewer.prototype.addResourceSummary = function (resourceSummary) {
    if (! (resourceSummary.resourceId in this.renderedById)) {
        this.summaries.push(resourceSummary);
        this.renderedById[resourceSummary.resourceId] = resourceSummary;
        
        this.renderSummaryInProperGroup(resourceSummary);
    } 
};

atb.viewer.ResourceListViewer.prototype.renderSummaryInProperGroup = function (resourceSummary) {
    var insert = function (list) {
        var index = goog.array.binarySearch(list, resourceSummary, atb.resource.ResourceSummary.sortByTitle);
        if (index < 0) {
            goog.array.insertAt(list, resourceSummary, -(index + 1));
            return -(index + 1);
        }
        else {
            goog.array.insertAt(list, resourceSummary, index);
            return index;
        }
    };
    
    var domHelper = this.getDomHelper();
    var render = function (list, div) {
        var index = insert(list);
        
        if (index <= 0) {
            var newDiv = resourceSummary.render();
            
            jQuery(div).prepend(newDiv);
        }
        else {
            var previousSummaryDiv = list[index - 1].outerDiv;
            var newDiv = resourceSummary.render();
            
            jQuery(previousSummaryDiv).after(newDiv);
        }
    };
    
    if (resourceSummary.getResourceType() == 'Canvas') {
        render(this.summariesByGroup.canvas, this.typeSpecificDivs.canvases);
    }
    else if (resourceSummary.getResourceType() == 'Text') {
        render(this.summariesByGroup.text, this.typeSpecificDivs.texts);
    }
    else if (resourceSummary.getResourceType() == 'Highlight') {
        render(this.summariesByGroup.textHighlight, this.typeSpecificDivs.textHighlights);
    }
    else if (resourceSummary.getResourceType() == 'Marker') {
        render(this.summariesByGroup.marker, this.typeSpecificDivs.markers);
    }
    else if (resourceSummary.getResourceType() == 'Marker Collection') {
        render(this.summariesByGroup.markerCollection, this.typeSpecificDivs.markerCollections);
    }
    else {
        render(this.summariesByGroup.other, this.typeSpecificDivs.other);
    }
};

atb.viewer.ResourceListViewer.prototype.addResourceSummaries = function (resourceSummaryViewers) {
    for (var x in resourceSummaryViewers) {
        this.addResourceSummary(resourceSummaryViewers[x]);
    }
};

atb.viewer.ResourceListViewer.prototype.clearSummaries = function () {
    for (var x in this.typeSpecificDivs) {
        jQuery(this.typeSpecificDivs[x]).html('');
    }
    this.summariesById = {};
    this.renderedById = {};
    this.summaries = [];
    this.summariesByGroup = {
        canvas: [],
        text: [],
        textHighlight: [],
        marker: [],
        markerCollection: [],
        other: []
    };
};

/**
 * @deprecated
 */
atb.viewer.ResourceListViewer.prototype.addResourceSummaryById = function (resourceId) {
    this.webService.withBatchResources(
        [resourceId],
        function (resources) {
            var resource = resources[resourceId];
            
            if (resource.getType() == 'user') {
                this.addSummariesFromUserId(resourceId);
                return;
            }
                                 
            var summaries = this.createSummariesFromResource(resource);

            this.addResourceSummaries(summaries);
        },
        this,
        {min_formatting: true}
    );
};

/**
 * @deprecated
 */
atb.viewer.ResourceListViewer.prototype.addResourceSummariesByIds = function (resourceIds) {
    for (var x in resourceIds) {
        if (resourceIds[x]) {
            this.addResourceSummaryById(resourceIds[x]);
        }
    }
};

/**
 * @deprecated
 */

atb.viewer.ResourceListViewer.prototype.addSummaryFromJSONData = function (jsonDataObj) {
    var resource = atb.resource.ResourceFactory.createFromJSON(jsonDataObj);
    
    this.addResourceSummaries(this.createSummariesFromResource(resource))
};

/**
 * @deprecated
 */

atb.viewer.ResourceListViewer.prototype.addSummariesFromJSONData = function (jsonDataObjs) {
    for (var x in jsonDataObjs) {
        var json = jsonDataObjs[x];

        this.addSummaryFromJSONData(json);
    }
};

/**
 * @deprecated
 */

atb.viewer.ResourceListViewer.prototype.addSummariesFromUserId = function (userId) {
    if (this.setLoading)
        this.setLoading(true);
    
    this.webService.withResource(
        userId,
        function (resource) {
            if(resource.getType() != 'user') {
                throw "userId does not refer to a user"
            }
            
            var ids = resource.getChildIds();

            this.addResourceSummariesByIds(ids);
            
            if (this.setLoading)
                this.setLoading(false);
        },
        this
    );
};

/**
 * @abstract
 * All subclasses should implement this method to be passed to {atb.resource.ResourceSummary}
 * objects
 */
atb.viewer.ResourceListViewer.prototype.handleResourceSummaryClick = function (id, summaryObject, event, opt_params) {

};

atb.viewer.ResourceListViewer.prototype.render = function () {
    if (this.rootDiv != null) {
        return;//already rendered...?!
    }

    atb.viewer.Viewer.prototype.render.call(this);
    
    jQuery(this.rootDiv).addClass('atb-resourceviewer-wrapper');

    this.field = this.domHelper.createElement('div');
    this.rootDiv.appendChild(this.field);
    jQuery(this.field).addClass('atb-resourceviewer');

    this.reloadButton = new goog.ui.ToolbarButton(
       this.domHelper.createDom(
            'div',
            {
                'class': 'atb-resourceviewer-reload-button'
            }
        )
    );
    this.reloadButton.setTooltip('Reload');
    this.reloadButton.addClassName('atb-resourceviewer-reload-button-outer');
    goog.events.listen(this.reloadButton, goog.ui.Component.EventType.ACTION, this.refresh, false, this);

    this.controlsDiv = this.domHelper.createDom('div', {'class': 'atb-resourceviewer-toolbar'});
    jQuery(this.field).before(this.controlsDiv);

    this.reloadButton.render(this.controlsDiv);

    this.typeSpecificDivs = {
        markerCollections: this.domHelper.createElement('div'),
        canvases: this.domHelper.createElement('div'),
        texts: this.domHelper.createElement('div'),
        textHighlights: this.domHelper.createElement('div'),
        markers: this.domHelper.createElement('div'),
        other: this.domHelper.createElement('div')
    };
    
    this.field.appendChild(this.typeSpecificDivs.markerCollections);
    this.field.appendChild(this.typeSpecificDivs.canvases);
    this.field.appendChild(this.typeSpecificDivs.texts);
    this.field.appendChild(this.typeSpecificDivs.textHighlights);
    this.field.appendChild(this.typeSpecificDivs.markers);
    this.field.appendChild(this.typeSpecificDivs.other);
};

atb.viewer.ResourceListViewer.prototype.finishRender = function () {
    
};

atb.viewer.ResourceListViewer.prototype.onPaneLoaded = function() {
	this.syncTitle();
	
	if (this.scrollPosition) {
		this.field.scrollTop = this.scrollPosition;
	}
};

atb.viewer.ResourceListViewer.prototype.onPaneUnloaded = function () {
	this.scrollPosition = this.field.scrollTop;
};


atb.viewer.ResourceListViewer.prototype.onTitleChanged = function (newTitle)
{
	this.setTitle(newTitle);
};

atb.viewer.ResourceListViewer.prototype.onTitleChange = atb.viewer.ResourceListViewer.prototype.onTitleChanged;

atb.viewer.ResourceListViewer.prototype.isTitleEditable = function()
{
	return false;
};

atb.viewer.ResourceListViewer.prototype.setTitle = function(set_title)
{
	this.title = set_title;
	this.syncTitle();
}

atb.viewer.ResourceListViewer.prototype.syncTitle = function()
{
	var myPanel = this.getPanelContainer();
	if (myPanel !== null)
	{
		myPanel.setTitle(this.getTitle());
		myPanel.setTitleEditable(this.isTitleEditable());
	}
};

atb.viewer.ResourceListViewer.prototype.getTitle = function()
{
	return this.title;
};

atb.viewer.ResourceListViewer.prototype.refresh = function (e) {
    var newViewer = new this(this.clientApp, this.annoBodyId);
    this.getPanelContainer().setViewer_impl(newViewer);
    
    e.stopPropagation();
};

/**
 * Adds the given summary to a list map of all summaries by their ids
 * @protected
 *
 * @param resourceSummary {atb.resource.ResourceSummary}
 */
atb.viewer.ResourceListViewer.prototype.addToSummariesById_ = function (resourceSummary) {
    var id = resourceSummary.resourceId;
    
    if (this.summariesById[id]) {
        this.summariesById[id].push(resourceSummary);
    }
    else {
        this.summariesById[id] = [resourceSummary];
    }
};

/**
 * Calls the given function with every summary matching the given id
 *
 * @param id <string>
 * @param f {function(atb.resource.ResourceSummary}
 * @param opt_fScope {Object} scope in which to call f
 */
atb.viewer.ResourceListViewer.prototype.withAllSummariesMatchingId = function (id, f, opt_fScope) {
    var matchingSummaries = this.summariesById[id];
    
    if (! matchingSummaries) {
        return;
    }
    
    for (var i=0; i<matchingSummaries.length; i++) {
        f.call(opt_fScope || this, matchingSummaries[i]);
    }
};

/**
 * Calls the given function with each summary in this Finder
 *
 * @param f {function(atb.resource.ResourceSummary)}
 * @param opt_fScope {Object} scope in which to call f
 */
atb.viewer.ResourceListViewer.prototype.forEachSummary = function (f, opt_fScope) {
    for (var id in this.summariesById) {
        for (var i=0; i<this.summariesById[id].length; i++) {
            var summary = this.summariesById[id][i];
            
            f.call(opt_fScope || this, summary);
        }
    }
};

atb.viewer.ResourceListViewer.prototype.visualDeleteSummaryInternal_ = function (summary) {
    goog.array.remove(this.summariesById[summary.resourceId], summary);
    
    jQuery(summary.outerDiv).slideUp(400, function () {
                                     jQuery(summary.outerDiv).detach();
                                     });
    
    if (summary.parent && summary.parent.getChildSummaries) {
        var parentCollection = summary.parent;
        parentCollection.deleteChildSummary(summary);
        
        if (parentCollection.getNumChildSummaries() < 1 || summary.getView() == atb.resource.BODY_VIEW) {
            jQuery(parentCollection.outerDiv).slideUp(400, function () {
                                                      jQuery(parentCollection.outerDiv).detach();
                                                      });
        }
    }
};