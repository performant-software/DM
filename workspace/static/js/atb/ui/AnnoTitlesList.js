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
 * @param opt_uri {string} the id of the resource for which the list is being shown
 * @param opt_domHelper {goog.dom.DomHelper}
 */
atb.ui.AnnoTitlesList = function (clientApp, viewer, opt_uri, opt_domHelper) {
    this.clientApp = clientApp;
    this.viewer = viewer;
    this.databroker = this.clientApp.getDatabroker();

    this.uri = opt_uri;

    this.domHelper = opt_domHelper || new goog.dom.DomHelper();

    this.summaryStyleOptions = {
        showControls: false,
        titleOnly: true
    };

    this.summariesByUri = new goog.structs.Map ();
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

    if (this.uri) {
        this.loadForResource(this.uri);
    }
};

atb.ui.AnnoTitlesList.prototype.render = function (div) {
    var newDiv = this.domHelper.createDom('div');
    this.decorate(newDiv);
    div.appendChild(newDiv);

    return newDiv;
};

atb.ui.AnnoTitlesList.prototype.summaryClickHandler = function (uri, summary, event, opt_params) {
    if (!opt_params)
        opt_params = {};

    var resource = summary.resource;

    var eventDispatcher = this.clientApp.getEventDispatcher();
    var event = new atb.events.ResourceClicked(resource.getUri(), resource, this);
    eventDispatcher.dispatchEvent(event);

    var viewerGrid = this.clientApp.viewerGrid; console.log(this.viewer, viewerGrid.indexOf(this.viewer.container));
    var container = new atb.viewer.ViewerContainer(this.domHelper);
    viewerGrid.addViewerContainerAt(container, viewerGrid.indexOf(this.viewer.container) + 1);
    var viewer = atb.viewer.ViewerFactory.createViewerForUri(uri, this.clientApp);
    container.setViewer(viewer);
    viewer.loadResourceByUri(uri);
    container.autoResize();
};

atb.ui.AnnoTitlesList.prototype._renderSummaries = function (uris, list, renderDiv) {
    for (var i = 0; i < uris.length; i++) {
        var uri = uris[i];

        if (!uri) {
            continue;
        }
        else {
            var summary = atb.resource.ResourceSummaryFactory.createFromUri(uri, this.summaryClickHandler, this, this.clientApp, this.domHelper, this.summaryStyleOptions);
            this.summariesByUri.set(uri, summary);

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
            }.bind(this);

            if (summary) {
                render(list, renderDiv);
            }
        }
    }
};

atb.ui.AnnoTitlesList.prototype.loadForResource = function (uri) {
    console.log('uri', uri);
    this.uri = uri;
    
    jQuery(this.noAnnosDiv).hide();

    var deferredResource = this.databroker.getDeferredResource(uri);

    var withResource = function(resource) {
        var annoUris = this.databroker.getResourceAnnoIds(resource.getUri());

        var bodyUris = [];
        var targetUris = [];

        goog.structs.forEach(annoUris, function(annoUri) {
            var annoResource = this.databroker.getResource(annoUri);
            goog.array.extend(bodyUris, sc.util.Namespaces.stripAngleBrackets(annoResource.getProperties('oa:hasBody')));
            goog.array.extend(targetUris, sc.util.Namespaces.stripAngleBrackets(annoResource.getProperties('oa:hasTarget')));
        }, this);

        console.log('annoUris', annoUris, 'bodies', bodyUris, 'targets', targetUris);

        if (bodyUris.length + targetUris.length == 0 && deferredResource.state() == 'resolved') {
            jQuery(this.noAnnosDiv).show();
        }
        else if (bodyUris.length + targetUris.length > 0) {
            if (bodyUris.length > 0) {
                this._renderSummaries(bodyUris, this.bodySummaries, this.bodyTitlesDiv);

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

            if (targetUris.length > 0) {
                this._renderSummaries(targetUris, this.targetSummaries, this.targetTitlesDiv);

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
        }
    }.bind(this);
    deferredResource.done(withResource);
}; 