goog.provide('atb.viewer.TextEditor');

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

goog.require('atb.viewer.Finder');
goog.require('atb.viewer.Viewer');

//begin radial menus test includes:
goog.require('atb.Util');
goog.require('atb.widgets.IMenu');
goog.require('atb.widgets.Toolbar');
goog.require('atb.widgets.MenuItem');
goog.require('atb.widgets.MenuUtil');
goog.require('atb.util.StyleUtil');
goog.require('atb.util.ReferenceUtil');
//end radial menus test includes

goog.require('atb.widgets.DialogWidget');

goog.require('atb.viewer.TextEditorAnnotate');
goog.require('atb.viewer.TextEditorProperties');

goog.require('goog.events.PasteHandler');
goog.require('atb.util.Set');

goog.require('atb.widgets.GlassPane');
goog.require('atb.widgets.ForegroundMenuDisplayer');

goog.require('atb.events.ResourceClick');
goog.require('atb.events.ResourceModified');

/**
 * atb.viewer.TextEditor
 * Creates a Text Editor
 *
 * @constructor
 *
 * @extends {atb.viewer.Viewer}
 * 
 * @param clientApp {!atb.ClientApp}
 * @param opt_initialTextContent {string=}
 * @param opt_annoBodyId {string=}
 **/
atb.viewer.TextEditor = function(clientApp, opt_initialTextContent) {
	atb.viewer.Viewer.call(this, clientApp);
    
    this.viewerType = 'text editor';
	 this.unsavedChanges = false;
	 this.loadingContent = false;
	 this.loadError = false;
	 this.saveClickedAt = -1;
    this.styleRoot = this.clientApp.getStyleRoot();
	
	this.bDeleteHighlightMode = false;
	
	this.useID = 'atb_ui_editor_' + goog.string.getRandomString();
	
    this.purpose = 'other';
};
goog.inherits(atb.viewer.TextEditor, atb.viewer.Viewer);

atb.viewer.TextEditor.VIEWER_TYPE = 'text editor';

/**
 * getSanitizedHtml()
 * @return {string} the html contents of the editor with unwanted tags (such as <script>) removed
 **/
atb.viewer.TextEditor.prototype.getSanitizedHtml = function () {
    var cleanContents = this.field.getCleanContents();
    cleanContents = cleanContents.replace(/'/g, "&#39;");
    // cleanContents = cleanContents.replace(/"/g, "&quot;");
    return cleanContents;
};

/**
 * setHtml(htmlString)
 * sets the contents of the editor to the specified string
 * @param {!string} htmlString the html to be written to the editor
 **/
atb.viewer.TextEditor.prototype.setHtml = function (htmlString) {
    if (this.field) {
	    this.field.setHtml(false, htmlString, false );
    }
};

/*
//partially implemented, but hopeless probably:
atb.viewer.TextEditor.prototype.fixPastedSpans = function()
{
	var tag = this.field.field;//hack
	fixPastedSpans_visitRecursively_(tag);
};
atb.viewer.TextEditor.prototype.fixPastedSpans_visitRecursively_ = function(tag)
{
	if (this.isAnnotationSpan(tag))
	{
	}
	
	var self =this;
	var jqContents = jQuery(tag).children();
	jqContents.each(function()
	{
		var childTag = this;
		
		var childTagName = childTag.nodeName;//or tagName...?
	
};
*/

function processpaste (elem, savedcontent) {
    pasteddata = elem.innerHTML;
    var txt = $(elem).text();
    //^^Alternatively loop through dom (elem.childNodes or elem.getElementsByTagName) here

    elem.innerHTML = savedcontent;

    // Do whatever with gathered data;
    alert(txt);
}

function waitforpastedata (elem, savedcontent) {
    if (elem.childNodes && elem.childNodes.length > 0) {
        processpaste(elem, savedcontent);
    }
    else {
        that = {
            e: elem,
            s: savedcontent
        };
        that.callself = function () {
            waitforpastedata(that.e, that.s);
        };
        setTimeout(that.callself,2);
    }
} 

function doGetCaretPosition (oField) {

  // Initialize
  var iCaretPos = 0;

  // IE Support
  if (document.selection) {

    // Set focus on the element
    oField.focus ();

    // To get cursor position, get empty selection range
    var oSel = document.selection.createRange ();

    // Move selection start to 0 position
    oSel.moveStart ('character', -oField.value.length);

    // The caret position is selection length
    iCaretPos = oSel.text.length;
  }

  // Firefox support
  else if (oField.selectionStart || oField.selectionStart == '0')
    iCaretPos = oField.selectionStart;

  // Return results
  return (iCaretPos);
}

atb.viewer.TextEditor.prototype.onTextPasted = function(e)
{
	var ele = e.currentTarget;
	var stuff = ele.innerHTML;

    //alert(doGetCaretPosition(ele));
   
   //ele.innerHTML = "";

	//waitforpastedata(ele, stuff);
	//alert("paste orig: "+stuff);
};

/**
 * addStylesheetToEditor(stylesheetURI)
 * adds the specified stylesheet to the editor iframe
 * @param stylesheetURI {!string} the URI of the stylesheet *relative to the html document*
 **/
atb.viewer.TextEditor.prototype.addStylesheetToEditor = function (stylesheetURI) 
{
    var linkElement = this.editorIframe.document.createElement('link');
    linkElement.setAttribute('rel', 'stylesheet');
    linkElement.setAttribute('href', stylesheetURI);

    var head = this.editorIframe.document.getElementsByTagName('head')[0];

    head.appendChild(linkElement);
};

/**
 * saveContents
 * @param opt_doAfter {function=}
 * @param opt_doAfterScope {object=}
 **/
atb.viewer.TextEditor.prototype.saveContents = function () {
    if (this.resourceId == null) {
        this.resourceId = this.databroker.createUuid();
        this.uri = this.resourceId;
    }
    
    var resource = this.databroker.getResource(this.resourceId);
    this.databroker.dataModel.setTitle(resource, this.getTitle());
    this.databroker.dataModel.setTextContent(resource, this.getSanitizedHtml());

    var highlightPlugin = this.field.getPluginByClassId('Annotation');
    highlightPlugin.updateAllHighlightResources();

    this.unsavedChanges = false;
};

/**
 * scrollIntoView
 * centers the editor view scroll with the tag roughly in the center
 * @param tag {Element} highlight span
 **/
atb.viewer.TextEditor.prototype.scrollIntoView = function (element) {
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
};

atb.viewer.TextEditor.prototype.selectAndMoveToSpecificResource = function (specificResource) {
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

atb.viewer.TextEditor.prototype.resize = function(width, height) {
    atb.viewer.Viewer.prototype.resize(width, height);
	
	jQuery('#' + this.useID).width(width)
    .height(height - jQuery(this.toolbarDiv).outerHeight(true));
};

atb.viewer.TextEditor.prototype.render = function(div) {
	if (this.rootDiv != null) {
		return;
	}
    atb.viewer.Viewer.prototype.render.call(this, div);

    this.editorDiv = this.domHelper.createDom('div', {'id': this.useID});
    this.toolbarDiv = this.domHelper.createDom('div');
    
    this.rootDiv.appendChild(this.toolbarDiv);
    
    // this.renderPropertiesPane();
    
    this.rootDiv.appendChild(this.editorDiv);
    
    this._renderDocumentIcon();
    
    atb.viewer.TextEditor.prototype.autoOutputSaveStatus = 1 * 1000;
    var self = this;
    this.autoOutputSaveStatusIntervalObject = window.setInterval(
       function() {
          var status = "";
          if ( self.loadingContent === true ) {
             status = "Loading document..."; 
          } else if ( self.loadError === true ) {
             status = "Load failed!"; 
          } else {
             if (!self.unsavedChanges && !self.databroker.syncService.hasUnsavedChanges() && !self.databroker.hasSyncErrors) {
                 status = "Saved";      
                 self.saveButton.setEnabled(true);
             } else if (self.databroker.hasSyncErrors) {
                 status = "Not Saved - Sync Errors!";      
                 self.saveButton.setEnabled(true);
             } else if (self.unsavedChanges || self.databroker.syncService.hasUnsavedChanges()) {
                 status = "Not Saved";   
             } else {
                 self.saveButton.setEnabled(true);
             }
          }
          
          // Failsafe.... if after 20 sec still no save succes from server, re-enable the save
          if ( self.saveClickedAt > -1 && self.unsavedChanges === false && self.databroker.syncService.hasUnsavedChanges() ) {
            var now = Date.now();
            var delta = (now - self.saveClickedAt)/1000;
            if ( delta > 20 ) {
               self.saveButton.setEnabled(true);
            }
          }
      
          var saveStatusElement = $("#"+self.useID + '_js_save_status');
          if (saveStatusElement.length > 0) {  
             var currTxt =  saveStatusElement.text();
              if ( saveStatusElement.text() !=  status ) { 
                saveStatusElement.text( status);
              }
          }
       }, this.autoOutputSaveStatus);

    
    goog.events.listen(
        this.clientApp.getEventDispatcher(), 
        atb.events.LinkingModeExited.EVENT_TYPE, 
        this.handleLinkingModeExited, false, this);


    this.field = new goog.editor.Field(this.useID, this.domHelper.getDocument());
    
    this.field.registerPlugin(new goog.editor.plugins.BasicTextFormatter());
    //this.field.registerPlugin(new goog.editor.plugins.UndoRedo());
    //this.field.registerPlugin(new goog.editor.plugins.ListTabHandler());
    //this.field.registerPlugin(new goog.editor.plugins.SpacesTabHandler());
    //this.field.registerPlugin(new goog.editor.plugins.EnterHandler());
    //this.field.registerPlugin(new goog.editor.plugins.HeaderFormatter());
    this.field.registerPlugin(new goog.editor.plugins.LinkDialogPlugin());
    this.field.registerPlugin(new goog.editor.plugins.LinkBubble());
    this.field.registerPlugin(new atb.viewer.TextEditorAnnotate(this));

    this.field.makeEditable();

    this._renderToolbar();

    var editorHtmlElement = this.field.getEditableDomHelper().getDocument().getElementsByTagName('html')[0];
    this.databroker.namespaces.bindNamespacesToHtmlElement(editorHtmlElement);
    
    this.pasteHandler = new goog.events.PasteHandler(this.field);
    this.field.addListener(goog.events.PasteHandler.EventType.PASTE, function(e) {
      this.onTextPasted(e);
    }.bind(this));
    
    this.editorIframeElement = this.domHelper.getElement(this.useID);
    this.editorIframe = goog.dom.getFrameContentWindow(this.editorIframeElement);
    this.addStylesheetToEditor(this.styleRoot + 'atb/editorframe.css');
    
    // this.finishRenderPropertiesPane();
    
    this.addGlobalEventListeners();

    if (this.container) {
        this.container.autoResize();
        this.container.setTitleEditable(true);
    }
};

atb.viewer.TextEditor.prototype._addDocumentIconListeners = function() {
    var createButtonGenerator = atb.widgets.MenuUtil.createDefaultDomGenerator;

    if (this.isEditable()) {
        var menuItems = [
            // new atb.widgets.MenuItem(
            //         "showLinkedAnnos",
            //         createButtonGenerator("atb-radialmenu-button icon-search"),
            //         function(actionEvent) {
            //             this.showAnnos(this.resourceId);
            //         }.bind(this), 
            //         'Show resources linked to this document'
            // ),
            new atb.widgets.MenuItem(
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
            new atb.widgets.MenuItem(
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

atb.viewer.TextEditor.prototype._renderDocumentIcon = function() {
    this.documentIcon = this.domHelper.createDom('div', {'class': 'atb-viewer-documentIcon'});
    goog.events.listen(this.documentIcon, goog.events.EventType.CLICK, this.handleDocumentIconClick_, false, this);
    
    this._addDocumentIconListeners();
    
    this.rootDiv.appendChild(this.documentIcon);
};

atb.viewer.TextEditor.prototype._renderToolbar = function() {
    if (this.isEditable()) {
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
    }
    else {
        var buttons = [];
    }

    jQuery(this.toolbarDiv).empty();

    var myToolbar = goog.ui.editor.DefaultToolbar.makeToolbar(buttons, this.domHelper.getElement(this.toolbarDiv));

    if (this.isEditable()) {
        // Create annotate button
        // TODO: See if we can move this into the plugin instead of here
        var annotateButton = goog.ui.editor.ToolbarFactory.makeToggleButton(
            atb.viewer.TextEditorAnnotate.COMMAND.ADD_ANNOTATION,
            'Annotate selected text',
            '',
            'icon-tag');
        /*
        //lol@seems un-needed, and infact causes a redundant event, it would seem, from what i can tell:
        goog.events.listen(annotateButton, goog.ui.Component.EventType.ACTION, function (e) {
            //debugPrint("annotate command!");
            this.field.execCommand(atb.viewer.TextEditorAnnotate.COMMAND.ADD_ANNOTATION);
        }, false, this);
        */
        annotateButton.queryable = true;//Fixes wierd annotations bug

        myToolbar.addChildAt(annotateButton, 0, true);
        
        this.saveButton = goog.ui.editor.ToolbarFactory.makeButton(
            'save',
            'Save this document',
            '',
            'icon-ok'
        );
        goog.events.listen(this.saveButton, goog.ui.Component.EventType.ACTION, this.handleSaveButtonClick_, false, this);
        myToolbar.addChild(this.saveButton, true);
    }

    var saveStatusDiv = this.domHelper.createDom('div', {'id': this.useID + '_js_save_status', 'class': 'goog-toolbar goog-toolbar-horizontal'}, 'Loading document...');
    this.toolbarDiv.appendChild(saveStatusDiv);

    // Hook the toolbar into the field.
    var myToolbarController = new goog.ui.editor.ToolbarController(this.field, myToolbar);
};


atb.viewer.TextEditor.prototype.handleSaveButtonClick_ = function (e) {
    
    // disable save button
    // Save button re-enabled in the outputSaveStatus check.
    this.saveClickedAt = Date.now();
    this.saveButton.setEnabled(false);
    this.saveContents();
    this.databroker.sync();
};

atb.viewer.TextEditor.prototype.setPurpose = function (purpose) {
    this.purpose = purpose;
};

atb.viewer.TextEditor.prototype.handleDocumentIconClick_ = function (e) {
    e.stopPropagation();
    
    var eventDispatcher = this.clientApp.getEventDispatcher();
    var event = new atb.events.ResourceClick(this.resourceId, eventDispatcher, this);
    eventDispatcher.dispatchEvent(event);
};

atb.viewer.TextEditor.prototype.addGlobalEventListeners = function () {
    var eventDispatcher = this.clientApp.getEventDispatcher();
    
    goog.events.listen(this.field, goog.editor.Field.EventType.CHANGE, this.onChange, false, this);

    goog.events.listen(this.editorIframe, 'mousemove', function (e) {
                       var offset = jQuery(this.editorIframeElement).offset();
                       
                       this.mousePosition.x = e.clientX + offset.left;
                       this.mousePosition.y = e.clientY + offset.top;
                       }, false, this);

    goog.events.listen(this.editorIframe.document.body, 'click', function(e) {
        var annotationPlugin = this.field.getPluginByClassId('Annotation');

        annotationPlugin.deselectAllHighlights();
    }, false, this);

    // Stops autosave when the window is closed.
    goog.events.listen(this.container.closeButton, 'click', function(e) {
        clearInterval(this.autoOutputSaveStatusIntervalObject);
    }, false, this);
};

atb.viewer.TextEditor.prototype.getTitle = function () {
    return this.databroker.dataModel.getTitle(this.resource);
};

atb.viewer.TextEditor.prototype.setTitle = function(title) {
    this.databroker.dataModel.setTitle(this.resource, title);
    this.setDisplayTitle(title);
};

atb.viewer.TextEditor.prototype.setDisplayTitle = function(title) {
    if (this.container) {
        this.container.setTitle(title);
    }
};

atb.viewer.TextEditor.prototype.isTitleEditable = function() {
	return this.container.isTitleEditable;
};

atb.viewer.TextEditor.prototype.isEditable = function() {
    if (this.field) {
        return !this.field.isUneditable();
    }
    else {
        return true;
    }
};

atb.viewer.TextEditor.prototype.makeEditable = function() {
    if (!this.isEditable()) {
        this.field.makeEditable();

        this._renderToolbar();

        jQuery('#' + this.useID).width(this.size.width)
            .height(this.size.height - jQuery(this.toolbarDiv).outerHeight(true));

        this.setTitleEditable(true);
    }
};

atb.viewer.TextEditor.prototype.makeUneditable = function() {
    if (this.isEditable()) {
        this.field.makeUneditable();

        this._renderToolbar();
        jQuery(this.toolbarDiv).find('.goog-toolbar').css('min-height', 32);

        jQuery('#' + this.useID).width(this.size.width)
            .height(this.size.height - jQuery(this.toolbarDiv).outerHeight(true))
            .addClass('atb-Editor-noedit');

        this._addHighlightListenersWhenUneditable();

        this._addDocumentIconListeners();

        this.setTitleEditable(false);
    }
};

atb.viewer.TextEditor.prototype._addHighlightListenersWhenUneditable = function() {
    if (!this.isEditable()) {
        var annotatePlugin = new atb.viewer.TextEditorAnnotate(this);

        var highlights = annotatePlugin.getAllAnnotationTags();
        for (var i=0, len=highlights.length; i<len; i++) {
            annotatePlugin.addListeners(highlights[i]);
        }
    }
};

atb.viewer.TextEditor.prototype.loadResourceByUri = function(uri, opt_doAfter) {
    var resource = this.databroker.getResource(uri);
    
    this.loadingContent = true;
    if (resource.hasType('dctypes:Text')) {
        resource.defer().done(function() {
            this.resourceId = resource.getUri();
            this.uri = resource.getUri();
            this.setDisplayTitle(this.databroker.dataModel.getTitle(resource));

            this.databroker.dataModel.textContents(resource, function(contents, error) {
                if (contents || this.databroker.dataModel.getTitle(resource)) {
                    this.setHtml(contents);
                    var textEditorAnnotate = this.field.getPluginByClassId('Annotation');
                    textEditorAnnotate.addListenersToAllHighlights();
                    this._addHighlightListenersWhenUneditable();
                    this.loadingContent = false;   
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

                if (opt_doAfter) {
                    opt_doAfter();
                }
            }.bind(this));
        }
    }
    else {
        throw {
            message: "atb.viewer.TextEditor cannot load this resource type " + resource,
            uri: uri
        };
    }

    return this;
};

atb.viewer.TextEditor.prototype.setAnnotationBody = function (bodyResourceId) {
    this.bodyResourceId = bodyResourceId;
};

atb.viewer.TextEditor.prototype.showErrorMessage = function (msg) {
	var dialog = new atb.widgets.DialogWidget(
		{
			bModal: true,
			caption: "Error",
			content: ""+msg,
			show_buttons: [
				atb.widgets.DialogWidget.prototype.StandardButtonDefs.OkButton//,
				//this.StandardButtonDefs.CancelButton
			]
		}
	);
	dialog.show();
};

atb.viewer.TextEditor.prototype.DEFAULT_DOCUMENT_TITLE = 'Untitled text document';

atb.viewer.TextEditor.prototype.createNewTextBody = function () {
	var databroker = this.databroker;
    var body = databroker.dataModel.createText('New annotation on ' + this.getTitle());

    var anno = databroker.dataModel.createAnno(body, this.resource);
	
    var annoBodyEditor = new atb.viewer.TextEditor(this.clientApp);
    this.openRelatedViewer(annoBodyEditor);
    annoBodyEditor.loadResourceByUri(body.uri);
};

atb.viewer.TextEditor.prototype.showAnnos = function (opt_myResourceId) {
	var id = opt_myResourceId || this.resourceId;

    var otherContainer = this.getOtherPanelHelper();

    var finder = new atb.viewer.Finder(this.clientApp, id);
    finder.setContextType(atb.viewer.Finder.ContextTypes.RESOURCE);

	otherContainer.setViewer(finder);
};

atb.viewer.TextEditor.prototype.linkAnnotation = function (opt_myResourceId, opt_myAnnoId) {
	var myResourceId = opt_myResourceId || this.resourceId;
	var myAnnoId = opt_myAnnoId || this.annotationUid;
    
    this.highlightDocumentIcon();
	
	this.clientApp.createAnnoLink(this.resourceId, myAnnoId);
};

/////////////////////////Filter Code:
atb.viewer.TextEditor.prototype.dumpTagSet_=function(toTag)//;
{
	//dumps a list of tags. possibly best done BEFORE the tag formatting rules, for the most info...
	var seenTags = new atb.util.Set();
	var visitor = function(tag)
	{
		var nodeName = tag.nodeName;
		if (seenTags.add(nodeName))
		{
			// debugPrint(""+nodeName);
		}
		jQuery(tag).children().each(function()
		{
			visitor(this);
		});
	};
	//visitor(this.field.field);
	visitor(toTag);
};

atb.viewer.TextEditor.prototype.replaceTagKeepingContentsHelper_ = function(tag, withTag)
{
	//TODO: maybe check that withTag isn't related to tag meaningfully..?/badly...??
	jQuery(tag).contents().each(function()
	{
		withTag.appendChild(this);
	});
	var tagParent = tag.parentNode;
	if (tagParent != null)
	{
		tagParent.replaceChild(withTag, tag);
	}

};

atb.viewer.TextEditor.prototype._readStylePropsHelper_ = function(tag)
{
	var jqTag = jQuery(tag);
	var fontWeight = jqTag.css("font-weight");
	var textDecoration = jqTag.css("text-decoration");
	var fontStyle = jqTag.css("font-style");
	/*
	debugPrint("fontWeight: "+fontWeight);
	debugPrint("textDecoration: "+textDecoration);
	debugPrint("fontStyle: "+fontStyle);
	*/
	//debugPrint("fontWeight: "+fontWeight);
	/*
	fontWeight: 400
textDecoration: none
fontStyle: normal
fontWeight: bold
textDecoration: underline blink
fontStyle: italic
	//^lol@examples...lol!
	*/
	fontWeight = ("" + fontWeight).toLowerCase();
	textDecoration= ("" + textDecoration).toLowerCase();
	fontStyle= ("" + fontStyle).toLowerCase();
	var bBold = (fontWeight.indexOf("bold") != -1);
	//var bItalics = ((fontStyle.indexOf("italics") != -1) || (fontStyle.indexOf("oblique") != -1));
	//var bItalic = ((fontStyle.indexOf("italics") != -1) || (fontStyle.indexOf("oblique") != -1));
	var bItalic = ((fontStyle.indexOf("italic") != -1) || (fontStyle.indexOf("oblique") != -1));
	
	//oblique //hack
	var bUnderline = (textDecoration.indexOf("underline") != -1);
	return {
		bold: bBold,
		italics: bItalic,
		underline: bUnderline
	};
};

atb.viewer.TextEditor.prototype.onChange = function (event) {
    if ( this.loadingContent === false   ) {
      this.unsavedChanges = true;
    } else {
       this.loadingContent = false;
    }
};

atb.viewer.TextEditor.prototype.handleLinkingModeExited = function (event) {
    var highlightPlugin = this.field.getPluginByClassId('Annotation');
    var anno = this.databroker.getResource(event.uri);
    
    highlightPlugin.unselectAllHighlights();
    this.unHighlightDocumentIcon();
    
    var bodiesAndTargets = new goog.structs.Set(anno.getProperties('oa:hasTarget').concat(anno.getProperties('oa:hasBody')));
    goog.structs.forEach(bodiesAndTargets, function (uri) {
        try {
            var specificResource = this.databroker.getResource(uri);
            var selectorUri = specificResource.getOneProperty('oa:hasSelector');
            if (selectorUri) {
                var tag = highlightPlugin.getHighlightElementByUri(uri);
                if (tag) {
                    highlightPlugin.flashSpanHighlight(tag);
                }
            }
        } catch (error) {
            console.error(error);
        }
        if (uri == this.uri) {
           this.flashDocumentIconHighlight();
        }
   }, this);
};
