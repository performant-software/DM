goog.provide('atb.viewer.ViewerGrid');

goog.require('atb.util.OrderedSet');
goog.require('goog.structs.Map');
goog.require('goog.math.Size');
goog.require('goog.dom.DomHelper');
goog.require('goog.events');
goog.require('goog.events.EventTarget');

atb.viewer.ViewerGrid = function (opt_domHelper) {
    goog.events.EventTarget.call(this);

    this.containers = new atb.util.OrderedSet();
    this.wrappersByContainer = new goog.structs.Map();
    this.wrappers = [];

    this.domHelper = opt_domHelper || new goog.dom.DomHelper();
    this.element = this.domHelper.createDom('div', {'class': 'atb-ViewerGrid row-fluid'});

    this.setDimensions(1, 1);

    goog.events.listen(this.domHelper.getWindow(), 'resize', this._onWindowResize, false, this);
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

atb.viewer.ViewerGrid.prototype.addViewerContainer = function(container) {
    if (this.containers.contains(container)) {
        throw "ViewerGrid already contains the given viewer";
    }
    else {
        this.containers.add(container);

        var wrapperEl = this.domHelper.createDom('div', {'class': 'atb-ViewerGrid-cell '});
        container.render(wrapperEl);

        this.wrappersByContainer.set(container, wrapperEl);
        this.wrappers.push(wrapperEl);

        this._setAllContainerDimensions();

        jQuery(this.element).prepend(wrapperEl);
        container.autoResize();
    }
};

atb.viewer.ViewerGrid.prototype.removeViewerContainer = function(container) {
    jQuery(container.getElement()).detach();
    goog.array.remove(this.wrappers, this.wrappersByContainer.get(container));
    this.wrappersByContainer.remove(container);
    return this.containers.remove(container);
};

atb.viewer.ViewerGrid.prototype.resize = function(width, height) {
    jQuery(this.element).width(width).height(height);

    this.size = new goog.math.Size(width, height);
};

atb.viewer.ViewerGrid.prototype.setDimensions = function(rows, columns) {
    goog.asserts.assert(columns <= 12, 'too many columns');

    this.dimensions = {
        rows: rows,
        columns: columns
    };

    goog.structs.forEach(
        this.wrappers,
        function(wrapper) {
            if (this.spanClass) {
                jQuery(wrapper).removeClass(this.spanClass);
            }
        },
        this);

    spanColumns = 12 / columns;
    this.spanClass = 'span' + spanColumns;

    this._setAllContainerDimensions();
};

atb.viewer.ViewerGrid.prototype._setAllContainerDimensions = function() {
    goog.structs.forEach(
        this.wrappers,
        function(wrapper, index) {
            jQuery(wrapper).addClass(this.spanClass);

            if ((this.wrappers.length - index) % this.dimensions.columns === 1 || this.dimensions.columns === 1) {
                jQuery(wrapper).addClass('override-margin-left');
            }
            else {
                jQuery(wrapper).removeClass('override-margin-left');
            }

            jQuery(wrapper).height(this.size.height / this.dimensions.rows);
        }, this);

    this.resizeAllContainers();
};

atb.viewer.ViewerGrid.prototype.resizeAllContainers = function() {
    goog.structs.forEach(
        this.containers,
        function(container) {
            container.autoResize();
        });
};

atb.viewer.ViewerGrid.prototype._onWindowResize = function(event) {
    this.resizeAllContainers();
};