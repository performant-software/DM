goog.provide('sc.canvas.PageChooser');

goog.require('goog.events.EventTarget');
goog.require('jquery.jQuery');

sc.canvas.PageChooser = function(button, databroker) {
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
goog.inherits(sc.canvas.PageChooser, goog.events.EventTarget);

sc.canvas.PageChooser.prototype.getElement = function() {
    return this.baseDiv;
};

sc.canvas.PageChooser.prototype.render = function(div) {
    div.appendChild(this.baseDiv);
};

sc.canvas.PageChooser.prototype.clear = function() {
    jQuery(this.pagesElement).empty();
    this.button.setEnabled(false);
    this.pageUris = [];
};

sc.canvas.PageChooser.prototype.addPage = function(uri) {
    this.addPages([uri]);
};

sc.canvas.PageChooser.prototype.addPages = function(uris) {
    this.pageUris = this.pageUris.concat(uris);

    this.button.setEnabled(true);

    goog.structs.forEach(uris, function(uri) {
        var resource = this.databroker.getResource(uri);
        var title = resource.getOneProperty('dc:title');

        var li = document.createElement('li');
        jQuery(li).text(title);
        jQuery(li).data('pageUri', uri);
        jQuery(li).click(this.handlePageClick.bind(this));
        jQuery(this.pagesElement).append(li);
    }, this);
};

sc.canvas.PageChooser.prototype.handlePageClick = function(event) {
    var li = event.target;
    var uri = jQuery(li).data('pageUri');

    var customEvent = new goog.events.Event('pageChosen', this);
    customEvent.uri = uri;

    this.dispatchEvent(customEvent);
};

sc.canvas.PageChooser.prototype.showChoices = function() {
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

sc.canvas.PageChooser.prototype.hideChoices = function() {
    var self = this;
    
    this.button.setChecked(false);
    
    jQuery(this.pagesElement).slideUp(200, function() {
                                   self.isShowingChoices = false;
                                   jQuery(self.glassPaneDiv).detach();
                                   });
};

sc.canvas.PageChooser.prototype.handleGlassPaneClick = function(event) {
    if (event.target == this.glassPaneDiv) {
        event.stopPropagation();
        
        this.hideChoices();
    }
};