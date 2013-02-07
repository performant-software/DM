goog.provide('atb.ui.PanelLayoutThumbnail');

goog.require('goog.dom.DomHelper');

atb.ui.PanelLayoutThumbnail =
function(clientApp, underlayThumbnail, clickHandler, closeHandler) {
    this.panelDivs = [];
    this.domHelper = new goog.dom.DomHelper();
    
    this.baseDiv = this.domHelper.createDom('div',
        {'class': 'atb-PanelLayoutThumbnail'});
    goog.events.listen(this.baseDiv, 'click', function (e) {
        e.stopPropagation();
    }, false, this);
    
    this.clickHandler = clickHandler;
    this.closeHandler = closeHandler;
    this.underlayThumbnail = underlayThumbnail;
};

atb.ui.PanelLayoutThumbnail.prototype.render = function (div) {
    var panel1Div = this.domHelper.createDom('div',
        {'class': 'atb-PanelLayoutThumbnail-left atb-PanelLayoutThumbnail-panel'});
    var panel2Div = this.domHelper.createDom('div',
        {'class': 'atb-PanelLayoutThumbnail-right atb-PanelLayoutThumbnail-panel'});
    this.panelDivs.push(panel1Div);
    this.panelDivs.push(panel2Div);
    
    for (var i=0, len=this.panelDivs.length; i<len; i++) {
        var panelDiv = this.panelDivs[i];
        
        this.addEventListenersToPanelDiv(panelDiv, i);
    }
    
    this.baseDiv.appendChild(panel1Div);
    this.baseDiv.appendChild(panel2Div);
    
    this.closeButton = this.domHelper.createDom('div',
        {'class': 'atb-PanelLayoutThumbnail-closeButton'});
    goog.events.listen(this.closeButton, 'click', this.handleCloseButtonClick,
                       false, this);
    this.baseDiv.appendChild(this.closeButton);
    
    jQuery(this.baseDiv).fadeTo(0,0);
    
    jQuery(this.baseDiv).hover(function () {
        jQuery(this).fadeTo(200, 1);
        }, function () {
        jQuery(this).fadeTo(200, 0);
    });
    
    div.appendChild(this.baseDiv);
};

atb.ui.PanelLayoutThumbnail.prototype.handlePanelDivClick =
function(event, index) {
    this.clickHandler(index, this.underlayThumbnail);
    event.stopPropagation();
};

atb.ui.PanelLayoutThumbnail.prototype.handleCloseButtonClick =
function(event) {
    this.closeHandler.call(this, this.underlayThumbnail);
    event.stopPropagation();
};

atb.ui.PanelLayoutThumbnail.prototype.addEventListenersToPanelDiv =
function(div, index) {
    if (this.underlayThumbnail.getTitle()) {
        div.title = 'Open ' + this.underlayThumbnail.getTitle() + ' in this panel';
    }
    else {
        div.title = 'Open this resource in this panel';
    }
    
    goog.events.listen(div, 'click', function (e) {
        e.stopPropagation();
        this.handlePanelDivClick(e, index);
    }, false, this);
    
    jQuery(div).hover(function () {
        jQuery(this).addClass('atb-PanelLayoutThumbnail-panel-hover');
    }, function () {
        jQuery(this).removeClass('atb-PanelLayoutThumbnail-panel-hover');
    });
};