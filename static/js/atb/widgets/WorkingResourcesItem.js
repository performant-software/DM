goog.provide('atb.widgets.WorkingResourcesItem');

goog.require('goog.dom.DomHelper');
goog.require('goog.events');
goog.require('goog.events.ActionEvent');
goog.require('goog.events.EventTarget');
goog.require('jquery.jQuery');

atb.widgets.WorkingResourcesItem = function(databroker, uri, opt_domHelper) {
    goog.events.EventTarget.call(this);

    this.databroker = databroker;
    this.uri = uri;
    this.domHelper = opt_domHelper || new goog.dom.DomHelper();

    this.title = '';
    this.div = this.domHelper.createDom('div', {
        'class': 'atb-WorkingResourcesItem'
    });

    this.attributeDivsByName = new goog.structs.Map();

    goog.events.listen(this.div, 'click', this.handleClick, false, this);

    this.setupLayout_();
};
goog.inherits(atb.widgets.WorkingResourcesItem, goog.events.EventTarget);

atb.widgets.WorkingResourcesItem.prototype.setupLayout_ = function() {
    this.thumbnailDiv = this.domHelper.createDom('div', {
        'class': 'atb-WorkingResourcesItem-thumb'
    });
    this.thumbnailImg = this.domHelper.createDom('img');
    this.thumbnailDiv.appendChild(this.thumbnailImg);
    this.titleDiv = this.domHelper.createDom('div', {
        'class': 'atb-WorkingResourcesItem-title'
    });
    this.attributesDiv = this.domHelper.createDom('div', {
        'class': 'atb-WorkingResourcesItem-attributes'
    });

    this.clearDiv = this.domHelper.createDom('div', {
        'style': 'clear: both;'
    });

    this.div.appendChild(this.thumbnailDiv);
    this.div.appendChild(this.titleDiv);
    this.div.appendChild(this.attributesDiv);

    this.div.appendChild(this.clearDiv);
};

atb.widgets.WorkingResourcesItem.prototype.handleClick = function(event) {
    var actionEvent = new goog.events.ActionEvent(event);
    actionEvent.target = this;
    this.dispatchEvent(actionEvent);
};

atb.widgets.WorkingResourcesItem.prototype.render = function(div) {
    div.appendChild(this.div);
};

atb.widgets.WorkingResourcesItem.prototype.getElement = function() {
    return this.div;
};

atb.widgets.WorkingResourcesItem.prototype.setTitle = function(title) {
    this.title = title;

    jQuery(this.titleDiv).text(title);
};

atb.widgets.WorkingResourcesItem.prototype.getTitle = function() {
    return this.title;
};

atb.widgets.WorkingResourcesItem.prototype.getUri = function() {
    return this.uri;
};

atb.widgets.WorkingResourcesItem.prototype.setThumb =
function(src, width, height) {
    jQuery(this.thumbnailImg).attr({
        'src': src,
        'width': width,
        'height': height
    });
};

atb.widgets.WorkingResourcesItem.prototype.setAttribute =
function(name, value) {
    if (this.attributeDivsByName.containsKey(name)) {
        var div = this.attributeDivsByName.get(name);
    }
    else {
        var div = this.domHelper.createDom('div');
        this.attributeDivsByName.set(name, div);
        this.attributesDiv.appendChild(div);
    }

    jQuery(div).text(name + ': ' + value);
};

atb.widgets.WorkingResourcesItem.prototype.setTooltip = function(text) {
    jQuery(this.div).attr('title', text);
};
