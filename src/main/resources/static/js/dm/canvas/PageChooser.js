goog.provide('dm.canvas.PageChooser');

goog.require('goog.events.EventTarget');

dm.canvas.PageChooser = function(button, databroker) {
    goog.events.EventTarget.call(this);

    this.databroker = databroker;
    this.button = button;

    this.button.setEnabled(false);

    this.baseDiv = document.createElement('div');
    jQuery(this.baseDiv).addClass('sc-canvas-PageChooser');

    this.glassPaneDiv = document.createElement('div');
    jQuery(this.glassPaneDiv).css({
        'position': 'absolute',
        'top': 0,
        'left': 0,
        'width': '100%',
        'height': '100%',
        'z-index': 10000
    });
    goog.events.listen(this.glassPaneDiv, 'click', this.handleGlassPaneClick,
                       false, this);
    
    this.pagesElement = document.createElement('ul');
    jQuery(this.pagesElement).addClass('sc-canvas-PageChooser-pages');
    jQuery(this.pagesElement).hide();
    
    this.glassPaneDiv.appendChild(this.pagesElement);
    
    this.isShowingChoices = false;

    this.pageUris = [];
};
goog.inherits(dm.canvas.PageChooser, goog.events.EventTarget);

dm.canvas.PageChooser.prototype.getElement = function() {
    return this.baseDiv;
};

dm.canvas.PageChooser.prototype.render = function(div) {
    div.appendChild(this.baseDiv);
};

dm.canvas.PageChooser.prototype.clear = function() {
    jQuery(this.pagesElement).empty();
    this.button.setEnabled(false);
    this.pageUris = [];
};

dm.canvas.PageChooser.prototype.addPage = function(uri, opt_currentUri) {
    this.addPages([uri], opt_currentUri);
};

dm.canvas.PageChooser.prototype.addPages = function(uris, opt_currentUri) {
    this.pageUris = this.pageUris.concat(uris);

    this.button.setEnabled(true);

    goog.structs.forEach(uris, function(uri) {
        var resource = this.databroker.getResource(uri);
        var title = this.databroker.dataModel.getTitle(resource);

        var li = document.createElement('li');
        jQuery(li).text(title);
        jQuery(li).data('pageUri', uri);
        jQuery(li).click(this.handlePageClick.bind(this));

        if (uri == opt_currentUri) {
            jQuery(li).addClass('sc-canvas-PageChooser-currentPage');
        }

        jQuery(this.pagesElement).append(li);
    }, this);
};

dm.canvas.PageChooser.prototype.handlePageClick = function(event) {
    var li = event.target;
    var uri = jQuery(li).data('pageUri');

    var customEvent = new goog.events.Event('pageChosen', this);
    customEvent.uri = uri;

    this.dispatchEvent(customEvent);
};

dm.canvas.PageChooser.prototype.showChoices = function() {
    var self = this;
    
    this.button.setChecked(true);
    
    var $button = jQuery(this.button.getElement());
    var buttonOffset = $button.offset();
    
    jQuery(this.pagesElement).css({
        'top': buttonOffset.top + $button.outerHeight(),
        'left': buttonOffset.left
    });
    jQuery('body').prepend(this.glassPaneDiv);
    jQuery(this.pagesElement).slideDown(200, function() {
                                     self.isShowingChoices = true;
                                     });
};

dm.canvas.PageChooser.prototype.hideChoices = function() {
    var self = this;
    
    this.button.setChecked(false);
    
    jQuery(this.pagesElement).slideUp(200, function() {
                                   self.isShowingChoices = false;
                                   jQuery(self.glassPaneDiv).detach();
                                   });
};

dm.canvas.PageChooser.prototype.handleGlassPaneClick = function(event) {
    if (event.target == this.glassPaneDiv) {
        event.stopPropagation();
        
        this.hideChoices();
    }
};