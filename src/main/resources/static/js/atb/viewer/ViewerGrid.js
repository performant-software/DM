goog.provide('atb.viewer.ViewerGrid');

goog.require('goog.structs.Set');
goog.require('goog.structs.Map');
goog.require('goog.array');
goog.require('goog.math.Size');
goog.require('goog.dom.DomHelper');
goog.require('goog.events');
goog.require('goog.events.EventTarget');
goog.require('goog.fx.DragListGroup');

atb.viewer.ViewerGrid = function(opt_domHelper) {
   goog.events.EventTarget.call(this);

   this.containers = {};
   this.wrappers = [];
   this.clones = [];

   this.domHelper = opt_domHelper || new goog.dom.DomHelper();
   this.element = this.domHelper.createDom('div', {
      'class' : 'atb-ViewerGrid row-fluid'
   });

   this.setDimensions(1, 1);

   goog.events.listen(this.domHelper.getWindow(), 'resize',
         this._onWindowResize, false, this);

   this.dlg = new goog.fx.DragListGroup();
   this.dlg.setDraggerElClass('cursor_move');
   this.dlg.addDragList(this.element, goog.fx.DragListDirection.RIGHT_2D);
   this.dlg.init();
   goog.events.listen(this.dlg, goog.fx.DragListGroup.EventType.BEFOREDRAGSTART,
         this._onBeforeDragStart.bind(this));
   goog.events.listen(this.dlg, goog.fx.DragListGroup.EventType.DRAGSTART,
         this._onDragStart);
   goog.events.listen(this.dlg, goog.fx.DragListGroup.EventType.DRAGEND,
         this._onWrapperDragEnd.bind(this));
};
goog.inherits(atb.viewer.ViewerGrid, goog.events.EventTarget);

atb.viewer.ViewerGrid.prototype.getElement = function() {
   return this.element;
};

atb.viewer.ViewerGrid.prototype.render = function(div) {
   div.appendChild(this.getElement());
};

atb.viewer.ViewerGrid.prototype.decorate = function(div) {
   this.domHelper.replaceNode(this.getElement, div);
};

atb.viewer.ViewerGrid.prototype.addViewerContainer = function(uri, container) {
   this.addViewerContainerAt(uri, container, this.wrappers.length);
};

atb.viewer.ViewerGrid.prototype.addViewerContainerAt = function(uri, container, index) {
   var cleanUri = uri.replace("<", "").replace(">","");

    // Override location of new windows.
  //  var index = this.wrappers.length;

   if (this.containers[cleanUri] == null) {
      this.containers[cleanUri] = container;
   } else {
      this.clones.push(container);
      $(container.element).addClass("locked")
   }
   container.grid = this;

   var wrapperEl = this.domHelper.createDom('div', {
      'class' : 'atb-ViewerGrid-cell'
   });
   container.render(wrapperEl);

   this.dlg.addItemToDragList(this.element, wrapperEl, index);

   container._gridWrapper = wrapperEl;

   this.wrappers.splice(index,0,wrapperEl);

   this._setAllContainerDimensions();

   container.autoResize();

   DM.resourcesChanged({containers: this.containers, clones: this.clones });
};

atb.viewer.ViewerGrid.prototype.isOpen = function(uri) {
   var cleanUri = uri.replace("<", "").replace(">","");
   return this.containers[cleanUri] != null;
};

atb.viewer.ViewerGrid.prototype.getContainer = function(uri) {
   var cleanUri = uri.replace("<", "").replace(">","");
   return this.containers[cleanUri];
};

atb.viewer.ViewerGrid.prototype.removeViewerContainer = function(container) {
   var uri = container.viewer.uri;

   // canvases don't have uri directly visible so uri will be undefined.
   // In this case, call the getUri method to get it
   if (!uri ) {
      uri = container.viewer.getUri();
   }

   var wrapper = container._gridWrapper;
   goog.array.remove(this.wrappers, wrapper);

   if (container.viewer.readOnlyClone == false) {
      delete this.containers[uri];
   } else {
      var idx = this.clones.indexOf(container);
      this.clones.splice(idx,1);
   }

   jQuery(wrapper).detach();
   this._setAllContainerDimensions();
   container.grid = null;

   DM.resourcesChanged({containers: this.containers, clones: this.clones });
};

atb.viewer.ViewerGrid.prototype.indexOf = function(container) {
   matchIndex = 0;
   if (container && container.element)
      matchIndex = $(this.getElement()).find("div.atb-ViewerContainer").index(container.element);
   return matchIndex;
};

atb.viewer.ViewerGrid.prototype.resize = function(width, height) {
   jQuery(this.element).width(width).height(height);

   this.size = new goog.math.Size(width, height);
};

atb.viewer.ViewerGrid.prototype.setDimensions = function(rows, columns) {
   goog.asserts.assert(columns <= 12, 'too many columns');

   this.dimensions = {
      rows : rows,
      columns : columns
   };

   goog.structs.forEach(this.wrappers, function(wrapper) {
      if (this.spanClass) {
         jQuery(wrapper).removeClass(this.spanClass);
      }
   }, this);

   spanColumns = 12 / columns;
   this.spanClass = 'span' + spanColumns;

   this._setAllContainerDimensions();
};

atb.viewer.ViewerGrid.prototype._setAllContainerDimensions = function() {
   goog.structs.forEach(this.wrappers, function(wrapper, index) {
      jQuery(wrapper).addClass(this.spanClass);

      if (index % this.dimensions.columns === 0
            || this.dimensions.columns === 1) {
         jQuery(wrapper).addClass('override-margin-left');
      } else {
         jQuery(wrapper).removeClass('override-margin-left');
      }

      jQuery(wrapper).outerHeight(this.size.height / this.dimensions.rows);
   }, this);

   this.resizeAllContainers();
};

atb.viewer.ViewerGrid.prototype.resizeAllContainers = function() {
   $.each(this.containers, function(key, value) {
      value.autoResize();
   });
   $.each(this.clones, function(idx, value) {
      value.autoResize();
   });
};

atb.viewer.ViewerGrid.prototype._onWindowResize = function(event) {
   this.resizeAllContainers();
   window.setTimeout(this.resizeAllContainers.bind(this), 20);
};

atb.viewer.ViewerGrid.prototype._onBeforeDragStart = function(event) {
   if (!goog.dom.classes.has(event.event.target, "atb-ViewerContainer-titleWrapper")) {
      event.preventDefault();
      event.stopPropagation();
   }
   else {
      var uri = jQuery(event.currDragItem).find(".lock-for-edit-icon").data("uri");
      if (uri && this.containers[uri] && this.containers[uri].viewer && goog.isFunction(this.containers[uri].viewer.makeUneditable)) {
         if (this.containers[uri].viewer.isEditable())
            this.containers[uri]._makeEditableOnDragEnd = true;
         this.containers[uri].viewer.makeUneditable();
      }
   }
}

atb.viewer.ViewerGrid.prototype._onDragStart = function(event) {
   jQuery(event.draggerEl).width(jQuery(event.currDragItem).width());
}

atb.viewer.ViewerGrid.prototype._onWrapperDragEnd = function(event) {
   this.wrappers = goog.array.toArray(this.domHelper.getChildren(this.element));
   this._setAllContainerDimensions();
   var uri = jQuery(event.currDragItem).find(".lock-for-edit-icon").data("uri");
   if (uri && this.containers[uri] && this.containers[uri]._makeEditableOnDragEnd && this.containers[uri].viewer && goog.isFunction(this.containers[uri].viewer.makeEditable)) {
      this.containers[uri].viewer.makeEditable();
      this.containers[uri]._makeEditableOnDragEnd = false;
   }
}

atb.viewer.ViewerGrid.prototype.closeAllContainers = function() {
   $.each(this.containers, function(key, value) {
      value.close();
   });
   var copy = this.clones.slice(0);
   $.each(copy, function(idx, value) {
      value.close();
   });
};

atb.viewer.ViewerGrid.prototype.getCount = function() {
   return Object.keys(this.containers).length;
};

atb.viewer.ViewerGrid.prototype.isEmpty = function() {
   return $.isEmptyObject(this.containers);
};
