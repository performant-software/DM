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

sc.SearchViewer.prototype._buildModalBody = function() {
    this.searchDetailsDiv = this.domHelper.createDom('div', {'class': 'sc-SearchViewer-search-details'});
    this.modalBody.appendChild(this.searchDetailsDiv);

    this.workingResources.render(this.modalBody);

    this.messageDiv = this.domHelper.createDom('div', {'class': 'sc-SearchViewer-message'});
    jQuery(this.messageDiv).hide();
    this.modalBody.appendChild(this.messageDiv);
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
    if ( this.viewerGrid.isOpen(resource.uri)) {
       var container = this.viewerGrid.getContainer(resource.uri);
       if (goog.isFunction(scrollIntoView)) scrollIntoView(container.getElement());
    } else {
       var container = new atb.viewer.ViewerContainer(this.domHelper);
       this.viewerGrid.addViewerContainer(resource.uri, container);
   
       if (goog.isFunction(scrollIntoView)) scrollIntoView(container.getElement());
   
       var viewer = atb.viewer.ViewerFactory.createViewerForUri(resource.uri, this.clientApp);
       container.setViewer(viewer);
   
       if ( !this.projectController.userHasPermissionOverProject(null, null, sc.data.ProjectController.PERMISSIONS.update)) {
           viewer.makeUneditable();
           viewer.loadResourceByUri(resource.uri);
           container.autoResize();
       } else {
       
          // Check lock status of this resource
          $.ajax({
             url: "/store/lock/"+resource.uri,
             method: "GET",
             complete: function(jqXHR, textStatus) {
                if ( textStatus == "success" ) {
                   if ( jqXHR.responseJSON.locked ) {
                      // Resource is locked. See if it us by the current user
                      if ( $("#logged-in-user").text() == jqXHR.responseJSON.user ) {
                         // Logged in user has lock; leave editable and show unlocked info
                         viewer.lockStatus(resource.uri,true,true, jqXHR.responseJSON.email, jqXHR.responseJSON.date);
                      } else {
                         // Someone else has lock. Readonly, and show lock holder details
                         viewer.lockStatus(resource.uri, true, false, jqXHR.responseJSON.email, jqXHR.responseJSON.date);
                         viewer.makeUneditable();
                      }
                   } else {
                      // Not locked by anyone. Default to read only
                      viewer.makeUneditable();
                      viewer.lockStatus(resource.uri,false,false,"","");
                   }
                   
                   viewer.loadResourceByUri(resource.uri);
                   container.autoResize();
                   
                } else {
                   alert("Unable to determine lock status. For safety, this resource will be locked");
                   viewer.makeUneditable();
                   
                   
                   viewer.loadResourceByUri(resource.uri);
                   container.autoResize();
                }
             }
           });
       }
    }
};

sc.SearchViewer.prototype._handleSearchFieldKeydown = function(event) {
    if (event.keyCode == goog.events.KeyCodes.ENTER || event.keyCode == goog.events.KeyCodes.MAC_ENTER) {
        this.query(this.searchField.value);
    }
};

sc.SearchViewer.prototype.setSearchDetails = function(query, results, spellingSuggestion) {
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

sc.SearchViewer.prototype.clearSearchDetails = function() {
    jQuery(this.searchDetailsDiv).empty();
};

sc.SearchViewer.prototype.query = function(query) {
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

sc.SearchViewer.prototype.showMessage = function(message) {
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

sc.SearchViewer.prototype.hideMessage = function() {
    jQuery(this.messageDiv).hide();
};
