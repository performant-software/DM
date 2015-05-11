goog.provide('sc.canvas.CanvasToolbar');

goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.structs.Map');
goog.require('sc.canvas.ImageChoicePicker');
goog.require('sc.canvas.PageChooser');
goog.require('goog.ui.ToggleButton');
goog.require('goog.ui.ToolbarSeparator');
goog.require('goog.ui.Toolbar');
goog.require('goog.ui.editor.ToolbarFactory');
goog.require('sc.canvas.PanZoomGesturesControl');
goog.require('sc.canvas.DrawEllipseControl');
goog.require('sc.canvas.DrawRectControl');
goog.require('sc.canvas.DrawLineControl');
goog.require('sc.canvas.DrawPolygonControl');
goog.require('sc.canvas.DragFeatureControl');

sc.canvas.CanvasToolbar = function(viewer, opt_forReadOnly) {
    this.viewer = viewer;
    this.databroker = viewer.databroker;

    this.forReadOnly = opt_forReadOnly || false;
    
    this.boundsByUri = new goog.structs.Map();

    this.controls = {
        'panZoom': new sc.canvas.PanZoomGesturesControl(viewer.mainViewport),
        'drawEllipse': new sc.canvas.DrawEllipseControl(
            viewer.mainViewport,
            this.databroker),
        'drawRect': new sc.canvas.DrawRectControl(
            viewer.mainViewport,
            this.databroker),
        'drawLine': new sc.canvas.DrawLineControl(
            viewer.mainViewport,
            this.databroker),
        'drawPolygon': new sc.canvas.DrawPolygonControl(
            viewer.mainViewport,
            this.databroker)
    };
    this.controls.panZoom.activate();

    this.baseDiv = document.createElement('div');
    jQuery(this.baseDiv).addClass('sc-CanvasToolbar');

    this.googToolbar = new goog.ui.Toolbar();
    this.googToolbar.render(this.baseDiv);

    this.setupDefaultButtons();
    
    this.setButtonVisibility();

    this.viewer.mainViewport.addEventListener(
        'bounds changed', this.handleBoundsChanged,
        false, this);
};

sc.canvas.CanvasToolbar.prototype.setButtonVisibility = function() {
   if ( this.forReadOnly ) {
      $(".sc-CanvasToolbar .goog-toolbar.goog-toolbar-horizontal .goog-toolbar-button").hide();
      $(".sc-CanvasToolbar .goog-toolbar-separator ").hide();
   } else {
      $(".sc-CanvasToolbar .goog-toolbar.goog-toolbar-horizontal .goog-toolbar-button").show();
      $(".sc-CanvasToolbar .goog-toolbar-separator ").show();
   }
   $("#toggle-markers").show();

};

sc.canvas.CanvasToolbar.prototype.deactivateMouseControls = function() {
    this.controls.panZoom.deactivate();
    this.controls.drawEllipse.deactivate();
    this.controls.drawRect.deactivate();
    this.controls.drawLine.deactivate();
    this.controls.drawPolygon.deactivate();
};

sc.canvas.CanvasToolbar.prototype.deactivate = function() {
   this.forReadOnly  = true;
   this.setButtonVisibility();
};

sc.canvas.CanvasToolbar.prototype.activate = function() {
   this.forReadOnly  = false;
   this.setButtonVisibility();
};


sc.canvas.CanvasToolbar.prototype.handleBoundsChanged = function(event) {
    var viewport = this.viewer.mainViewport;
    var canvas = viewport.canvas;
    if (canvas) {
        this.boundsByUri.set(canvas.getUri(), viewport.getBounds());
    }
};

sc.canvas.CanvasToolbar.prototype.createButton = function(
    name,
    tooltip,
    content,
    cssClass,
    clickHandler
) {
    var button = goog.ui.editor.ToolbarFactory.makeToggleButton(
        name,
        tooltip,
        content,
        cssClass
    );

    this.buttonsByName[name] = button;

    goog.events.listen(
        button,
        'action',
        clickHandler,
        false,
        this
    );

    return button;
};

sc.canvas.CanvasToolbar.prototype.setupDefaultButtons = function() {
    this.buttonsByName = {};

     var panZoomButton = this.createButton(
         'pan-zoom',
         'Pan and zoom the canvas',
         '',
         'icon-hand-up',
         this.handlePanZoomClick
     );
     this.selectButton(panZoomButton);
     this.addButton(panZoomButton);

     var drawLineButton = this.createButton(
         'draw-line',
         'Draw lines and polylines on the canvas',
         '',
         'sc-CanvasToolbar-drawLineIcon',
         this.handleDrawLineClick
     );
     this.addButton(drawLineButton);

     var drawBoxButton = this.createButton(
         'draw-box',
         'Draw rectangles on the canvas',
         '',
         'sc-CanvasToolbar-drawBoxIcon',
         this.handleDrawBoxClick
     );
     this.addButton(drawBoxButton);

     var drawCircleButton = this.createButton(
         'draw-circle',
         'Draw circles and ellipses on the canvas',
         '',
         'sc-CanvasToolbar-drawCircleIcon',
         this.handleDrawCircleClick
     );
     this.addButton(drawCircleButton);

     var drawPolygonButton = this.createButton(
         'draw-polygon',
         'Draw polygons on the canvas',
         '',
         'sc-CanvasToolbar-drawPolygonIcon',
         this.handleDrawPolygonClick
     );
     this.addButton(drawPolygonButton);

     this.googToolbar.addChild(new goog.ui.ToolbarSeparator(), true);
     
    var toggleMarkersButton = this.createButton(
        'toggle-markers',
        'Toggle the visibility of markers on the canvas',
        '',
        'icon-eye-close',
        this.handleToggleMarkers
    );
    this.addButton(toggleMarkersButton);
    toggleMarkersButton.setChecked(true);
    this.viewer.mainViewport.addEventListener(
        'canvasAdded',
        function(event) {
            toggleMarkersButton.setChecked(true);
        });
    for (var name in this.controls) {
        if (this.controls.hasOwnProperty(name)) {
            var control = this.controls[name];

            goog.events.listen(control, ['beginDraw', 'finishDraw'], function(event) {
                toggleMarkersButton.setChecked(true);
            });
        }
    }
};

sc.canvas.CanvasToolbar.prototype.handleToggleMarkers = function(event) {
    var canvas = this.viewer.mainViewport.canvas;
    var button = this.buttonsByName['toggle-markers'];

    if (canvas) {
        if (button.isChecked()) {
            canvas.showMarkers();
            button.setChecked(true);
        }
        else {
            canvas.hideMarkers();
            button.setChecked(false);
        }
    }
};

sc.canvas.CanvasToolbar.prototype.autoEnableNavButtons = function() {
    var canvas = this.viewer.mainViewport.canvas;

    var leftButton = this.buttonsByName['previousPage'];
    var rightButton = this.buttonsByName['nextPage'];

    if (canvas && canvas.knowsSequenceInformation() &&
        canvas.urisInOrder.length > 0) {
        var urisInOrder = canvas.urisInOrder;
        var currentIndex = canvas.currentIndex;

        if (currentIndex == 0) {
            leftButton.setEnabled(false);
            
            leftButton.setTooltip('No prior canvases in this sequence');
        }
        else {
            leftButton.setEnabled(true);
            
            var leftUri = urisInOrder[currentIndex - 1];
            var leftResource = this.databroker.getResource(leftUri);
            var leftTitle = this.databroker.dataModel.getTitle(leftResource);
            
            if (leftTitle) {
                leftButton.setTooltip('Go to ' + leftTitle);
            }
            else {
                leftButton.setTooltip('Go to the previous canvas in this ' +
                                       'sequence');
            }
        }

        if (currentIndex == urisInOrder.length - 1) {
            rightButton.setEnabled(false);
            
            rightButton.setTooltip('No more canvases in this sequence');
        }
        else {
            rightButton.setEnabled(true);
            
            var rightUri = urisInOrder[currentIndex + 1];
            var rightResource = this.databroker.getResource(rightUri);
            var rightTitle = this.databroker.dataModel.getTitle(rightResource);
            
            if (rightTitle) {
                rightButton.setTooltip('Go to ' + rightTitle);
            }
            else {
                rightButton.setTooltip('Go to the next canvas in this ' +
                                       'sequence');
            }
        }
    }
    else {
        leftButton.setEnabled(false);
        rightButton.setEnabled(false);
        
        var tooltip = 'This canvas was not opened as part of a sequence';
        
        leftButton.setTooltip(tooltip);
        rightButton.setTooltip(tooltip);
    }
};

sc.canvas.CanvasToolbar.prototype.addButton = function(button) {
    this.googToolbar.addChild(button, true);
};

sc.canvas.CanvasToolbar.prototype.selectButton = function(button) {
    if (this.selectedButton &&
        jQuery.isFunction(this.selectedButton.setChecked)) {
        this.selectedButton.setChecked(false);
    }

    button.setChecked(true);
    this.selectedButton = button;
};

sc.canvas.CanvasToolbar.prototype.unselectAllButtons = function(
                                                            opt_exceptName) {
    for (var name in this.buttonsByName) {
        if (this.buttonsByName.hasOwnProperty(name)) {
            if (!(opt_exceptName && name == opt_exceptName)) {
                var button = this.buttonsByName[name];

                button.setChecked(false);
            }
        }
    }
};

sc.canvas.CanvasToolbar.prototype.selectHandTool = function() {
    this.selectButton(this.buttonsByName['pan-zoom']);
    this.deactivateMouseControls();
    this.controls.panZoom.activate();
};

sc.canvas.CanvasToolbar.prototype.render = function(div) {
    div = goog.dom.getElement(div);

    div.appendChild(this.baseDiv);
};

sc.canvas.CanvasToolbar.prototype.getElement = function() {
    return this.baseDiv;
};

sc.canvas.CanvasToolbar.prototype.handlePanZoomClick = function(event) {
    var button = this.buttonsByName['pan-zoom'];

    this.selectButton(button);

    this.deactivateMouseControls();
    this.controls.panZoom.activate();
};

sc.canvas.CanvasToolbar.prototype.handleDrawCircleClick = function(event) {
    var button = this.buttonsByName['draw-circle'];

    this.selectButton(button);

    this.deactivateMouseControls();
    this.controls.drawEllipse.activate();

    goog.events.listenOnce(
        this.controls.drawEllipse,
        sc.canvas.DrawFeatureControl.EVENT_TYPES.finishDraw,
        function(event) {
            this.selectHandTool();
        }, false, this);
};

sc.canvas.CanvasToolbar.prototype.handleDrawLineClick = function(event) {
    var button = this.buttonsByName['draw-line'];

    this.selectButton(button);

    this.deactivateMouseControls();
    this.controls.drawLine.activate();

    goog.events.listenOnce(
        this.controls.drawLine,
        sc.canvas.DrawFeatureControl.EVENT_TYPES.finishDraw,
        function(event) {
            this.selectHandTool();
        }, false, this);
};

sc.canvas.CanvasToolbar.prototype.handleDrawPolygonClick = function(event) {
    var button = this.buttonsByName['draw-polygon'];

    this.selectButton(button);

    this.deactivateMouseControls();
    this.controls.drawPolygon.activate();

    goog.events.listenOnce(
        this.controls.drawPolygon,
        sc.canvas.DrawFeatureControl.EVENT_TYPES.finishDraw,
        function(event) {
            this.selectHandTool();
        }, false, this);
};

sc.canvas.CanvasToolbar.prototype.handleDrawBoxClick = function(event) {
    var button = this.buttonsByName['draw-box'];

    this.selectButton(button);

    this.deactivateMouseControls();
    this.controls.drawRect.activate();

    goog.events.listenOnce(
        this.controls.drawRect,
        sc.canvas.DrawFeatureControl.EVENT_TYPES.finishDraw,
        function(event) {
            this.selectHandTool();
        }, false, this);
};
