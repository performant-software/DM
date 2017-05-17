goog.provide('dm.ui.InfoPane');

goog.require('dm.widgets.DialogWidget');
goog.require('goog.dom.DomHelper');
goog.require('goog.events');

dm.ui.InfoPane = function (clientApp, resourceId, opt_domHelper) {
    this.resourceId = resourceId;
    this.clientApp = clientApp;
    this.domHelper = opt_domHelper || new goog.dom.DomHelper(document);
    
    this.thumbOptions = {
        'paintMarker': dm.ui.InfoPane.DEFAULT_PAINT_MARKER,
        'width': dm.ui.InfoPane.DEFAULT_THUMB_WIDTH,
        'height': dm.ui.InfoPane.DEFAULT_THUMB_HEIGHT
    }
    
    this.dialog = new dm.widgets.DialogWidget({
        bModal: false,
        caption: "Marker Data",
        content: "",
        show_buttons: []
    });
    
    this.contentDiv = this.domHelper.createDom('div', {'style': 'width:700px;'});
    this.contentDiv.appendChild(this.createEmbedDiv_());
    
    this.dialog.setContentNode(this.contentDiv);
};

dm.ui.InfoPane.prototype.show = function () {
    this.dialog.show();
};

dm.ui.InfoPane.prototype.hide = function () {
    this.dialog.hide();
};

dm.ui.InfoPane.DEFAULT_PAINT_MARKER = false;
dm.ui.InfoPane.DEFAULT_THUMB_WIDTH = "";
dm.ui.InfoPane.DEFAULT_THUMB_HEIGHT = "";

dm.ui.InfoPane.prototype.getThumbUri = function (width, height, opt_paintMarker) {
    var id = this.resourceId;
    var wh = [width, height];
    var paintMarker = ! opt_paintMarker;
    
    // return this.webService.resourceJpgURI(id, wh, paintMarker);
};

dm.ui.InfoPane.prototype.createEmbedDiv_ = function () {
    var domHelper = this.domHelper;
    
    var div = domHelper.createDom('div', {'class': 'atb-infopane-section'});
    
    var title = domHelper.createDom('div', {'class': 'atb-infopane-sectionTitle'}, 'Thumbnail URL');
    
    
    var optionsDiv = domHelper.createDom('div', {'style': 'margin-left:15px;margin-top:5px;'});
    
    var paintMarkerCheckbox = domHelper.createDom('input', {'type': 'checkbox',
                                                  'id': 'paintMarkerCheckbox',
                                                  'checked': this.thumbOptions.paintMarker});
    var paintMarkerCheckboxLabel = 
        domHelper.createDom('label', 
                            {'for': 'paintMarkerCheckbox', 
                             'style': 'margin-left:13px;margin-right:3px;'}, 
                            ' include marker');
    
    goog.events.listen(paintMarkerCheckbox, goog.events.EventType.CHANGE, function () {
                       var checked = paintMarkerCheckbox.checked;
                       
                       this.updateThumbnailLink({'paintMarker': checked});
                       }, false, this);
    
    
    var widthLabel = domHelper.createDom('span', {}, 'width ');
    var heightLabel = domHelper.createDom('span', {'style': 'margin-left:13px;margin-right:3px;'}, 'height ');
    var widthInput = domHelper.createDom('input', {'type': 'text', 'size': 3, 'value': this.thumbOptions.width});
    var heightInput = domHelper.createDom('input', {'type': 'text', 'size': 3, 'value': this.thumbOptions.height});
    
    goog.events.listen(widthInput, 
                       goog.events.EventType.CHANGE, 
                       function () {
                           var w = parseInt(widthInput.value);
                       
                           if (isNaN(w)) {
                               /*
                               w = this.thumbOptions.width;
                               widthInput.value = w;
                               */
                               w = "";
                               widthInput.value = w;
                           }
                       
                           this.updateThumbnailLink({'width': w});
                       }, 
                       false, 
                       this);

    goog.events.listen(heightInput, 
                       goog.events.EventType.CHANGE, 
                       function () {
                           var h = parseInt(heightInput.value);
                       
                           if (isNaN(h)) {
                               /*
                               h = this.thumbOptions.height;
                               heightInput.value = h;
                               */
                               h = "";
                               heightInput.value = h;
                           }
                       
                           this.updateThumbnailLink({'height': h});
                       }, 
                       false, 
                       this);
    
//    optionsDiv.appendChild(domHelper.createElement('br'));
    optionsDiv.appendChild(widthLabel);
    optionsDiv.appendChild(widthInput);

    optionsDiv.appendChild(heightLabel);
    optionsDiv.appendChild(heightInput);

    optionsDiv.appendChild(paintMarkerCheckboxLabel);
    optionsDiv.appendChild(paintMarkerCheckbox);
    
    var linkDiv = domHelper.createDom('div', 
                                      {'class': 'atb-infopane-thumbLink',
                                       'style': 'margin-left: 15px;'});
    this.thumbLink = domHelper.createDom('a', {'href': '', 'target': 'blank'});
    this.updateThumbnailLink();
    linkDiv.appendChild(this.thumbLink);
    
    div.appendChild(title);
    div.appendChild(optionsDiv);
    div.appendChild(linkDiv);
    
    return div;
};

dm.ui.InfoPane.prototype.updateThumbnailLink = function (options) {
    this.thumbOptions = dm.util.ReferenceUtil.mergeOptions(options, this.thumbOptions);
    var linkElem = this.thumbLink;
    
    var href = this.getThumbUri(this.thumbOptions.width, this.thumbOptions.height, this.thumbOptions.paintMarker);
    
    linkElem.href = href;
    jQuery(linkElem).text(href);
    
    return href;
};