goog.provide('dm.viewer.SearchViewer');

goog.require('goog.dom.DomHelper');
goog.require('goog.events');
goog.require('goog.structs');

goog.require('dm.widgets.WorkingResources');
goog.require('dm.widgets.SearchResultItem');

/**
 * @class
 * User Interface object for performing searches, showing results, and opening the chosen results.
 * @param  {dm.ClientApp} clientApp
 * @param  {goog.dom.DomHelper?} opt_domHelper
 */
dm.viewer.SearchViewer = function(clientApp, opt_domHelper) {
    this.clientApp = clientApp;
    this.databroker = clientApp.databroker;
    this.searchClient = this.databroker.searchClient;
    this.projectController = this.databroker.projectController;
    goog.events.listen(this.projectController, "projectSelected", this._handleProjectSelected, false, this);

    this.viewerGrid = clientApp.viewerGrid;

    this.domHelper = opt_domHelper || new goog.dom.DomHelper();

    this.workingResources = new dm.widgets.WorkingResources(this.databroker, this.domHelper);
    goog.events.listen(this.workingResources, 'openRequested', this._handleWorkingResourcesOpenRequest, false, this);

    this.element = this.domHelper.createDom('div', {'class': 'modal hide fade sc-SearchViewer-modal'});
    this._buildModal();
    this.render('body');
    this.addListenersToButton('#searchButton');
};

dm.viewer.SearchViewer.prototype.getElement = function() {
    return this.element;
};

dm.viewer.SearchViewer.prototype.render = function(parent) {
    jQuery(parent).append(this.element);
};

dm.viewer.SearchViewer.prototype._buildModal = function() {
    jQuery(this.element).on('shown', function(event) {
        this.searchField.focus();
    }.bind(this));

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

dm.viewer.SearchViewer.prototype._buildModalHeader = function() {
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
    this.lastAutocompleteSuggestions = [];
    jQuery(this.searchField).typeahead({
        'source': function(query, callback) {
            callback([query].concat(this.lastAutocompleteSuggestions));
            this.searchClient.autocomplete(query, function(suggestions) {
                callback([query].concat(suggestions));
                this.lastAutocompleteSuggestions = suggestions;
            }.bind(this));
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

dm.viewer.SearchViewer.prototype._buildModalBody = function() {
    this.searchDetailsDiv = this.domHelper.createDom('div', {'class': 'sc-SearchViewer-search-details'});
    this.modalBody.appendChild(this.searchDetailsDiv);

    this.workingResources.render(this.modalBody);

    this.messageDiv = this.domHelper.createDom('div', {'class': 'sc-SearchViewer-message'});
    jQuery(this.messageDiv).hide();
    this.modalBody.appendChild(this.messageDiv);
};

dm.viewer.SearchViewer.prototype.showModal = function() {
    jQuery(this.element).modal('show');
};

dm.viewer.SearchViewer.prototype.hideModal = function() {
    jQuery(this.element).modal('hide');
};

dm.viewer.SearchViewer.prototype.toggleModal = function() {
    jQuery(this.element).modal('toggle');
};

dm.viewer.SearchViewer.prototype.addListenersToButton = function(button) {
    jQuery(button).on('click', function(event) {
        this.toggleModal();
    }.bind(this));
};

dm.viewer.SearchViewer.prototype._handleWorkingResourcesOpenRequest = function(event) {
    this.openViewerForResource(event.resource);
};

dm.viewer.SearchViewer.prototype.openViewerForResource = function(resource) {
    var resource = this.databroker.getResource(resource);
    var clone = this.viewerGrid.isOpen(resource.uri);


    var container = new dm.viewer.ViewerContainer(this.domHelper);
    this.viewerGrid.addViewerContainer(resource.uri, container);

    this.clientApp.scrollIntoView(container.getElement());

    var viewer = this.clientApp.createViewerForUri(resource.uri);
    viewer.readOnlyClone = clone;
    container.setViewer(viewer);

    if ( clone || !this.projectController.userHasPermissionOverProject(null, null, dm.data.ProjectController.PERMISSIONS.update)) {
        viewer.makeUneditable();
        viewer.loadResourceByUri(resource.uri);
        container.autoResize();
    } else {
       // resources are ALWAYS locked when first opened
       viewer.makeUneditable();
       viewer.lockStatus(resource.uri,false,false,"","");
       viewer.loadResourceByUri(resource.uri);
       container.autoResize();

    }
};

dm.viewer.SearchViewer.prototype._handleSearchFieldKeydown = function(event) {
    if (event.keyCode == goog.events.KeyCodes.ENTER || event.keyCode == goog.events.KeyCodes.MAC_ENTER) {
        this.query(this.searchField.value);
    }
};

dm.viewer.SearchViewer.prototype._handleProjectSelected = function(event) {
    this.searchField.value = "";
    this.hideMessage();
    this.clearResults();
    this.clearSearchDetails();
};

dm.viewer.SearchViewer.prototype.setSearchDetails = function(query, results, spellingSuggestion) {
    this.clearSearchDetails();

    jQuery(this.searchDetailsDiv).text('Showing ' + results.length + ' results for \u201c' + query + '\u201d');

    if (spellingSuggestion) {
        var didYouMean = this.domHelper.createDom('span', {'class': 'sc-SearchViewer-spelling-suggestion'},
            'Did you mean \u201c' + spellingSuggestion + '\u201d');
        goog.events.listen(didYouMean, 'click', function(event) {
            event.stopPropagation();
            this.searchField.value = spellingSuggestion;
            this.query(spellingSuggestion);
        }, false, this);
        jQuery(this.searchDetailsDiv).append('. ').append(didYouMean);
    }
};

dm.viewer.SearchViewer.prototype.clearSearchDetails = function() {
    jQuery(this.searchDetailsDiv).empty();
};

dm.viewer.SearchViewer.prototype.query = function(query) {
    if (query.length > 0) {
        this.searchClient.query(query, function(results, spellingSuggestion, queryReturned) {
            if (results.length > 0 || spellingSuggestion) {
                this.hideMessage();
                this.setSearchDetails(queryReturned, results, spellingSuggestion);
                this.setResults(results);
            }
            else {
                this.clearResults();
                this.clearSearchDetails();
                this.showMessage('No search results for \u201c' + query + '\u201d');
            }
        }.bind(this), function(textStatus) {
            this.showMessage('Network Error: ' + textStatus);
        }.bind(this));
    }
    else {
        this.clearResults();
        this.clearSearchDetails();
        this.showMessage('Enter a search query above');
        this.searchField.focus();
    }
};

dm.viewer.SearchViewer.prototype.createSearchResultItem = function(result) {
    var uri = result.uri;

    var item = new dm.widgets.SearchResultItem(this.databroker, uri, this.domHelper);
    item.setHighlightedTitle(result.highlighted_title);
    item.setText(result.highlighted_text);
    item.setImage(result.image, result.imageWidth, result.imageHeight);

    return item;
};

dm.viewer.SearchViewer.prototype.setResults = function(results) {
    this.clearResults();

    var wrItems = [];

    for (var i=0, len=results.length; i<len; i++) {
        var result = results[i];

        wrItems.push(this.createSearchResultItem(result));
    }

    this.workingResources.addItems(wrItems);
};

dm.viewer.SearchViewer.prototype.clearResults = function() {
    this.workingResources.clear();
};

dm.viewer.SearchViewer.prototype.showMessage = function(message) {
    jQuery(this.messageDiv).text(message);

    // Calculate the height of the div without actually showing it
    jQuery(this.messageDiv).css({'visibility': 'hidden', 'display': 'block'});
    var textHeight = jQuery(this.messageDiv).height();
    jQuery(this.messageDiv).css({'display': 'none', 'visibility': 'visible'});

    var div = this.modalBody;

    var top = (jQuery(div).height()) / 2 - (textHeight / 2);
    var left = 0;
    var width = jQuery(div).width();
    jQuery(this.messageDiv).css({'top': top, 'left': left, 'width': width});

    jQuery(this.messageDiv).fadeIn(400);
};

dm.viewer.SearchViewer.prototype.hideMessage = function() {
    jQuery(this.messageDiv).hide();
};
