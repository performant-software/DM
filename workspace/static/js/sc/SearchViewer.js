goog.provide('sc.SearchViewer');

goog.require('goog.dom.DomHelper');
goog.require('goog.events');
goog.require('goog.structs');

goog.require('atb.widgets.WorkingResources');
goog.require('atb.widgets.SearchResultItem');

/**
 * @class
 * User Interface object for performing searches, showing results, and opening the chosen results.
 * @param  {atb.ClientApp} clientApp
 * @param  {goog.dom.DomHelper?} opt_domHelper
 */
sc.SearchViewer = function(clientApp, opt_domHelper) {
    this.clientApp = clientApp;
    this.databroker = clientApp.databroker;
    this.searchClient = this.databroker.searchClient;
    this.projectController = this.databroker.projectController;

    this.viewerGrid = clientApp.viewerGrid;

    this.domHelper = opt_domHelper || new goog.dom.DomHelper();

    this.workingResources = new atb.widgets.WorkingResources(this.databroker, this.domHelper);
    goog.events.listen(this.workingResources, 'openRequested', this._handleWorkingResourcesOpenRequest, false, this);

    this.element = this.domHelper.createDom('div', {'class': 'modal hide fade sc-SearchViewer-modal'});
    this._buildModal();
};

sc.SearchViewer.prototype.getElement = function() {
    return this.element;
};

sc.SearchViewer.prototype.render = function(parent) {
    jQuery(parent).append(this.element);
};

sc.SearchViewer.prototype._buildModal = function() {
    // Header
    this.modalHeader = this.domHelper.createDom('div', {'class': 'modal-header'});
    this._buildModalHeader();
    this.element.appendChild(this.modalHeader);

    // Body
    this.modalBody = this.domHelper.createDom('div', {'class': 'modal-body'});
    this._buildModalBody();
    this.element.appendChild(this.modalBody);

    // Footer
    this.modalFooter = this.domHelper.createDom('div', {'class': 'modal-footer'});
    var footerCloseButton = this.domHelper.createDom('button', {'class': 'btn btn-primary'}, 'Done');
    $(footerCloseButton).attr({
        'data-dismiss': 'modal',
        'aria-hidden': 'true'
    });
    this.modalFooter.appendChild(footerCloseButton);
    this.element.appendChild(this.modalFooter);
};

sc.SearchViewer.prototype._buildModalHeader = function() {
    var closeButton = this.domHelper.createDom('button', {'class': 'close'}, '×');
    $(closeButton).attr({
        'data-dismiss': 'modal',
        'aria-hidden': 'true'
    });
    // this.modalTitle = this.domHelper.createDom('h3', {}, 'Search');
    this.modalHeader.appendChild(closeButton);
    // this.modalHeader.appendChild(this.modalTitle);
    this.searchField = this.domHelper.createDom('input', {
        'type': 'text',
        'class': 'search-query sc-SearchViewer-searchField',
        'placeholder': 'Search...',
        'autocomplete': 'off'
    });
    jQuery(this.searchField).typeahead({
        'source': function(query, callback) {
            this.searchClient.autocomplete(query, function(suggestions) {
                callback([query].concat(suggestions));
            });
        }.bind(this),
        'matcher': function(query) {return true;},
        'updater': function(item) {
            this.query(item);
            return item;
        }.bind(this)
    });
    goog.events.listen(this.searchField, 'keydown', this._handleSearchFieldKeydown, false, this);
    this.modalHeader.appendChild(this.searchField);
};

sc.SearchViewer.prototype._buildModalBody = function() {
    this.workingResources.render(this.modalBody);
};

sc.SearchViewer.prototype.showModal = function() {
    jQuery(this.element).modal('show');
};

sc.SearchViewer.prototype.hideModal = function() {
    jQuery(this.element).modal('hide');
};

sc.SearchViewer.prototype.toggleModal = function() {
    jQuery(this.element).modal('toggle');
};

sc.SearchViewer.prototype.addListenersToButton = function(button) {
    jQuery(button).on('click', function(event) {
        this.toggleModal();
    }.bind(this));
};

sc.SearchViewer.prototype._handleWorkingResourcesOpenRequest = function(event) {
    this.openViewerForResource(event.resource);
};

sc.SearchViewer.prototype.openViewerForResource = function(resource) {
    var resource = this.databroker.getResource(resource);

    var container = new atb.viewer.ViewerContainer(this.domHelper);
    this.viewerGrid.addViewerContainer(container);

    if (goog.isFunction(scrollIntoView)) scrollIntoView(container.getElement());

    var viewer = atb.viewer.ViewerFactory.createViewerForUri(resource.uri, this.clientApp);
    container.setViewer(viewer);

    if (goog.isFunction(viewer.makeUneditable) &&
        !this.projectController.userHasPermissionOverProject(null, null, sc.data.ProjectController.PERMISSIONS.update)) {
        viewer.makeUneditable();
    }

    viewer.loadResourceByUri(resource.uri);
    container.autoResize();
};

sc.SearchViewer.prototype._handleSearchFieldKeydown = function(event) {
    if (event.keyCode == goog.events.KeyCodes.ENTER || event.keyCode == goog.events.KeyCodes.MAC_ENTER) {
        this.query(this.searchField.value);
    }
};

sc.SearchViewer.prototype.query = function(query) {
    this.searchClient.query(query, function(results, queryReturned, spellingSuggestion) {
        if (results.length > 0) {
            this.setResults(results);
        }
        else {
            this.clearResults();
            // Show no results message
        }
    }.bind(this), function(textStatus) {
        // Show network error message
    }.bind(this));
};

sc.SearchViewer.prototype.createSearchResultItem = function(result) {
    var uri = result.uri;

    var item = new atb.widgets.SearchResultItem(this.databroker, uri, this.domHelper);
    item.setHighlightedTitle(result.highlighted_title);
    item.setText(result.highlighted_text);

    return item;
};

sc.SearchViewer.prototype.setResults = function(results) {
    this.clearResults();

    var wrItems = [];

    for (var i=0, len=results.length; i<len; i++) {
        var result = results[i];

        wrItems.push(this.createSearchResultItem(result));
    }

    this.workingResources.addItems(wrItems);
};

sc.SearchViewer.prototype.clearResults = function() {
    this.workingResources.clear();
};
