goog.provide('atb.widgets.PanelChooser');

goog.require('goog.dom.DomHelper');
goog.require('goog.events');
goog.require('jquery.jQuery');
goog.require('goog.math.Size');

atb.widgets.PanelChooser = function(clickHandler, opt_domHelper) {
    this.setClickHandler(clickHandler);
    this.domHelper = opt_domHelper || new goog.dom.DomHelper();
    
    this.panelDivs = [];
    
    this.div = this.domHelper.createDom('div', {
        'class': 'atb-PanelChooser'
    });
    
    this.setupLayout_();
};

atb.widgets.PanelChooser.prototype.setClickHandler = function(handler) {
    this.clickHandler = handler;
};

atb.widgets.PanelChooser.prototype.getSize = function() {
    return new goog.math.Size(150, 150);
};

atb.widgets.PanelChooser.prototype.setupLayout_ = function() {
    var panel1Div = this.domHelper.createDom('div', {
        'class': 'atb-PanelChooser-left'
    });
    var panel2Div = this.domHelper.createDom('div', {
        'class': 'atb-PanelChooser-right'
    });
    this.panelDivs.push(panel1Div);
    this.panelDivs.push(panel2Div);
    
    this.setupPanelListeners_();
    this.renderPanels_();
};

atb.widgets.PanelChooser.prototype.renderPanels_ = function() {
    for (var i=0, len=this.panelDivs.length; i<len; i++) {
        var panelDiv = this.panelDivs[i];
        
        this.div.appendChild(panelDiv);
    }
};

atb.widgets.PanelChooser.prototype.setupPanelListeners_ = function(opt_div, opt_index) {
    if (opt_div) {
        var panelDiv = opt_div;
        
        jQuery(panelDiv).addClass('atb-PanelChooser-panel');
        
        goog.events.listen(panelDiv, 'click', function(event) {
            this.handlePanelClick(event, opt_index);
        }, false, this);
        
        jQuery(panelDiv).hover(
            function() {
                jQuery(this).addClass('atb-PanelChooser-panel-hover');
            }, function() {
                jQuery(this).removeClass('atb-PanelChooser-panel-hover');
            }
        );
    }
    else {
        for (var i=0, len=this.panelDivs.length; i<len; i++) {
            this.setupPanelListeners_(this.panelDivs[i], i);
        }
    }
};

atb.widgets.PanelChooser.prototype.render = function(div) {
    div.appendChild(this.div);
};

atb.widgets.PanelChooser.prototype.getElement = function() {
    return this.div;
};

atb.widgets.PanelChooser.prototype.handlePanelClick = function(event, index) {
    this.clickHandler.call(this, index, this);
};

atb.widgets.PanelChooser.prototype.hide = function(opt_speed) {
    jQuery(this.div).hide(opt_speed);
};

atb.widgets.PanelChooser.prototype.show = function(opt_speed) {
    jQuery(this.div).show(opt_speed);
};