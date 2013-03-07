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
goog.require('jquery.jQuery');
goog.require('sc.canvas.PanZoomGesturesControl');
goog.require('sc.canvas.DrawEllipseControl');
goog.require('sc.canvas.DrawRectControl');
goog.require('sc.canvas.DrawLineControl');
goog.require('sc.canvas.DrawPolygonControl');
goog.require('sc.canvas.DragFeatureControl');
goog.require('sc.canvas.DrawCircleControl');

sc.canvas.CanvasToolbar = function(viewer) {
    this.viewer = viewer;
    this.databroker = viewer.databroker;
    
    this.boundsByUri = new goog.structs.Map();

    this.controls = {
        'panZoom': new sc.canvas.PanZoomGesturesControl(viewer.mainViewport),
        'drawEllipse': new sc.canvas.DrawEllipseControl(
            viewer.mainViewport,
            this.databroker),
        'drawCircle': new sc.canvas.DrawCircleControl(
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

    this.setupImageChoices();

    this.viewer.mainViewport.addEventListener(
        'canvasAdded', this.handleCanvasAdded,
        false, this);
    this.viewer.mainViewport.addEventListener(
        'bounds changed', this.handleBoundsChanged,
        false, this);
};

sc.canvas.CanvasToolbar.prototype.deactivateMouseControls = function() {
    this.controls.panZoom.deactivate();
    this.controls.drawEllipse.deactivate();
    this.controls.drawCircle.deactivate();
    this.controls.drawRect.deactivate();
    this.controls.drawLine.deactivate();
    this.controls.drawPolygon.deactivate();
};

sc.canvas.CanvasToolbar.prototype.handleCanvasAdded = function(event) {
    var self = this;
    window.setTimeout(function() {
        self.handleTranscriptionsClick();
    }, 10);
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

    var leftButton = this.createButton(
        'previousPage',
        'Go to the previous canvas in this sequence',
        '',
        'icon-chevron-left',
        this.handlePreviousClick
    );
    this.addButton(leftButton);

    var pageChooserButton = this.createButton(
        'pageChooser',
        'Pick another folia from this manuscript to view',
        '',
        'icon-list',
        this.handlePageChooserClick
    );
    this.setupPageChooser();
    this.addButton(pageChooserButton);

    var rightButton = this.createButton(
        'nextPage',
        'Go to the next canvas in this sequence',
        '',
        'icon-chevron-right',
        this.handleNextClick
    );
    this.addButton(rightButton);

    this.autoEnableNavButtons();
    this.viewer.mainViewport.addEventListener(
        'canvasAdded',
        this.autoEnableNavButtons,
        false, this);

    this.googToolbar.addChild(new goog.ui.ToolbarSeparator(), true);

    var panZoomButton = this.createButton(
        'pan-zoom',
        'Pan and zoom the canvas',
        '',
        'icon-hand-up',
        this.handlePanZoomClick
    );
    this.selectButton(panZoomButton);
    this.addButton(panZoomButton);

    var drawCircleButton = this.createButton(
        'draw-circle',
        'Draw circles and ellipses on the canvas',
        '',
        'sc-CanvasToolbar-drawCircleIcon',
        this.handleDrawCircleClick
    );
    this.addButton(drawCircleButton);

    var drawLineButton = this.createButton(
        'draw-line',
        'Draw lines and polylines on the canvas',
        '',
        'sc-CanvasToolbar-drawLineIcon',
        this.handleDrawLineClick
    );
    this.addButton(drawLineButton);

    var drawPolygonButton = this.createButton(
        'draw-polygon',
        'Draw polygons on the canvas',
        '',
        'sc-CanvasToolbar-drawPolygonIcon',
        this.handleDrawPolygonClick
    );
    this.addButton(drawPolygonButton);

    var drawBoxButton = this.createButton(
        'draw-box',
        'Draw rectangles on the canvas',
        '',
        'sc-CanvasToolbar-drawBoxIcon',
        this.handleDrawBoxClick
    );
    this.addButton(drawBoxButton);

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

    var transcriptionsButton = this.createButton(
        'transcriptions',
        'Show and hide transcriptions',
        '',
        'icon-font',
        this.handleTranscriptionsClick
    );
    transcriptionsButton.setChecked(true);
    transcriptionsButton.addEventListener('enter', function(event) {
        if (this.viewer.mainViewport.canvas) {
            this.viewer.mainViewport.canvas.fadeTextAnnosToOpacity(0.7);
        }
    }, false, this);
    transcriptionsButton.addEventListener('leave',
        this.handleTranscriptionsClick,
        false, this);
    this.addButton(transcriptionsButton);
    
    var imageChoicesButton = this.createButton(
        'imageChoices',
        'Show alternate image choices',
        '',
        'icon-picture',
        this.handleImageChoicesClick
    );
    this.addButton(imageChoicesButton);
};

sc.canvas.CanvasToolbar.prototype.setupPageChooser = function() {
    var self = this;
    
    this.pageChooser = new sc.canvas.PageChooser(
        this.buttonsByName['pageChooser'],
        this.databroker
    );
    this.updatePageChooser();
    goog.events.listen(this.viewer.mainViewport, 'canvasAdded', this.updatePageChooser,
                       false, this);

    goog.events.listen(this.pageChooser, 'pageChosen', this.handlePageChoice, false, this);
};

sc.canvas.CanvasToolbar.prototype.handlePageChooserClick = function(event) {
    var button = this.buttonsByName['imageChoices'];
    
    if (this.pageChooser.isShowingChoices) {
        this.pageChooser.hideChoices();
    }
    else if (this.pageChooser.pageUris.length > 0) {
        this.pageChooser.showChoices();
    }
    else {
        button.setChecked(false);
    }
};

sc.canvas.CanvasToolbar.prototype.updatePageChooser = function() {
    var canvas = this.viewer.mainViewport.canvas;

    this.pageChooser.clear();

    if (canvas && canvas.knowsSequenceInformation()) {
        var canvasResource = this.databroker.getResource(canvas.uri);
        var urisInOrder = canvas.urisInOrder;

        this.pageChooser.addPages(urisInOrder, canvas.uri);
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
            var leftTitle = leftResource.getOneProperty('dc:title');
            
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
            var rightTitle = rightResource.getOneProperty('dc:title');
            
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

sc.canvas.CanvasToolbar.prototype.setupImageChoices = function(button) {
    var self = this;
    
    this.imageChoicePicker = new sc.canvas.ImageChoicePicker(
        this.buttonsByName['imageChoices'],
        this.databroker,
        100
    );

    var onCanvasAdded = function(event) {
        var canvas = this.viewer.mainViewport.canvas;
        var imageUris = canvas.imageOptionUris;
        
        this.imageChoicePicker.clear();

        for (var i = 0, len = imageUris.length; i < len; i++) {
            var imageUri = imageUris[i];
            
            this.imageChoicePicker.addImage(imageUri, function(uri, event) {
                var canvas = self.viewer.mainViewport.canvas;
                var marqueeCanvas = self.viewer.marqueeViewport.canvas;
                
                canvas.chooseImage(uri);
                marqueeCanvas.chooseImage(uri);
            });
        }
    };
    goog.events.listen(this.viewer.mainViewport, 'canvasAdded', onCanvasAdded,
                       false, this);
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

sc.canvas.CanvasToolbar.prototype.handleTranscriptionsClick = function(event) {
    var button = this.buttonsByName['transcriptions'];

    var canvas = this.viewer.mainViewport.canvas;
    var marqueeCanvas = this.viewer.marqueeViewport.canvas;

    if (! canvas) {
        return;
    }

    if (button.isChecked()) {
        canvas.showTextAnnos();
        
        if (marqueeCanvas) {
            marqueeCanvas.showTextAnnos();
        }
    }
    else {
        canvas.hideTextAnnos();
        
        if (marqueeCanvas) {
            marqueeCanvas.hideTextAnnos();
        }
    }
};

sc.canvas.CanvasToolbar.prototype.setCanvasByUri = function(uri, urisInOrder,
                                                            index) {
    var self = this;
    
    var deferredCanvas = sc.canvas.FabricCanvasFactory.createDeferredCanvas(
        uri,
        this.databroker,
        urisInOrder,
        index
    ).done(function(canvas) {
//           var bounds = self.boundsByUri.get(uri);
//           
//           if (bounds) {
//           self.viewer.mainViewport.zoomToBounds(bounds);
//           }
           });
    this.viewer.addDeferredCanvas(deferredCanvas);
};

sc.canvas.CanvasToolbar.prototype.handlePreviousClick = function(event) {
    var button = this.buttonsByName['previousPage'];

    button.setChecked(false);

    var canvas = this.viewer.mainViewport.canvas;

    if (! canvas) {
        return;
    }

    var urisInOrder = canvas.urisInOrder;
    var currentIndex = canvas.currentIndex;

    var newIndex = currentIndex - 1;
    var newUri = urisInOrder[newIndex];

    this.setCanvasByUri(newUri, urisInOrder, newIndex);
};

sc.canvas.CanvasToolbar.prototype.handleNextClick = function(event) {
    var button = this.buttonsByName['nextPage'];

    button.setChecked(false);

    var canvas = this.viewer.mainViewport.canvas;

    if (! canvas) {
        return;
    }

    var urisInOrder = canvas.urisInOrder;
    var currentIndex = canvas.currentIndex;

    var newIndex = currentIndex + 1;
    var newUri = urisInOrder[newIndex];

    this.setCanvasByUri(newUri, urisInOrder, newIndex);
};

sc.canvas.CanvasToolbar.prototype.handlePageChoice = function(event) {
    var uri = event.uri;
    var button = this.buttonsByName['pageChooser'];

    this.pageChooser.hideChoices();

    button.setChecked(false);

    var canvas = this.viewer.mainViewport.canvas;

    if (! canvas) {
        return;
    }

    var urisInOrder = canvas.urisInOrder;

    var newIndex = urisInOrder.indexOf(uri);

    this.setCanvasByUri(uri, urisInOrder, newIndex);
};

sc.canvas.CanvasToolbar.prototype.handleImageChoicesClick = function(event) {
    var button = this.buttonsByName['imageChoices'];
    
    if (this.imageChoicePicker.isShowingChoices) {
        this.imageChoicePicker.hideChoices();
    }
    else if (this.imageChoicePicker.uris.getCount() > 0) {
        this.imageChoicePicker.showChoices();
    }
    else {
        button.setChecked(false);
    }
};
