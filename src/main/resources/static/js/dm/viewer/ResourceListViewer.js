goog.provide('dm.viewer.ResourceListViewer');

goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.ui.ToolbarButton');

goog.require("dm.util.StyleUtil");
goog.require("dm.util.ReferenceUtil");
goog.require('dm.viewer.Viewer');


/**
 * dm.viewer.ResourceListViewer
 *
 * Displays a list of dm.resource.ResourceSummaryView objects
 *
 * @author tandres@drew.edu (Tim Andres)
 * @constructor
 * @extends {dm.viewer.Viewer}
 *
 * @abstract
 *
 * @param set_clientApp {dm.ClientApp}
 */
dm.viewer.ResourceListViewer = function(set_clientApp) {
	dm.viewer.Viewer.call(this, set_clientApp);
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
goog.inherits(dm.viewer.ResourceListViewer, dm.viewer.Viewer);

dm.viewer.ResourceListViewer.prototype.addResourceSummary = function (resourceSummary) {
    if (! (resourceSummary.resourceId in this.renderedById)) {
        this.summaries.push(resourceSummary);
        this.renderedById[resourceSummary.resourceId] = resourceSummary;

        this.renderSummaryInProperGroup(resourceSummary);
    }
};

dm.viewer.ResourceListViewer.prototype.renderSummaryInProperGroup = function (resourceSummary) {
    var insert = function (list) {
        var index = goog.array.binarySearch(list, resourceSummary, dm.resource.ResourceSummary.sortByTitle);
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

dm.viewer.ResourceListViewer.prototype.addResourceSummaries = function (resourceSummaryViewers) {
    for (var x in resourceSummaryViewers) {
        this.addResourceSummary(resourceSummaryViewers[x]);
    }
};

dm.viewer.ResourceListViewer.prototype.clearSummaries = function () {
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
dm.viewer.ResourceListViewer.prototype.addResourceSummaryById = function (resourceId) {
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
dm.viewer.ResourceListViewer.prototype.addResourceSummariesByIds = function (resourceIds) {
    for (var x in resourceIds) {
        if (resourceIds[x]) {
            this.addResourceSummaryById(resourceIds[x]);
        }
    }
};

/**
 * @deprecated
 */

dm.viewer.ResourceListViewer.prototype.addSummaryFromJSONData = function (jsonDataObj) {
    var resource = dm.resource.ResourceFactory.createFromJSON(jsonDataObj);

    this.addResourceSummaries(this.createSummariesFromResource(resource))
};

/**
 * @deprecated
 */

dm.viewer.ResourceListViewer.prototype.addSummariesFromJSONData = function (jsonDataObjs) {
    for (var x in jsonDataObjs) {
        var json = jsonDataObjs[x];

        this.addSummaryFromJSONData(json);
    }
};

/**
 * @deprecated
 */

dm.viewer.ResourceListViewer.prototype.addSummariesFromUserId = function (userId) {
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
 * All subclasses should implement this method to be passed to {dm.resource.ResourceSummary}
 * objects
 */
dm.viewer.ResourceListViewer.prototype.handleResourceSummaryClick = function (id, summaryObject, event, opt_params) {

};

dm.viewer.ResourceListViewer.prototype.render = function () {
    if (this.rootDiv != null) {
        return;//already rendered...?!
    }

    dm.viewer.Viewer.prototype.render.call(this);

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

dm.viewer.ResourceListViewer.prototype.finishRender = function () {

};

dm.viewer.ResourceListViewer.prototype.onPaneLoaded = function() {
	this.syncTitle();

	if (this.scrollPosition) {
		this.field.scrollTop = this.scrollPosition;
	}
};

dm.viewer.ResourceListViewer.prototype.onPaneUnloaded = function () {
	this.scrollPosition = this.field.scrollTop;
};


dm.viewer.ResourceListViewer.prototype.onTitleChanged = function (newTitle)
{
	this.setTitle(newTitle);
};

dm.viewer.ResourceListViewer.prototype.onTitleChange = dm.viewer.ResourceListViewer.prototype.onTitleChanged;

dm.viewer.ResourceListViewer.prototype.isTitleEditable = function()
{
	return false;
};

dm.viewer.ResourceListViewer.prototype.setTitle = function(set_title)
{
	this.title = set_title;
	this.syncTitle();
}

dm.viewer.ResourceListViewer.prototype.syncTitle = function()
{
	var myPanel = this.getPanelContainer();
	if (myPanel !== null)
	{
		myPanel.setTitle(this.getTitle());
		myPanel.setTitleEditable(this.isTitleEditable());
	}
};

dm.viewer.ResourceListViewer.prototype.getTitle = function()
{
	return this.title;
};

dm.viewer.ResourceListViewer.prototype.refresh = function (e) {
    var newViewer = new this(this.clientApp, this.annoBodyId);
    this.getPanelContainer().setViewer_impl(newViewer);

    e.stopPropagation();
};

/**
 * Adds the given summary to a list map of all summaries by their ids
 * @protected
 *
 * @param resourceSummary {dm.resource.ResourceSummary}
 */
dm.viewer.ResourceListViewer.prototype.addToSummariesById_ = function (resourceSummary) {
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
 * @param f {function(dm.resource.ResourceSummary}
 * @param opt_fScope {Object} scope in which to call f
 */
dm.viewer.ResourceListViewer.prototype.withAllSummariesMatchingId = function (id, f, opt_fScope) {
    var matchingSummaries = this.summariesById[id];

    if (! matchingSummaries) {
        return;
    }

    for (var i=0; i<matchingSummaries.length; i++) {
        f.call(opt_fScope || this, matchingSummaries[i]);
    }
};

/**
 * Calls the given function with each summary in this viewer
 *
 * @param f {function(dm.resource.ResourceSummary)}
 * @param opt_fScope {Object} scope in which to call f
 */
dm.viewer.ResourceListViewer.prototype.forEachSummary = function (f, opt_fScope) {
    for (var id in this.summariesById) {
        for (var i=0; i<this.summariesById[id].length; i++) {
            var summary = this.summariesById[id][i];

            f.call(opt_fScope || this, summary);
        }
    }
};

dm.viewer.ResourceListViewer.prototype.visualDeleteSummaryInternal_ = function (summary) {
    goog.array.remove(this.summariesById[summary.resourceId], summary);

    jQuery(summary.outerDiv).slideUp(400, function () {
                                     jQuery(summary.outerDiv).detach();
                                     });

    if (summary.parent && summary.parent.getChildSummaries) {
        var parentCollection = summary.parent;
        parentCollection.deleteChildSummary(summary);

        if (parentCollection.getNumChildSummaries() < 1 || summary.getView() == dm.resource.BODY_VIEW) {
            jQuery(parentCollection.outerDiv).slideUp(400, function () {
                                                      jQuery(parentCollection.outerDiv).detach();
                                                      });
        }
    }
};
