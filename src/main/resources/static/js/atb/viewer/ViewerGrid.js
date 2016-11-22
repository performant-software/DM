goog.provide('atb.viewer.ViewerGrid');

goog.require('goog.structs.Set');
goog.require('goog.structs.Map');
goog.require('goog.array');
goog.require('goog.math.Size');
goog.require('goog.dom.DomHelper');
goog.require('goog.events');
goog.require('goog.events.EventTarget');

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
   this.addViewerContainerAt(uri, container, 0);
};

atb.viewer.ViewerGrid.prototype.addViewerContainerAt = function(uri, container, index) {
   var cleanUri = uri.replace("<", "").replace(">","");
   
   // Override location of new windows.
   var index = this.wrappers.length;

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

   var wrapperAtIndex = this.wrappers[index];

   if (wrapperAtIndex == null) {
      $(this.element).append(wrapperEl);
   } else {
      $(wrapperAtIndex).after(wrapperEl);
   }

   container._gridWrapper = wrapperEl;

   this.wrappers.splice(index,0,wrapperEl);

   this._setAllContainerDimensions();

   container.autoResize();
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
};

atb.viewer.ViewerGrid.prototype.indexOf = function(container) {
   var wrapper = null;
   $.each(this.containers, function(key, value) {
      if (value == container) {
         wrapper = value._gridWrapper;
      }
   });
   var matchIndex = 0;
   $.each(this.wrappers, function(idx, value) {
      if (value == wrapper) {
         matchIndex = idx;
      }
   });
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
