goog.provide('sc.canvas.ImageChoicePicker');

goog.require('goog.ui.Button');
goog.require('goog.ui.CustomButton');
goog.require('goog.structs.Set');

sc.canvas.ImageChoicePicker = function(button, databroker, imageWidth) {
    this.databroker = databroker;
    this.imageWidth = imageWidth;
    
    this.baseDiv = document.createElement('div');
    jQuery(this.baseDiv).addClass('sc-canvas-ImageChoicePicker');
    
    this.button = button;
    this.button.setEnabled(false);
    
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
    
    this.imagesDiv = document.createElement('div');
    jQuery(this.imagesDiv).addClass('sc-canvas-ImageChoicePicker-images');
    jQuery(this.imagesDiv).hide();
    
    this.glassPaneDiv.appendChild(this.imagesDiv);
    
    this.isShowingChoices = false;
    
    this.uris = new goog.structs.Set();
};

sc.canvas.ImageChoicePicker.prototype.getElement = function() {
    return this.baseDiv;
};

sc.canvas.ImageChoicePicker.prototype.render = function(div) {
    div.appendChild(this.baseDiv);
};

sc.canvas.ImageChoicePicker.prototype.clear = function() {
    jQuery(this.imagesDiv).empty();
    this.uris.clear();
    this.button.setEnabled(false);
};

sc.canvas.ImageChoicePicker.prototype.addImage = function(uri, choiceHandler) {
    this.uris.add(uri);
    this.button.setEnabled(true);
    
    var resource = this.databroker.getResource(uri);
    var src = this.databroker.getImageSrc(uri, this.imageWidth);
    
    var title = this.databroker.dataModel.getTitle(resource) ||
    uri.substring(uri.lastIndexOf('/') + 1);
    
    var img = new Image();
    img.src = src;
    img.width = this.imageWidth;
    img.title = title;
    
    goog.events.listen(img, 'click', function(event) {
                       choiceHandler(uri, event);
                       });
    
    this.imagesDiv.appendChild(img);
};

sc.canvas.ImageChoicePicker.prototype.showChoices = function() {
    var self = this;
    
    this.button.setChecked(true);
    
    var $button = jQuery(this.button.getElement());
    var buttonOffset = $button.offset();
    
    jQuery(this.imagesDiv).css({
        'top': buttonOffset.top + $button.outerHeight(),
        'left': buttonOffset.left
    });
    jQuery('body').prepend(this.glassPaneDiv);
    jQuery(this.imagesDiv).slideDown(200, function() {
                                     self.isShowingChoices = true;
                                     });
};

sc.canvas.ImageChoicePicker.prototype.hideChoices = function() {
    var self = this;
    
    this.button.setChecked(false);
    
    jQuery(this.imagesDiv).slideUp(200, function() {
                                   self.isShowingChoices = false;
                                   jQuery(self.glassPaneDiv).detach();
                                   });
};

sc.canvas.ImageChoicePicker.prototype.handleGlassPaneClick = function(event) {
    if (event.target == this.glassPaneDiv) {
        event.stopPropagation();
        
        this.hideChoices();
    }
};