goog.provide('dm.widgets.WorkingResourcesItem');

goog.require('goog.dom.DomHelper');
goog.require('goog.events');
goog.require('goog.events.ActionEvent');
goog.require('goog.events.EventTarget');

dm.widgets.WorkingResourcesItem = function(databroker, uri, opt_domHelper) {
    goog.events.EventTarget.call(this);

    this.databroker = databroker;
    this.uri = uri;
    this.domHelper = opt_domHelper || new goog.dom.DomHelper();

    this.title = '';
    this.div = this.domHelper.createDom('div', {
        'class': 'atb-WorkingResourcesItem',
        'data-uri': this.uri
    });

    this.attributeDivsByName = new goog.structs.Map();

    goog.events.listen(this.div, 'click', this.handleClick, false, this);

    this.setupLayout_();
};
goog.inherits(dm.widgets.WorkingResourcesItem, goog.events.EventTarget);

dm.widgets.WorkingResourcesItem.prototype.setupLayout_ = function() {
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

    this.removeButton = this.domHelper.createDom('div', {
        'class': 'atb-WorkingResourcesItem-remove icon-minus-sign',
        'title': 'Remove this resource from the project'
    });
    jQuery(this.removeButton).hide();
    goog.events.listen(this.removeButton, 'click', this.handleRemoveClick, false, this);

    this.reorderButton = this.domHelper.createDom('div', {
        'class': 'atb-WorkingResourcesItem-reorder icon-th-list',
        'title': 'Drag to reorder the resource within the collection'
    });
    jQuery(this.reorderButton).hide();

    this.clearDiv = this.domHelper.createDom('div', {
        'style': 'clear: both;'
    });

    this.div.appendChild(this.thumbnailDiv);
    this.div.appendChild(this.titleDiv);
    this.div.appendChild(this.attributesDiv);
    this.div.appendChild(this.removeButton);
    this.div.appendChild(this.reorderButton);

    this.div.appendChild(this.clearDiv);
};

dm.widgets.WorkingResourcesItem.prototype.handleClick = function(event) {
    var actionEvent = new goog.events.ActionEvent(event);
    actionEvent.target = this;
    this.dispatchEvent(actionEvent);
};

dm.widgets.WorkingResourcesItem.prototype.handleRemoveClick = function(event) {
    event.stopPropagation();
    resp = confirm("This resource and all associated annotations will be removed from the project. All data will be lost.\nContinue?");
    if (resp ) {
	    var removeEvent = new goog.events.Event('remove-click', this);
	    this.dispatchEvent(removeEvent);
    }
};

dm.widgets.WorkingResourcesItem.prototype.render = function(div) {
    div.appendChild(this.div);
};

dm.widgets.WorkingResourcesItem.prototype.addToDragList = function(dragListGroup, dragList) {
    dragListGroup.addItemToDragList(dragList, this.div);
};

dm.widgets.WorkingResourcesItem.prototype.getElement = function() {
    return this.div;
};

dm.widgets.WorkingResourcesItem.prototype.setTitle = function(title) {
    this.title = title;

    jQuery(this.titleDiv).text(title);
};

dm.widgets.WorkingResourcesItem.prototype.getTitle = function() {
    return this.title;
};

dm.widgets.WorkingResourcesItem.prototype.getUri = function() {
    return this.uri;
};

dm.widgets.WorkingResourcesItem.prototype.setThumb = function(src, width, height) {
    jQuery(this.thumbnailImg).attr({
        'src': src,
        'width': width,
        'height': height
    });
};

dm.widgets.WorkingResourcesItem.prototype.setAttribute = function(name, value) {
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

dm.widgets.WorkingResourcesItem.prototype.setTooltip = function(text) {
    jQuery(this.div).attr('title', text);
};

dm.widgets.WorkingResourcesItem.prototype.showRemoveButton = function() {
    jQuery(this.removeButton).show();
};

dm.widgets.WorkingResourcesItem.prototype.hideRemoveButton = function() {
    jQuery(this.removeButton).hide();
};

dm.widgets.WorkingResourcesItem.prototype.showReorderButton = function() {
    jQuery(this.reorderButton).show();
};

dm.widgets.WorkingResourcesItem.prototype.hideReorderButton = function() {
    jQuery(this.reorderButton).hide();
};
