goog.provide('dm.viewer.ViewerContainer');

goog.require('goog.dom.DomHelper');
goog.require('goog.events.EventTarget');

dm.viewer.ViewerContainer = function(opt_domHelper) {
    goog.events.EventTarget.call(this);

    this.viewer = null;
    this.grid = null;
    this.domHelper = opt_domHelper || new goog.dom.DomHelper();

    this._setupDom();
};
goog.inherits(dm.viewer.ViewerContainer, goog.events.EventTarget);

dm.viewer.ViewerContainer.prototype._setupDom = function() {
    this.element = this.domHelper.createDom('div', {'class': 'atb-ViewerContainer'});

    this.titleWrapper = this.domHelper.createDom('div', {'class': 'atb-ViewerContainer-titleWrapper'});
    this.titleEl = this.domHelper.createDom('h3', {'class': 'atb-ViewerContainer-title atb-ViewerContainer-title-not-editing'});
    this.closeButton = this.domHelper.createDom('div', {'class': 'icon-remove-sign atb-ViewerContainer-close'});

    goog.events.listen(this.closeButton, 'click', this.close, false, this);

    this.viewerEl = this.domHelper.createDom('div', {'class': 'atb-ViewerContainer-viewer'});

    this.titleWrapper.appendChild(this.closeButton);
    this.titleWrapper.appendChild(this.titleEl);

    this.element.appendChild(this.titleWrapper);
    this.element.appendChild(this.viewerEl);
};

dm.viewer.ViewerContainer.prototype.setViewer = function(viewer) {
    if (this.viewer) {
        jQuery(this.viewer.getElement()).detach();
        this.viewer.setContainer(null);
    }

    this.viewer = viewer;
    this.viewer.setContainer(this);
    viewer.render(this.viewerEl);
};

dm.viewer.ViewerContainer.prototype.getViewer = function() {
    return this.viewer;
};

dm.viewer.ViewerContainer.prototype.render = function(div) {
    div.appendChild(this.element);
};

dm.viewer.ViewerContainer.prototype.getDomHelper = function() {
    return this.domHelper;
};

dm.viewer.ViewerContainer.prototype.setTitle = function(title) {
    this.title = title;
    jQuery(this.titleEl).text(title);
    jQuery(this.titleEl).attr('title', title);
};

dm.viewer.ViewerContainer.prototype.getTitle = function() {
    return this.title;
};

dm.viewer.ViewerContainer.prototype.setTitleEditable = function(editable) {
    this.isTitleEditable = editable;

    if (editable) {
        jQuery(this.titleEl).attr('contentEditable', true);
        goog.events.listen(this.titleEl, 'keyup', this._titleKeyHandler, false, this);
        goog.events.listen(this.titleEl, 'focus', this._titleFocusHandler, false, this);
        goog.events.listen(this.titleEl, 'blur', this._titleBlurHandler, false, this);
    }
    else {
        jQuery(this.titleEl).attr('contentEditable', false);
        goog.events.unlisten(this.titleEl, 'keyup', this._titleKeyHandler, false, this);
        goog.events.unlisten(this.titleEl, 'focus', this._titleFocusHandler, false, this);
        goog.events.unlisten(this.titleEl, 'blur', this._titleBlurHandler, false, this);
    }
};

dm.viewer.ViewerContainer.prototype._titleKeyHandler = function(event) {
    if (event.keyCode == goog.events.KeyCodes.ENTER || event.keyCode == goog.events.KeyCodes.MAC_ENTER) {
        jQuery(this.titleEl).blur();
        event.preventDefault();
        event.stopPropagation();
    }
};

dm.viewer.ViewerContainer.prototype._titleFocusHandler = function(event) {
    jQuery(this.titleEl).addClass('atb-ViewerContainer-title-editing');
    jQuery(this.titleEl).removeClass('atb-ViewerContainer-title-not-editing');
};

dm.viewer.ViewerContainer.prototype._titleBlurHandler = function(event) {
    jQuery(this.titleEl).removeClass('atb-ViewerContainer-title-editing');
    jQuery(this.titleEl).addClass('atb-ViewerContainer-title-not-editing');

    jQuery(this.titleEl).scrollLeft(0).scrollTop(0);

    var titleText = jQuery(this.titleEl).text().replace('\n', ' ');
    if (titleText.trim().length > 0) {
      this.setTitle(titleText);
      this._notifyViewerTitleChanged();
    }
    else {
      jQuery(this.titleEl).text(this.getTitle());
    }
};

dm.viewer.ViewerContainer.prototype._notifyViewerTitleChanged = function(title) {
    if (this.viewer && goog.isFunction(this.viewer.setTitle)) {
        this.viewer.setTitle(jQuery(this.titleEl).text());
    }
};

dm.viewer.ViewerContainer.prototype.getElement = function() {
    return this.element;
};

dm.viewer.ViewerContainer.prototype.autoResize = function() {
    if (this.viewer) {
        var $el = jQuery(this.element);

        var width = $el.innerWidth();
        var height = $el.innerHeight() - jQuery(this.titleWrapper).height();

        this.viewer.resize(width, height);
    }
};

dm.viewer.ViewerContainer.prototype.close = function() {
   if (this.viewer) {
      if (this.viewer.isEditable()) {
         var uri = this.viewer.uri || jQuery(this.viewer.getElement()).find(".lock-for-edit-icon").data("uri");
         this.viewer.unlockResource(uri);
      }
   }
   if (this.grid) {
      this.grid.removeViewerContainer(this);
   }
};

dm.viewer.ViewerContainer.prototype.getIndex = function() {
    if (this.grid) {
        return this.grid.indexOf(this);
    }
    else {
        return -1;
    }
};
