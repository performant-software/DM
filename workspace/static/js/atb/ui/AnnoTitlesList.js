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
        showControls: true,
        titleOnly: true
    };

    this.summariesByUri = new goog.structs.Map();
    this.targetSummaries = [];
    this.bodySummaries = [];

    this.bodyAnnoResourcesByUri = new sc.util.DefaultDict(function(){return [];});
    this.targetAnnoResourcesByUri = new sc.util.DefaultDict(function(){return [];});
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

    this.loadingDiv = this.domHelper.createDom('div', {
        'class': 'atb-annoTitlesList-loadingMessage'
    }, 'finding annotations...');
    jQuery(this.loadingDiv).hide();
    this.scrollingDiv.appendChild(this.loadingDiv);

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

atb.ui.AnnoTitlesList.prototype.clear = function() {
    this.uri = null;

    this.summariesByUri = new goog.structs.Map();
    this.targetSummaries = [];
    this.bodySummaries = [];

    this.bodyAnnoResourcesByUri = new sc.util.DefaultDict(function(){return [];});
    this.targetAnnoResourcesByUri = new sc.util.DefaultDict(function(){return [];});

    jQuery(this.bodyTitlesDiv).empty();
    jQuery(this.targetTitlesDiv).empty();
};

atb.ui.AnnoTitlesList.prototype.summaryClickHandler = function (event) {
    var uri = event.resource.uri;
    var summary = event.currentTarget;

    var resource = event.resource;

    var eventDispatcher = this.clientApp.getEventDispatcher();
    var resourceClickEvent = new atb.events.ResourceClick(resource.getUri(), eventDispatcher, this);
    if (eventDispatcher.dispatchEvent(resourceClickEvent)) {
        var deferredResource = this.databroker.getDeferredResource(uri);

        var viewerGrid = this.clientApp.viewerGrid;
        var container = new atb.viewer.ViewerContainer(this.domHelper);
        viewerGrid.addViewerContainerAt(container, viewerGrid.indexOf(this.viewer.container) + 1);

        if (goog.isFunction(scrollIntoView)) scrollIntoView(container.getElement());

        var viewer = atb.viewer.ViewerFactory.createViewerForUri(uri, this.clientApp);
        container.setViewer(viewer);

        deferredResource.done(function() {
            viewer.loadResourceByUri(uri);
            if (this.viewer && this.viewer.isEditable && !this.viewer.isEditable()) {
                if (viewer.makeUneditable) viewer.makeUneditable();
            }
            container.autoResize();
        }.bind(this));
    }
};

atb.ui.AnnoTitlesList.prototype.deleteClickHandler = function(event) {
    var resource = event.resource;
    var uri = event.resource.uri;
    var summary = event.currentTarget;

    if (summary.relationType == 'body') {
        var annos = this.bodyAnnoResourcesByUri.get(uri);

        goog.structs.forEach(annos, function(anno) {
            this.databroker.dataModel.unlinkTargetFromAnno(anno, this.uri, true);
        }, this);

        this.removeSummary(summary, this.bodySummaries);
    }
    else if (summary.relationType == 'target') {
        var annos = this.targetAnnoResourcesByUri.get(uri);

        goog.structs.forEach(annos, function(anno) {
            this.databroker.dataModel.unlinkBodyFromAnno(anno, this.uri, true);
        }, this);

        this.removeSummary(summary, this.targetSummaries);
    }
};

atb.ui.AnnoTitlesList.prototype._renderSummaries = function (uris, list, renderDiv, relationType) {
    for (var i = 0; i < uris.length; i++) {
        var uri = uris[i];

        if (!uri || uri == this.uri) {
            continue;
        }
        else {
            var summary = atb.resource.ResourceSummaryFactory.createFromUri(uri, this, this.clientApp, this.domHelper, this.summaryStyleOptions);

            if (! summary) {
                continue;
            }

            this.summariesByUri.set(uri, summary);

            summary.relationType = relationType;

            goog.events.listen(summary, 'click', this.summaryClickHandler, false, this);
            goog.events.listen(summary, 'delete-click', this.deleteClickHandler, false, this);

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

                if (this.viewer && this.viewer.isEditable && this.viewer.isEditable()) {
                    summary.enableDelete();
                }
            }
        }
    }
};

atb.ui.AnnoTitlesList.prototype.removeSummary = function(summary, list) {
    jQuery(summary.getElement()).animate({
        left: '100%',
        opacity: 0.0,
        height: 0
    }, 300, function() {
        jQuery(this).detach();
    });

    goog.array.remove(list, summary);
};

atb.ui.AnnoTitlesList.prototype.loadForResource = function (uri) {
    this.clear();

    if (uri instanceof sc.data.Resource) uri = uri.uri;

    console.log('uri of hovered resource', uri);
    this.uri = uri;
    
    jQuery(this.noAnnosDiv).hide();
    jQuery(this.loadingDiv).show();

    var deferredResource = this.databroker.getDeferredResource(uri);

    var withResource = function(resource) {
        var bodyAnnoResources = resource.getReferencingResources('oa:hasTarget');
        var targetAnnoResources = resource.getReferencingResources('oa:hasBody');

        var bodyUris = new goog.structs.Set();
        var targetUris = new goog.structs.Set();

        goog.structs.forEach(bodyAnnoResources, function(anno) {
            goog.structs.forEach(anno.getProperties('oa:hasBody'), function(bodyUri) {
                bodyUris.add(bodyUri);
                this.bodyAnnoResourcesByUri.get(bodyUri).push(anno);
            }, this);
        }, this);
        goog.structs.forEach(targetAnnoResources, function(anno) {
            goog.structs.forEach(anno.getProperties('oa:hasTarget'), function(targetUri) {
                targetUris.add(targetUri);
                this.targetAnnoResourcesByUri.get(targetUri).push(anno);
            }, this);
        }, this);

        jQuery(this.loadingDiv).hide();

        if (bodyUris.getCount() + targetUris.getCount() == 0/* && deferredResource.state() == 'resolved'*/) {
            jQuery(this.noAnnosDiv).show();
        }
        else if (bodyUris.getCount() + targetUris.getCount() > 0) {
            if (bodyUris.getCount() > 0) {
                this._renderSummaries(bodyUris.getValues(), this.bodySummaries, this.bodyTitlesDiv, 'body');

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

            if (targetUris.getCount() > 0) {
                this._renderSummaries(targetUris.getValues(), this.targetSummaries, this.targetTitlesDiv, 'target');

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
    // withResource(this.databroker.getResource(uri));
}; 
