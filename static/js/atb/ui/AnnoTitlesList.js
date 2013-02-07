goog.provide('atb.ui.AnnoTitlesList');

goog.require('atb.resource.ResourceSummaryFactory');
goog.require('atb.viewer.ViewerFactory');

goog.require('goog.dom.DomHelper');
goog.require('goog.structs.Map');
goog.require('goog.structs.Set');

/**
 * A "mini finder" to show up in tooltips for resources
 * @param clientApp {atb.ClientApp}
 * @param viewer {atb.viewer.Viewer}
 * @param opt_resourceId {string} the id of the resource for which the list is being shown
 * @param opt_domHelper {goog.dom.DomHelper}
 */
atb.ui.AnnoTitlesList = function (clientApp, viewer, opt_resourceId, opt_domHelper) {
    this.clientApp = clientApp;
    this.viewer = viewer;
    this.crawler = this.clientApp.getResourceCrawler();

    this.resourceId = opt_resourceId;

    this.domHelper = opt_domHelper || new goog.dom.DomHelper();

    this.summaryStyleOptions = {
        showControls: false,
        titleOnly: true
    };

    this.summariesById = new goog.structs.Map ();
    this.targetSummaries = [];
    this.bodySummaries = [];
};

atb.ui.AnnoTitlesList.prototype.decorate = function (div) {
    this.rootDiv = div;
    jQuery(this.rootDiv).addClass('atb-annoTitlesList');

    this.scrollingDiv = this.domHelper.createDom('div', {
        'class': 'atb-annoTitlesList-scroller'
    });

    this.bodyTitlesDiv = this.domHelper.createDom('div', {
        'class': 'atb-annoTitlesList-bodyTitles'
    });
    this.targetTitlesDiv = this.domHelper.createDom('div', {
        'class': 'atb-annoTitlesList-targetTitles'
    });

    this.scrollingDiv.appendChild(this.bodyTitlesDiv);
    this.scrollingDiv.appendChild(this.targetTitlesDiv);

    this.noAnnosDiv = this.domHelper.createDom('div', {
        'class': 'atb-annoTitlesList-noAnnosMessage'
    }, 'resource has no annotations');
    jQuery(this.noAnnosDiv).hide();

    this.scrollingDiv.appendChild(this.noAnnosDiv);

    this.rootDiv.appendChild(this.scrollingDiv);

    if (this.resourceId) {
        this.loadForResource(this.resourceId);
    }
};

atb.ui.AnnoTitlesList.prototype.render = function (div) {
    var newDiv = this.domHelper.createDom('div');
    this.decorate(newDiv);
    div.appendChild(newDiv);

    return newDiv;
};

atb.ui.AnnoTitlesList.prototype.summaryClickHandler = function (id, summary, event, opt_params) {
    if (!opt_params)
        opt_params = {};

    var resource = summary.resource;
    var type = resource.getType();

    var eventDispatcher = this.clientApp.getEventDispatcher();
    var event = new atb.events.ResourceClicked (resource.getId(), resource, this);
    eventDispatcher.dispatchEvent(event);

    var panelManager = this.clientApp.getPanelManager();
    panelManager.withAppropriatePanel(id, this.viewer.getPanelContainer(), function (panel) {
        atb.viewer.ViewerFactory.createViewerForResource(resource, panel, this.clientApp);
    }, this, atb.resource.ResourceSummary.HANDLER_MSG.swapPanels);
};

atb.ui.AnnoTitlesList.prototype.loadForResource = function (resourceId) {
    this.resourceId = resourceId;
    
    jQuery(this.noAnnosDiv).hide();

    var withResource = function (resource) {
        if (!resource) {
            jQuery(this.noAnnosDiv).show();
            return;
        }

        var topLevelIds = this.crawler.getTopLevelAnnoTitleIds(resourceId);

        var bodyIds = topLevelIds.bodies;
        var targetIds = topLevelIds.targets;

        if (bodyIds.length + targetIds.length == 0) {
            jQuery(this.noAnnosDiv).show();

            return;
        }

        var renderSummaries = function (ids, list, renderDiv) {
            for (var i = 0; i < ids.length; i++) {
                var topLevelId = ids[i];

                var resourceI = this.crawler.getResource(topLevelId);

                if (!resourceI) {
                    continue;
                }
                else {
                    var summary = atb.resource.ResourceSummaryFactory.createFromResource(resourceI, this.summaryClickHandler, this, this.clientApp, this.domHelper, this.summaryStyleOptions);
                    this.summariesById.set(resourceId, summary);

                    var render = function (list, div) {
                        var insert = function (list) {
                            var index = goog.array.binarySearch(list, summary, atb.resource.ResourceSummary.sortByTitle);
                            if (index < 0) {
                                goog.array.insertAt(list, summary, -(index + 1));
                                return -(index + 1);
                            }
                            else {
                                goog.array.insertAt(list, summary, index);
                                return index;
                            }
                        };

                        var index = insert(list);

                        if (index <= 0) {
                            var newDiv = summary.render();

                            jQuery(div).prepend(newDiv);
                        }
                        else {
                            var previousSummaryDiv = list[index - 1].outerDiv;
                            var newDiv = summary.render();

                            jQuery(previousSummaryDiv).after(newDiv);
                        }
                    };

                    render(list, renderDiv);
                }
            }
        };
        renderSummaries = atb.Util.scopeAsyncHandler(renderSummaries, this);

        if (bodyIds.length > 0) {
            renderSummaries(bodyIds, this.bodySummaries, this.bodyTitlesDiv);

            var headerDiv = this.domHelper.createDom('div', {
                'class': 'atb-annoTitlesList-header'
            }, 'annotations:');

            jQuery(this.bodyTitlesDiv).prepend(headerDiv);
        }
        else {
            var headerDiv = this.domHelper.createDom('div', {
                'class': 'atb-annoTitlesList-header'
            }, 'no annotations');

            jQuery(this.bodyTitlesDiv).prepend(headerDiv);
        }

        if (targetIds.length > 0) {
            renderSummaries(targetIds, this.targetSummaries, this.targetTitlesDiv);

            var headerDiv = this.domHelper.createDom('div', {
                'class': 'atb-annoTitlesList-header'
            }, 'targets:');

            jQuery(this.targetTitlesDiv).prepend(headerDiv);
        }
        else {
            var headerDiv = this.domHelper.createDom('div', {
                'class': 'atb-annoTitlesList-header'
            }, 'no targets');

            jQuery(this.targetTitlesDiv).prepend(headerDiv);
        }

        jQuery(this.targetTitlesDiv).prepend(this.domHelper.createDom('div', {
            'class': 'atb-annoTitlesList-hrDiv'
        }));

    };

    this.crawler.withResource(resourceId, withResource, this, null, false, true);
    //Just in case the resource isn't in the cache for some reason
    // the crawler will request it from the webService
}; 