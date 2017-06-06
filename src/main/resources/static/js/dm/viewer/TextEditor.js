goog.provide('dm.viewer.TextEditor');

goog.require('goog.dom');
goog.require('goog.dom.DomHelper');
goog.require('goog.dom.classes');

goog.require('goog.editor.Command');
goog.require('goog.editor.Field');
goog.require('goog.editor.plugins.BasicTextFormatter');
goog.require('goog.editor.plugins.EnterHandler');
goog.require('goog.editor.plugins.HeaderFormatter');
goog.require('goog.editor.plugins.LinkBubble');
goog.require('goog.editor.plugins.LinkDialogPlugin');
goog.require('goog.editor.plugins.ListTabHandler');
goog.require('goog.editor.plugins.LoremIpsum');
goog.require('goog.editor.plugins.RemoveFormatting');
goog.require('goog.editor.plugins.SpacesTabHandler');
goog.require('goog.editor.plugins.UndoRedo');
goog.require('goog.ui.editor.DefaultToolbar');
goog.require('goog.ui.editor.ToolbarController');
goog.require('goog.editor.Command');
goog.require('goog.cssom.iframe.style');

goog.require('goog.asserts');
goog.require('goog.string');

goog.require('dm.viewer.Finder');
goog.require('dm.viewer.Viewer');

//begin radial menus test includes:
goog.require('dm.Util');
goog.require('dm.widgets.IMenu');
goog.require('dm.widgets.Toolbar');
goog.require('goog.ui.ToolbarSeparator');
goog.require('dm.widgets.MenuItem');
goog.require('dm.widgets.MenuUtil');
goog.require('dm.util.StyleUtil');
goog.require('dm.util.ReferenceUtil');
//end radial menus test includes

goog.require('dm.widgets.DialogWidget');

goog.require('dm.viewer.TextEditorAnnotate');
goog.require('dm.viewer.TextEditorProperties');

goog.require('dm.util.Set');

goog.require('dm.widgets.GlassPane');
goog.require('dm.widgets.ForegroundMenuDisplayer');

goog.require('dm.events.ResourceClick');
goog.require('dm.events.ResourceModified');

/**
 * dm.viewer.TextEditor
 * Creates a Text Editor
 *
 * @constructor
 *
 * @extends {dm.viewer.Viewer}
 *
 * @param clientApp {!dm.ClientApp}
 * @param opt_initialTextContent {string=}
 * @param opt_annoBodyId {string=}
 **/
dm.viewer.TextEditor = function(clientApp, opt_initialTextContent) {
	dm.viewer.Viewer.call(this, clientApp);

    this.viewerType = 'text editor';
	 this.unsavedChanges = false;
	 this.loadingContent = false;
	 this.loadError = false;
    this.styleRoot = this.clientApp.getStyleRoot();

	 this.useID = 'atb_ui_editor_' + goog.string.getRandomString();

    this.purpose = 'other';
};
goog.inherits(dm.viewer.TextEditor, dm.viewer.Viewer);

dm.viewer.TextEditor.VIEWER_TYPE = 'text editor';

/**
 * getSanitizedHtml()
 * @return {string} the html contents of the editor with unwanted tags (such as <script>) removed
 **/
dm.viewer.TextEditor.prototype.getSanitizedHtml = function () {
	  var $annotationsToShow = null;
		if (!this.toggleMarkersButton.isChecked()) {
			this.toggleMarkersButton.setChecked(true);
			var $annotations = jQuery(this.editorIframeElement).contents().find("span.atb-editor-textannotation");
			$annotationsToShow = $annotations.not(".atb-editor-textannotation-nohighlight");
			$annotations.removeClass("atb-editor-textannotation-nohighlight");
		}

		var cleanContents = this.field.getCleanContents();
    //cleanContents = cleanContents.replace(/'/g, "&#39;");
    // cleanContents = cleanContents.replace(/"/g, "&quot;");

		if (!($annotationsToShow == null)) {
			this.toggleMarkersButton.setChecked(false);
			var $otherAnnotations = jQuery(this.editorIframeElement).contents().find("span.atb-editor-textannotation").not($annotationsToShow);
			$otherAnnotations.addClass("atb-editor-textannotation-nohighlight");
		}

    return cleanContents;
};

/**
 * setHtml(htmlString)
 * sets the contents of the editor to the specified string
 * @param {!string} htmlString the html to be written to the editor
 **/
dm.viewer.TextEditor.prototype.setHtml = function (htmlString) {
    if (this.field) {
	    this.field.setHtml(false, htmlString, false );
    }
};

/**
 * addStylesheetToEditor(stylesheetURI)
 * adds the specified stylesheet to the editor iframe
 * @param stylesheetURI {!string} the URI of the stylesheet *relative to the html document*
 **/
dm.viewer.TextEditor.prototype.addStylesheetToEditor = function (stylesheetURI) {
   var le = $("<link></link");
   le.attr('rel', 'stylesheet');
   le.attr('href', stylesheetURI);
   var doc = $(this.editorIframeElement).contents();
   var head = doc.find("head");
   head.append(le);
};

/**
 * saveContents
 **/
dm.viewer.TextEditor.prototype.saveContents = function() {
   if (this.resourceId == null) {
      this.resourceId = this.databroker.createUuid();
      this.uri = this.resourceId;
   }

   var resource = this.databroker.getResource(this.resourceId);
   this.databroker.dataModel.setTitle(resource, this.getTitle());
   this.databroker.dataModel.setTextContent(resource, this.getSanitizedHtml());

   var highlightPlugin = this.field.getPluginByClassId('Annotation');
   highlightPlugin.updateAllHighlightResources();

   this.databroker.sync();

   this.unsavedChanges = false;
};

/**
 * scrollIntoView centers the editor view scroll with the tag roughly in the
 * center
 *
 * @param tag
 *           {Element} highlight span
 */
dm.viewer.TextEditor.prototype.scrollIntoView = function (element) {
		if (this.isEditable()) {
        var editorElement = this.editorIframe;
        var editorHeight = this.editorIframe.document.body.clientHeight;
        var elementVerticalOffset = jQuery(element).offset().top;
    }
    else {
        var editorElement = goog.dom.getElement(this.useID);
        var editorHeight = jQuery(editorElement).height();
        var elementVerticalOffset = jQuery(element).offset().top - jQuery(editorElement).offset().top;
    }

    var elementHeight = jQuery(element).outerHeight();
    var elementCenterY = Math.round(elementVerticalOffset + elementHeight / 2);

    var scrollTop = elementCenterY - Math.round(editorHeight / 2);
    if (scrollTop < 0) scrollTop = 0;

    jQuery(editorElement).scrollTop(scrollTop);

		jQuery(this.editorIframeElement).contents().find("span.atb-editor-textannotation").addClass("atb-editor-textannotation-nohighlight");
		$(element).removeClass("atb-editor-textannotation-nohighlight");
};

dm.viewer.TextEditor.prototype.selectAndMoveToSpecificResource = function (specificResource) {
    specificResource = this.databroker.getResource(specificResource);
    var selectorUri = specificResource.getOneProperty('oa:hasSelector');

    var annotationPlugin = this.field.getPluginByClassId('Annotation');

    var element = annotationPlugin.getHighlightElementByUri(selectorUri);
    if (element) {
        this.scrollIntoView(element);
        annotationPlugin.selectAnnotationSpan(element);
    }
    else {
        console.error(specificResource + " could not be found in text " + this.uri);
    }
};

dm.viewer.TextEditor.prototype.resize = function(width, height) {
   this.size = new goog.math.Size(width, height - 10);

   jQuery(this.rootDiv).width(width).height(height - 10);

   if ($("#save-status-" + this.useID).is(":visible")) {
      $('.atb-Viewer').height(this.size.height);
      $('#' + this.useID).height(
            this.size.height - jQuery(this.toolbarDiv).outerHeight(true) - 19
                  - 10);
      $('#' + this.useID).css("width", "100%");
   } else {
      $('#' + this.useID).height(
            this.size.height - jQuery(this.toolbarDiv).outerHeight(true) - 8
                  - 10);
   }
};

dm.viewer.TextEditor.prototype.render = function(div) {
	if (this.rootDiv != null) {
		return;
	}
    dm.viewer.Viewer.prototype.render.call(this, div);

    this.editorDiv = this.domHelper.createDom('div', {'id': this.useID, 'class': 'ro-editor'});
    this.toolbarDiv = this.domHelper.createDom('div', {'class': 'text-editor-toolbar'} );

    this.rootDiv.appendChild(this.toolbarDiv);

    this.rootDiv.appendChild(this.editorDiv);

    this._renderDocumentIcon();

    goog.events.listen(
        this.clientApp.getEventDispatcher(),
        dm.events.LinkingModeExited.EVENT_TYPE,
        this.handleLinkingModeExited, false, this);

    goog.editor.Field.DELAYED_CHANGE_FREQUENCY = 1000;
    this.field = new goog.editor.Field(this.useID, this.domHelper.getDocument());
    this.field.registerPlugin(new goog.editor.plugins.BasicTextFormatter());
    this.field.registerPlugin(new goog.editor.plugins.LinkDialogPlugin());
    this.field.registerPlugin(new goog.editor.plugins.LinkBubble());
    this.field.registerPlugin(new dm.viewer.TextEditorAnnotate(this));

    this.field.makeEditable();

    this._renderToolbar();

    var editorHtmlElement = this.field.getEditableDomHelper().getDocument().getElementsByTagName('html')[0];
    this.databroker.namespaces.bindNamespacesToHtmlElement(editorHtmlElement);

    this.editorIframeElement = this.domHelper.getElement(this.useID);
    this.editorIframe = goog.dom.getFrameContentWindow(this.editorIframeElement);
    this.addStylesheetToEditor(this.styleRoot + 'atb/editorframe.css');

    this.addGlobalEventListeners();

    if (this.container) {
        this.container.autoResize();
        this.container.setTitleEditable(true);
    }

    // Start checking/displaying document status changes
    this.initStatusChecker();
    this.initPasteHandling();
};

dm.viewer.TextEditor.prototype.initPasteHandling = function() {
   var editorIframe = $("#" + this.field.id);
   var iframeContent = editorIframe.contents();
   var self = this;

   // Create an offscreen area that will received pasted data
   $(iframeContent).find(".editable").parent().append("<div id='paste-buffer' contenteditable='true'></div>");
   var pasteBuf = $(iframeContent).find("#paste-buffer");
   pasteBuf.css("position", "absolute");
   pasteBuf.css("left", "-1000px");

   // PASTE HANDLING
   iframeContent.off("paste");
   iframeContent.on("paste", function(e) {
      var b = $("#addAnnotation");
      if (b.hasClass("goog-toolbar-button-checked")) {
         e.preventDefault();
         e.stopPropagation();
         alert("You cannot paste content in the middle of an existing annotation.");
         return;
      }

      // Grab the current selection and clear it
      var range = getSelectionRange(editorIframe);
      if (range) {
         range.deleteContents();
      }

      var editor = iframeContent.find('.editable');
      var scrollTop = editor.scrollTop();

      // set focus to paste buffer, thereby redirecting the paste
      // target
      var pasteBuffer = $(iframeContent).find("#paste-buffer");
      pasteBuffer.focus();

      // once paste has completed, move the clean content into the
      // previus selection and restore scroll position
      setTimeout(function() {
         var ew = editorIframe[0].contentWindow;
         var doc = ew.document;
         var pasted = $.trim(pasteBuffer.html());
         if (pasted.indexOf("urn:uuid") > -1) {
            pasted = $.trim(pasteBuffer.text());
            pasted = pasted.replace(/(?:\r\n|\r|\n)/g, '<br />');
         }
         var ele = $("<span>" + pasted + "</span>");
         range.insertNode(ele[0]);
         pasteBuffer.empty();

         // restore editor focus, scroll position and caret pos
         editor.focus();
         editor.scrollTop(scrollTop);

         var r2 = doc.createRange();
         var sel = ew.getSelection();
         r2.setStartAfter(ele[0]);
         r2.collapse(true);
         sel.removeAllRanges();
         sel.addRange(r2);
      }, 1);
   });
};

function getSelectionRange(iframe) {
   var sel;
   var cw = iframe[0].contentWindow;
   var doc = cw.document;
   if (cw.getSelection) {
       sel = cw.getSelection();
       if (sel.rangeCount) {
           return sel.getRangeAt(0);
       }
   } else if (doc.selection) {
       return doc.selection.createRange();
   }
   return null;
}

dm.viewer.TextEditor.prototype.initStatusChecker = function() {
   var statusInterval = 1 * 1000;
   var self = this;
   this.autoOutputSaveStatusIntervalObject = window.setInterval(function() {
      var saveStatusElement = $("#save-status-" + self.useID);
      if (saveStatusElement.length === 0) {
         return;
      }

      var status = saveStatusElement.text();
      var priorStatus = status;
      if (self.loadingContent === true) {
         status = "Loading document...";
      } else if (self.loadError === true) {
         status = "Load failed!";
      } else {
         if (!self.unsavedChanges && !self.databroker.syncService.hasUnsavedChanges() && !self.databroker.hasSyncErrors) {
           status = "Saved";
         } else if (self.databroker.hasSyncErrors) {
           status = "Not Saved - Sync Errors!";
         } else if (self.unsavedChanges || self.databroker.syncService.hasUnsavedChanges()) {
           status = "Saving...";
         }
      }

      saveStatusElement.text(status);

   }, statusInterval);
};

dm.viewer.TextEditor.prototype._addDocumentIconListeners = function() {
    var createButtonGenerator = dm.widgets.MenuUtil.createDefaultDomGenerator;

    if ( this.databroker.projectController.canUserEditProject() &&  this.isEditable() ) {
        var menuItems = [
            new dm.widgets.MenuItem(
                "createLink",
                createButtonGenerator("atb-radialmenu-button atb-radialmenu-button-create-link"),
                function(actionEvent) {
                    this.linkAnnotation();

                    if (this.annoTitlesList) {
                        this.annoTitlesList.loadForResource(this.uri);
                    }
                }.bind(this),
                'Link another resource to this document'
            ),
            new dm.widgets.MenuItem(
                "newTextAnno",
                createButtonGenerator("atb-radialmenu-button icon-pencil"),
                function(actionEvent) {
                    this.createNewTextBody(this.resourceId);

                    if (this.annoTitlesList) {
                        this.annoTitlesList.loadForResource(this.uri);
                    }
                }.bind(this),
                'Annotate this document'
            )
        ];
    }
    else {
        var menuItems = [];
    }

    jQuery(this.documentIcon).unbind('mouseover').unbind('mouseout');
    this.addHoverMenuListenersToElement(
        this.documentIcon,
        menuItems,
        function() {
            return this.resourceId;
        }.bind(this)
    );
};

dm.viewer.TextEditor.prototype._renderDocumentIcon = function() {
    this.documentIcon = this.domHelper.createDom('div', {'class': 'atb-viewer-documentIcon'});
    goog.events.listen(this.documentIcon, goog.events.EventType.CLICK, this.handleDocumentIconClick_, false, this);

    this._addDocumentIconListeners();

    this.rootDiv.appendChild(this.documentIcon);
};

dm.viewer.TextEditor.prototype._renderToolbar = function() {
    // Specify the buttons to add to the toolbar, using built in default buttons.
    var buttons = [
         goog.editor.Command.BOLD,
         goog.editor.Command.ITALIC,
         goog.editor.Command.UNDERLINE,
         //goog.editor.Command.FONT_COLOR,
         //goog.editor.Command.BACKGROUND_COLOR,
         //goog.editor.Command.FONT_FACE,
         goog.editor.Command.FONT_SIZE,
         goog.editor.Command.LINK,
         //goog.editor.Command.UNDO,
         //goog.editor.Command.REDO,
         goog.editor.Command.UNORDERED_LIST,
         goog.editor.Command.ORDERED_LIST//,
         //goog.editor.Command.INDENT,
         //goog.editor.Command.OUTDENT
         //goog.editor.Command.JUSTIFY_LEFT,
         //goog.editor.Command.JUSTIFY_CENTER,
         //goog.editor.Command.JUSTIFY_RIGHT,
         //goog.editor.Command.SUBSCRIPT,
         //goog.editor.Command.SUPERSCRIPT,
         //goog.editor.Command.STRIKE_THROUGH
    ];
    $(this.toolbarDiv).empty();

    var myToolbar = goog.ui.editor.DefaultToolbar.makeToolbar(buttons, this.domHelper.getElement(this.toolbarDiv));

     // Create annotate button
     var annotateButton = goog.ui.editor.ToolbarFactory.makeToggleButton(
         dm.viewer.TextEditorAnnotate.COMMAND.ADD_ANNOTATION,
         'Annotate selected text',
         '',
         'icon-tag');

     annotateButton.queryable = true;//Fixes wierd annotations bug

     myToolbar.addChildAt(annotateButton, 0, true);


     var saveStatusDiv = $("<div id='save-status-"+this.useID+"' class='editor-status goog-toolbar goog-toolbar-horizontal'>Initializing</div>");
     $(this.toolbarDiv).append(saveStatusDiv);

		 myToolbar.addChild(new goog.ui.ToolbarSeparator(), true);

		 var toggleMarkersButton = goog.ui.editor.ToolbarFactory.makeToggleButton(
         'toggle-markers',
         'Toggle the visibility of highlights on the canvas',
         '',
         'icon-eye-close'
     );
		 goog.events.listen(
				 toggleMarkersButton,
				 'action',
				 this.handleToggleMarkers,
				 false,
				 this
		 );
		 this.toggleMarkersButton = toggleMarkersButton;
		 myToolbar.addChild(toggleMarkersButton, true);
     toggleMarkersButton.setChecked(true);

     // Hook the toolbar into the field.
     this.toolbarController = new goog.ui.editor.ToolbarController(this.field, myToolbar);
};

dm.viewer.TextEditor.prototype.handleSaveButtonClick_ = function (e) {
    this.saveContents();
};

dm.viewer.TextEditor.prototype.setPurpose = function (purpose) {
    this.purpose = purpose;
};

dm.viewer.TextEditor.prototype.handleDocumentIconClick_ = function (e) {
    e.stopPropagation();

    var eventDispatcher = this.clientApp.getEventDispatcher();
    var event = new dm.events.ResourceClick(this.resourceId, eventDispatcher, this);
    eventDispatcher.dispatchEvent(event);
};

dm.viewer.TextEditor.prototype.handleToggleMarkers = function(event) {
		var button = this.toggleMarkersButton;
		var $annotations = jQuery(this.editorIframeElement).contents().find("span.atb-editor-textannotation");
		if (button.isChecked()) {
			$annotations.removeClass("atb-editor-textannotation-nohighlight");
		}
		else {
			$annotations.addClass("atb-editor-textannotation-nohighlight");
		}
}

dm.viewer.TextEditor.prototype.addGlobalEventListeners = function() {
   var eventDispatcher = this.clientApp.getEventDispatcher();

   var self = this;
   goog.events.listen(this.field, goog.editor.Field.EventType.DELAYEDCHANGE, this.onChange, false, this);
   goog.events.listen(this.field.getElement(), goog.events.EventType.KEYPRESS, function() {
      self.unsavedChanges = true;
      $("#save-status-"+this.useID).text("Not Saved");
   });


    goog.events.listen(this.editorIframe, 'mousemove', function(e) {
       var offset = jQuery(this.editorIframeElement).offset();

       this.mousePosition.x = e.clientX + offset.left;
       this.mousePosition.y = e.screenY;
    }, false, this);

   goog.events.listen(this.editorIframe, 'mousedown', function(e) {
      var annotationPlugin = this.field.getPluginByClassId('Annotation');
      annotationPlugin.deselectAllHighlights();
   }, false, this);

   // Stops autosave when the window is closed.
   goog.events.listen(this.container.closeButton, 'click', function(e) {
      clearInterval(this.autoOutputSaveStatusIntervalObject);
   }, false, this);
};


dm.viewer.TextEditor.prototype.getTitle = function () {
    return this.databroker.dataModel.getTitle(this.resource);
};

dm.viewer.TextEditor.prototype.setTitle = function(title) {
    this.databroker.dataModel.setTitle(this.resource, title);
    this.setDisplayTitle(title);
    this.databroker.sync();
};

dm.viewer.TextEditor.prototype.setDisplayTitle = function(title) {
    if (this.container) {
        this.container.setTitle(title);
    }
};

dm.viewer.TextEditor.prototype.isTitleEditable = function() {
	return this.container.isTitleEditable;
};

dm.viewer.TextEditor.prototype.isEditable = function() {
    if (this.field) {
        return !this.field.isUneditable();
    }
    else {
        return true;
    }
};

dm.viewer.TextEditor.prototype.makeEditable = function() {
   if (!this.isEditable()) {
			var $textBlock = $("#" + this.useID);
		  var scrollTopPct = $textBlock.length > 0 ? $textBlock.scrollTop() / $textBlock[0].scrollHeight : 0;

      this.field.makeEditable();
      this.setTitleEditable(true);
      $("#save-status-" + this.useID).text("Saved");
      this.loadingContent = false;
      $("#save-status-" + this.useID).show();
      $('#' + this.useID).removeClass('atb-Editor-noedit');
      $('.atb-Viewer').height(this.size.height);
      $('#' + this.useID).height(
            this.size.height - jQuery(this.toolbarDiv).outerHeight(true)-19);

      $('#' + this.useID).css("width", "100%");

      // NOTES: toggling from editable to unediable destroys the
      // editor iframe and all associated styles / handlers. they must
      // be added back if status is toggled back to editable. Further.. the
      // oroginal reference to the editor is invalid, and must be re-established
      this.editorIframeElement = this.domHelper.getElement(this.useID);
      this.editorIframe = goog.dom.getFrameContentWindow(this.editorIframeElement);
      this.addStylesheetToEditor(this.styleRoot + 'atb/editorframe.css');
      var textEditorAnnotate = this.field.getPluginByClassId('Annotation');
      textEditorAnnotate.addListenersToAllHighlights();
      this._addDocumentIconListeners();
      this.addGlobalEventListeners();
      this.initPasteHandling();
      var t = $("#save-status-" + this.useID).closest(".text-editor-toolbar");
      t.find(".goog-toolbar-button").show();
      t.find(".goog-toolbar-menu-button").show();
			t.find(".goog-toolbar-separator").show();
			window.setTimeout(function() {
				var $newTextBlock = $(this.editorIframeElement).contents().find("body");
				if ($newTextBlock.length > 0) {
					$newTextBlock.scrollTop(scrollTopPct * $newTextBlock[0].scrollHeight);
				}
			}.bind(this), 10);
   }
};

dm.viewer.TextEditor.prototype.makeUneditable = function() {
   if (this.isEditable()) {
		  var scrollTopPct = 0;
		 	if ($(this.editorIframe).length > 0) {
			 	var $textBlock = $(this.editorIframeElement).contents().find("body");
				var scrollTopPct = $textBlock.length > 0 ? $textBlock.scrollTop() / $textBlock[0].scrollHeight : 0;
			}

      this.field.makeUneditable();
      this.setTitleEditable(false);
      $("#save-status-" + this.useID).hide();
      $('#' + this.useID).height(
            this.size.height - jQuery(this.toolbarDiv).outerHeight(true)-8);

      var textEditorAnnotate = this.field.getPluginByClassId('Annotation');
      textEditorAnnotate.addListenersToAllHighlights();
      this._addDocumentIconListeners();

      var t = $("#save-status-" + this.useID).closest(".text-editor-toolbar");
      t.find(".goog-toolbar-button").not("#toggle-markers").hide();
      t.find(".goog-toolbar-menu-button").hide();
			t.find(".goog-toolbar-separator").hide();

      if (this.field.getCleanContents().length == 0 && $("#load-status-" + this.useID).length == 0) {
         $(this.rootDiv).append("<div class='text-edit-load-status' id='load-status-"+this.useID+"'>Loading...</div>");
      }

			this.editorIframeElement = this.domHelper.getElement(this.useID);

      if ( this.readOnlyClone ) {
         $(this.documentIcon).hide();
         var title = $(this.container.titleEl).closest(".atb-ViewerContainer-titleWrapper");
         title.addClass("read-only-clone");
         if ( this.databroker.projectController.canUserEditProject() ) {
            $(title).append("<div class='clone-header'>Read-Only Copy</div>");
         }
      }

			var $newTextBlock = $("#" + this.useID);
			if ($newTextBlock.length > 0)
				$newTextBlock.scrollTop(scrollTopPct * $newTextBlock[0].scrollHeight);
   }
};

dm.viewer.TextEditor.prototype.loadResourceByUri = function(uri, opt_doAfter) {
	  console.log("loadResourceByUri");
    var resource = this.databroker.getResource(uri);

    this.loadingContent = true;
    if (resource.hasType('dctypes:Text')) {
        resource.defer().done(function() {
            this.resourceId = resource.getUri();
            this.uri = resource.getUri();
            this.setDisplayTitle(this.databroker.dataModel.getTitle(resource));

            this.databroker.dataModel.textContents(resource, function(contents, error) {
                if (contents || this.databroker.dataModel.getTitle(resource)) {

                  if (contents != null) {
                     contents = contents.replace(/a href=/g, "a target='_blank' href=").replace(/atb-editor-textannotation-nohighlight|atb-editor-textannotation-selected/g, "");
                  }
                	this.setHtml(contents);
                    var textEditorAnnotate = this.field.getPluginByClassId('Annotation');
                    textEditorAnnotate.addListenersToAllHighlights();
                    $("#save-status-"+this.useID).text("Loaded");

										var loadStatus =  $("#load-status-" + this.useID);
										loadStatus.text("Loaded");
										loadStatus.fadeOut(500, function() {
                       loadStatus.remove();
                    });

                    if (opt_doAfter) {
                       opt_doAfter();
                    }

                    if ( contents == null) {
                       this.loadingContent = false;
                    }
                    this.field.clearDelayedChange();

                }
                else {
                   this.loadError = true;
                   console.error(error);
                }
            }.bind(this));
        }.bind(this));

        this.resource = resource;
    }
    else if (resource.hasType('oa:SpecificResource')) {
        var selector = resource.getOneResourceByProperty('oa:hasSelector');

        if (selector.hasAnyType(['oa:TextQuoteSelector', 'oa:TextPositionSelector'])) {
            var textResource = resource.getOneResourceByProperty('oa:hasSource');

            this.loadResourceByUri(textResource.bracketedUri, function() {
                this.selectAndMoveToSpecificResource(resource);
            }.bind(this));
        }
    }
    else {
        throw {
            message: "dm.viewer.TextEditor cannot load this resource type " + resource,
            uri: uri
        };
    }

    return this;
};

dm.viewer.TextEditor.prototype.setAnnotationBody = function (bodyResourceId) {
    this.bodyResourceId = bodyResourceId;
};

dm.viewer.TextEditor.prototype.showErrorMessage = function (msg) {
	var dialog = new dm.widgets.DialogWidget(
		{
			bModal: true,
			caption: "Error",
			content: ""+msg,
			show_buttons: [
				dm.widgets.DialogWidget.prototype.StandardButtonDefs.OkButton//,
				//this.StandardButtonDefs.CancelButton
			]
		}
	);
	dialog.show();
};

dm.viewer.TextEditor.prototype.DEFAULT_DOCUMENT_TITLE = 'Untitled text document';

/**
 * Create link on entire document (hover over toolbar document icon to do so)
 */
dm.viewer.TextEditor.prototype.createNewTextBody = function() {
   this.hideHoverMenu();
   var databroker = this.databroker;
   var body = databroker.dataModel.createText('New annotation on ' + this.getTitle());

   var anno = databroker.dataModel.createAnno(body, this.resource);

   var annoBodyEditor = new dm.viewer.TextEditor(this.clientApp);
   this.openRelatedViewer(body.uri, annoBodyEditor);

   var email = $.trim($("#logged-in-email").text());
   annoBodyEditor.lockStatus(body.uri,true,true, email, null);
   annoBodyEditor.lockResource(body.uri,null,null);

   annoBodyEditor.loadResourceByUri(body.uri);
};

/**
 * Start process of linking another resource to this document
 */
dm.viewer.TextEditor.prototype.linkAnnotation = function () {
   this.highlightDocumentIcon();
   this.hideHoverMenu();
	this.clientApp.createAnnoLink("<"+this.resourceId+">");
};

dm.viewer.TextEditor.prototype.onChange = function (event) {
   if ( this.loadingContent === false   ) {
      this.saveContents();
    }
    this.loadingContent = false;
};

dm.viewer.TextEditor.prototype.handleLinkingModeExited = function(event) {
	$("#save-status-"+this.useID).text("Not Saved");
	this.unHighlightDocumentIcon();
};
