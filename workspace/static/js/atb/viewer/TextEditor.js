goog.provide('atb.viewer.TextEditor');

goog.require('goog.dom');
goog.require('goog.dom.DomHelper');

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
	
    this.styleRoot = this.clientApp.getStyleRoot();
	
	this.bDeleteHighlightMode = false;
	
	this.useID = 'atb_ui_editor_' + goog.string.getRandomString();
	
    this.purpose = 'other';
};
goog.inherits(atb.viewer.TextEditor, atb.viewer.Viewer);

atb.viewer.TextEditor.VIEWER_TYPE = 'text editor';

atb.viewer.TextEditor.prototype.autoSaveInterval = 3 * 1000;

/**
 * getSanitizedHtml()
 * @return {string} the html contents of the editor with unwanted tags (such as <script>) removed
 **/
atb.viewer.TextEditor.prototype.getSanitizedHtml = function () {
	return this.field.getCleanContents();
};

/**
 * setHtml(htmlString)
 * sets the contents of the editor to the specified string
 * @param {!string} htmlString the html to be written to the editor
 **/
atb.viewer.TextEditor.prototype.setHtml = function (htmlString, opt_fireDelayedChange) {
    if (this.field) {
	    this.field.setHtml(false, htmlString, !opt_fireDelayedChange);
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
atb.viewer.TextEditor.prototype.onTextPasted = function()
{
	//this.fixPastedSpans();
	
	// this.applyFormattingRules();
};

/**
 * setHtmlWithAutoParagraphs(htmlString)
 * sets the contents of the editor to the specified string using goog's auto paragraph formatting
 * @param {!string} htmlString the html to be written to the editor
 **/
atb.viewer.TextEditor.prototype.setHtmlWithAutoParagraphs = function (htmlString) {
	this.field.setHtml(true, htmlString);
	this.onSetHTML();
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
atb.viewer.TextEditor.prototype.saveContents = function (
    opt_doAfter, opt_doAfterScope, opt_synchronously
) {
    if (this.resourceId == null) {
        this.resourceId = this.databroker.createUuid();
        this.uri = this.resourceId;
    }
    // this.updateAllPropertiesFromPane();
    
    this.unsavedChanges = false;

    var resource = this.databroker.getResource(this.resourceId);
    this.databroker.dataModel.setTitle(resource, this.getTitle());
    this.databroker.dataModel.setTextContent(resource, this.getSanitizedHtml());
    console.warn('SaveContents');

    var highlightPlugin = this.field.getPluginByClassId('Annotation');
    highlightPlugin.updateAllHighlightResources();
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
    
    // This is where the textEditor save Interval is created.
    this.autoSaveIntervalObject = window.setInterval(
        atb.Util.scopeAsyncHandler(this.saveIfModified, this), 
        this.autoSaveInterval);

    this.clientApp.registerFunctionToCallBeforeUnload(function() {
        this.saveIfModified(true);
    }.bind(this));
    
    goog.events.listen(
        this.clientApp.getEventDispatcher(), 
        atb.events.LinkingModeExited.EVENT_TYPE, 
        this.handleLinkingModeExited, false, this);


    this.field = new goog.editor.Field(this.useID, this.domHelper.getDocument());
    
    this.field.registerPlugin(new goog.editor.plugins.BasicTextFormatter());
    this.field.registerPlugin(new goog.editor.plugins.UndoRedo());
    this.field.registerPlugin(new goog.editor.plugins.ListTabHandler());
    this.field.registerPlugin(new goog.editor.plugins.SpacesTabHandler());
    this.field.registerPlugin(new goog.editor.plugins.EnterHandler());
    this.field.registerPlugin(new goog.editor.plugins.HeaderFormatter());
    this.field.registerPlugin(new goog.editor.plugins.LinkDialogPlugin());
    this.field.registerPlugin(new goog.editor.plugins.LinkBubble());
    this.field.registerPlugin(new atb.viewer.TextEditorAnnotate(this));

    this.field.makeEditable();

    this._renderToolbar();

    var editorHtmlElement = this.field.getEditableDomHelper().getDocument().getElementsByTagName('html')[0];
    this.databroker.namespaces.bindNamespacesToHtmlElement(editorHtmlElement);
    
    this.pasteHandler = new goog.events.PasteHandler(this.field);
    this.field.addListener(goog.events.PasteHandler.EventType.PASTE, function(e) {
        window.setTimeout(function() {
            this.onTextPasted();
        }.bind(this), 1);
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
        
        // this.propertiesButton = goog.ui.editor.ToolbarFactory.makeToggleButton(
        //     'properties',
        //     'Edit this document\'s properties',
        //     '',
        //     'icon-info-sign'
        // );
        // goog.events.listen(this.propertiesButton, goog.ui.Component.EventType.ACTION, this.handlePropertiesButtonClick_, false, this);
        // myToolbar.addChild(this.propertiesButton, true);
    }

    var saveStatusDiv = this.domHelper.createDom('div', {'id': this.useID + '_js_save_status', 'class': 'goog-toolbar goog-toolbar-horizontal'}, 'Loading save status...');
    this.toolbarDiv.appendChild(saveStatusDiv);

    // Hook the toolbar into the field.
    var myToolbarController = new goog.ui.editor.ToolbarController(this.field, myToolbar);
};

// atb.viewer.TextEditor.prototype.renderPropertiesPane = function () {
//     this.propertiesPaneDiv = this.domHelper.createDom('div');
//     jQuery(this.propertiesPaneDiv).hide();
    
//     this.rootDiv.appendChild(this.propertiesPaneDiv);
    
//     this.propertiesPane = new atb.viewer.TextEditorProperties(this);
// };

// atb.viewer.TextEditor.prototype.finishRenderPropertiesPane = function () {
//     this.propertiesPane.render(this.propertiesPaneDiv);
// };

// atb.viewer.TextEditor.prototype.updateAllPropertiesFromPane = function () {
//     var properties = this.propertiesPane.getUnescapedProperties();
    
//     this.setProperties(properties);
// };

// atb.viewer.TextEditor.prototype.updatePropertiesPaneContents = function () {
//     var properties = {
//         'purpose': this.purpose
//     };
    
//     this.propertiesPane.setProperties(properties);
// };

// atb.viewer.TextEditor.prototype.setProperties = function (properties) {
//     if (properties.purpose) {
//         this.setPurpose(properties.purpose);
//     }
// };

// atb.viewer.TextEditor.prototype.showPropertiesPane = function () {
//     this.updatePropertiesPaneContents();
    
//     var self = this;
//     jQuery(this.field.getElement()).fadeOut(300);
//     jQuery(this.propertiesPaneDiv).fadeIn(300);
//     jQuery(this.documentIcon).fadeOut(300);
    
//     this.propertiesPanelVisible = true;
    
//     this.propertiesButton.setChecked(true);
// };

// atb.viewer.TextEditor.prototype.hidePropertiesPane = function () {
//     var self = this;
//     jQuery(this.propertiesPaneDiv).fadeOut(300);
//     jQuery(this.field.getElement()).fadeIn(300);
//     jQuery(this.documentIcon).fadeIn(300);
    
//     this.propertiesPanelVisible = false;
    
//     this.updateAllPropertiesFromPane();
    
//     this.propertiesButton.setChecked(false);
// };

// atb.viewer.TextEditor.prototype.handlePropertiesButtonClick_ = function (e) {
//     if (this.propertiesPanelVisible) {
//         this.hidePropertiesPane();
//     }
//     else {
//         this.showPropertiesPane();
//     }
// };

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
    
    this.unsavedChanges = false;
    goog.events.listen(this.field, goog.editor.Field.EventType.DELAYEDCHANGE, this.onChange, false, this);
    
//    goog.events.listen(eventDispatcher, 'resource-modified', function (e) {
//                           if (e.getViewer() != this && e.getResourceId() == this.resourceId) {
//                                this.loadResource(e.getResource());
//                           }
//                       }, false, this);
    
    goog.events.listen(this.editorIframe, 'mousemove', function (e) {
                       var offset = jQuery(this.editorIframeElement).offset();
                       
                       this.mousePosition.x = e.clientX + offset.left;
                       this.mousePosition.y = e.clientY + offset.top;
                       }, false, this);

    goog.events.listen(this.editorIframe.document.body, 'click', function(e) {
        var annotationPlugin = this.field.getPluginByClassId('Annotation');

        annotationPlugin.deselectAllHighlights();
    }, false, this);
};

atb.viewer.TextEditor.prototype.dismissContextMenu = function(menu) {
	this.unselectAllHighlights();
	menu.hide();//lol!
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

                    if (opt_doAfter) {
                        opt_doAfter();
                    }
                }
                else {
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

atb.viewer.TextEditor.prototype.applyFormattingRules = function()
{
    
    //DISABLE----------------------
    //return;
    //-----------------------------
    
	//Todo: make a proper formatter helper-/implmentation class sometime, probably...
	var toTag = this.field.field;
	this.applyFormattingRulesRecursively_(toTag);
	
//	if (false)
//	{
//		this.dumpTagSet_(this.field.field);
//	}
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

atb.viewer.TextEditor.prototype.applyFormattingRulesRecursively_ = function(toTag)
{
	//_readStylePropsHelper_(toTag);//lol!
	//this._readStylePropsHelper_(toTag);//lol!
	//or check computed style for boldness/etc...?
	
	

	//var jqContents = jQuery(toTag).contents();
	//debugViewObject(toTag);
	//if (t
	
	//a, ul, ol, li, p, br
	var allowedSet = new atb.util.Set();
	allowedSet.addAll(["a", "ul", "ol", "li", "p", "br"]);
	allowedSet.addAll(["b","i","u"]);//LOLforgot me's...
	allowedSet.addAll(["span", "body"]);//less sure about the specifics todo with these...!
//	allowedSet.addAll(["span", "body", "style"]);//less sure about the specifics todo with these...!
	//if (false)
	{
		//while this does "fix" the div problem, apparently we want to do this the "correct" (hopefully) way...
		allowedSet.add("div");//TEST HACK
	}
	
	var blockElementSet = new atb.util.Set();
	
	//blockElementSet.add("div");
	//blockElementSet.add("p");//not needed b/c we're still allowing p tags...!
	//blockElementSet.addAll("
	
	//allowedSet.addAll(["span", "body"]);//less sure about the specifics todo with these...!
	
	var self =this;
	var jqContents = jQuery(toTag).children();
	jqContents.each(function()
	{
		var childTag = this;
		
		var childTagName = childTag.nodeName;//or tagName...?
		childTagName=childTagName.toLowerCase();
		/*
		
		if (childTagName == "div")
		{
			//TODO: replace with tag + br...?
			
			//childTag.parentNode.replaceChild(
		}
		*/

		if (childTagName == "style")
		{
            childTag.innerHTML = "";
            return;
            
			//debugViewObject(childTag.childNodes, "style children");
			//^lol@fascinating use of 3 text nodes for the css text...lol!
			
			//debugPrint("style -- childNodes.length = "+childTag.childNodes.length);//lol@ 3 childnodes...???
			
			//debugPrint("style -- innerhtml = "+childTag.innerHTML);
			var str = "" + childTag.innerHTML;
			var matchFrag = "span.atb-ui-editor-textannotationatb-ui-editor-textannotation-id-";
			/////oklol://				 span.atb-ui-editor-textannotationatb-ui-editor-text
			var matchIndex = 0;
			var bChanged = false;
			var ret = "";
			var temp = "";
			var bSkipUntilClosingCurly = false;
			for(var i=0,l=str.length; i<l; i++)
			{
				var ch = str[i];
				if (bSkipUntilClosingCurly)
				{
					if (ch == "}")
					{
						bSkipUntilClosingCurly = false;
					}
					continue;
				}
				
				if (ch == matchFrag[matchIndex])
				{
					matchIndex++;
					temp += ch;
					//debugPrint("matchIndex: "+ matchIndex);
					if (matchIndex >= matchFrag.length)
					{
						bChanged = true;
						bSkipUntilClosingCurly = true;
						matchIndex = 0;
						temp = "";
						//debugPrint("!!!");
					}
				}
				else
				{
					ret+=temp;
					temp = "";
					
					matchIndex=0;
					ret += ch;
				}
				//span.atb-ui-editor-textannotationatb-ui-editor-textannotation-id-
			}
			if (bChanged)
			{
				childTag.innerHTML = ret;
				//continue;
				return;
			}
			
			//debugPrint("style -- innerhtml = "+childTag.innerHTML);
			return;
		}

		
		if (childTag.childNodes.length > 0)
		{
			self.applyFormattingRulesRecursively_(this);
		}
		//^lets do the recursion first... then the tag...lol!
		
		
		//TODO: check for bold/etc somewhere and add the proper tags if pertinent...?
		
		//maybe more cross-browser compatible...?:
		
		var childStyleAttribs = self._readStylePropsHelper_(childTag);//lol!
		//if (
		
		//this._readStylePropsHelper_(toTag);//lol!
		
		
		//jQuery(childTag).attr("style", "");
		
		var bSpan = (childTagName == "span");
		
		//var bBlockLevelElement = (blockElementSet.has(childTagHame));//hack
		//var bBlockLevelElement = (blockElementSet.has(childTagNSame));//hack
		//^LOLFAIL!
		var bBlockLevelElement = (blockElementSet.has(childTagName));//hack
		/*
		if (bBlockLevelElement)
		{
			//bBlockLevelElement
			debugPrint("bBlockLevelElement is true!!!");//reached
		}
		else
		{
			debugPrint("not a blocklevel element; tag: '"+childTagName+"'");
		}
		*/
		var bHasHighlightMarkerCssClass = false;
		
		//Node::classList looked promising, but, its html5 ish... =/
		var childClassList = childTag.className.split(/\s+/);
		var jqChildTag;
		jqChildTag = jQuery(childTag);
		
		var bHasRealAnnoClass = false;
		
		var hackSpanIdClass = null;
		//debugPrint("");//HACK
		for (var i=0, l = childClassList.length; i<l; i++)
		{
			var oneClassName = childClassList[i];
			if (bSpan)
			{
				//if (!bHasHighlightMarkerCssClass)
				{
					//bHasHighlightMarkerCssClass = (oneClassName.indexOf(atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS) != -1);
					if ((oneClassName.indexOf(atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS) != -1))
					{
						//debugPrint("oneClassName="+oneClassName);
						if (hackSpanIdClass==null)
						{
							hackSpanIdClass = [];
						}
						bHasHighlightMarkerCssClass = true;//lol!
						//if (bHasHighlightMarkerCssClass)
						{
							hackSpanIdClass.push(oneClassName);
							//hackSpanIdClass = oneClassName;//HACK we'll need this later...
						}
						
						if (
							(oneClassName.indexOf(atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS_ID)!=-1) || 
							(oneClassName.indexOf(atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS_LOCAL_ID)!=-1)
						){
							bHasRealAnnoClass=true;
							//debugPrint("bHasRealAnnoClass = true!");
							//bHasRealClass
						}
					}
				}//TODO: maybe warn if matched multiple times...??
					//if (hackSpanIdClass
			}
			jqChildTag.removeClass(oneClassName);//childClassList[i]);
		}
		if (!bHasRealAnnoClass)
		{
			//debugPrint("not a real anno anymore!");
			hackSpanIdClass = null;//kill the highlight if it lacks an id class!
		}
		//else
		//{
		//	debugPrint("a real anno!?");
		//}
		var newStyle ="";
		var bStyledChild = (childStyleAttribs.bold || childStyleAttribs.italics || childStyleAttribs.underline);
		
		if (childStyleAttribs.bold)
		{
			newStyle += "font-weight: bold; ";
		}
		if (childStyleAttribs.italics)
		{
			newStyle += "font-style: italic; ";
		}
		if (childStyleAttribs.underline)
		{
			newStyle += "text-decoration: underline; ";
		}
		//^LOLHACKX!
		//jQuery(childTag).attr("style", "");
		
		
		jQuery(childTag).removeAttr("align");//HACK
		
		if (newStyle == "")
		{
			jQuery(childTag).removeAttr("style");
		}
		else
		{
			jQuery(childTag).attr("style", newStyle);//lolhack!
		}
		
		
		
		if (hackSpanIdClass!=null)
		{
			for(var iclass=0,lclass=hackSpanIdClass.length; iclass<lclass; iclass++)
			{
				//jQuery(childTag).addClass(hackSpanIdClass);//HACK
				jQuery(childTag).addClass(hackSpanIdClass[iclass]);//HACK
			}
		}
		//if (
		//On the Cotton Map
		
		if ( (!allowedSet.has(childTagName)) || (bSpan && (!bHasHighlightMarkerCssClass)))
		{//Q: ^will the above still work if we have bold/etc on a span highlight...???
			//^Whitelist//						//^//if not a marker, then kill the span
			
			//debugPrint("unhandled tag name: "+childTagName);
			
			var parentNode = childTag.parentNode;
			var afterSibling = childTag.nextSibling;
			//var theCurrentChild = childTag;
			/*
			if (bBlockLevelElement)
			{
				bStyledChild=true;//HACK!!
			}
			*/
			if (bStyledChild)
			{
				var nds = [];
				
				
				if (childStyleAttribs.bold)
				{
					nds.push(this.domHelper.createElement("b"));
				}
				if (childStyleAttribs.italics)
				{
					nds.push(this.domHelper.createElement("i"));
				}
				if (childStyleAttribs.underline)
				{
					nds.push(this.domHelper.createElement("u"));
				}
				/*
				if (bBlockLevelElement)
				{
					//nds.push("p");//lol!
					nds.push(document.createElement("p"));
				}
				*/
				//if (if (bBlockLevelElement))
				
				
				var nd = nds[nds.length-1];
				var nd_tmp = nds[0];
				for (var ndi=1, ndl = nds.length; ndi<ndl; ndi++)
				{
					nd_tmp.appendChild(nds[ndi]);
					nd_tmp = nds[ndi];
				}
			
				jQuery(this).contents().each(function(){nd.appendChild(this)});
				
				
				parentNode.replaceChild(nds[0], childTag);//replace us
				//theCurrentChild=nds[0];
				
				childTag = nd;
				bSpan=false;
				// debugPrint("styledchild!");
			}
			else
			{
				//Move children of this child into their grandparent, the current node...
				
				//debugPrint("NOT-styledchild!");
				// debugPrint("NOT-styledchild! nodeName="+childTagName);
				//jQuery(this).contents().each(function(){toTag.appendChild(this)});
				var afterNode = childTag.nextSibling;
				
				jQuery(childTag).contents().each(
					function()
					{
						if (afterNode == null)
						{
							toTag.appendChild(this);
						}
						else
						{
							toTag.insertBefore(this, afterNode);
						}
						//toTag.appendChild(this);
					}
				);
				toTag.removeChild(childTag);
				//debugPrint("NOT-styledchild!");
				//return;
			}
			//lol@textalignment
			//bSpan = false;
			
			
			if (bBlockLevelElement)
			{
				//debugPrint("adding a br...");
				//if (false)
				
				//var beforeName = childTag.nodeName;//or tagName...?
				//childTagName=childTagName.toLowerCase();
		
				{
					// debugPrint("adding a br...");
					var newBr = this.domHelpercreateElement("br");
					if (afterSibling == null)
					{
						//parentNode.appendChild(br);
						parentNode.appendChild(newBr);
					}
					else
					{
						parentNode.insertBefore(newBr, afterSibling);
					}
				}
			}
			/*if (bBlockLevelElement)
			{
				return;//HACK
			}*/
			
			if (!bStyledChild)
			{
				return;
			}
			
		}
		
		
		//childTag.setAttribute("style", "");//hack
		//handle special cases and remove dead tags:
		
		var bLineFeedTag = (childTagName=="br");
		
		
		
		//if a span, add back the marker classes/etc, if relevant.
		if (bSpan)
		{
			//Note: in order to remove style stuff above, we really probably want to remove the classes first, so we can't merge with the if-span parts above...!
			if (bHasHighlightMarkerCssClass)
			{
				/*
				jqChildTag.addClass(atb.resource.TextResource.ANNOTATION_MARKER_CLASS_NAME);
				jqChildTag.addClass(atb.viewer.TextEditorAnnotate.HIGHLIGHT_STYLING_CLASS);
				*/
				
				/*
				//sadly this stuff isn't present in this version..
				var resourceId = self.annotatePlugin.span2LocalId(childTag);
				
				//check if it was selected:
				if (self.isSelectedSpanId(resourceId))//todo: rename those methods to be better/more clearly named...!
				{
					jqChildTag.addClass(atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS_SELECTED);
				}
				
				//check if it was being hovered over:
				if (self.isHoverSpanId(resourceId))
				{
					jqChildTag.addClass(atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS_HOVER);
				}
				*/
			}
			/*
			else
			{
				//if not a marker, then kill the span:
				
				//Move children of this child into their grandparent, the current node...
				//debugPrint("non-marker-span: "+childTag.innerHTML);
				jQuery(this).contents().each(function(){toTag.appendChild(this)});
			}
			*/
		}
		
		//kill empty tags, except, <BR>:
		if (!bLineFeedTag)
		{
			if (childTag.childNodes.length < 1)
			{
				//debugPrint("removing empty tag: '"+childTagName+"'");
				// debugPrint("empty tag!");
				if (childTag.parentNode != null)
				{
					childTag.parentNode.removeChild(childTag);
				}
				else
				{
					debugViewObject(childTag,"warning null parentNode!");
				}
			}
		}
	});
};

atb.viewer.TextEditor.prototype.getPositionOfFieldChildElement = function (element) {
	var elementPosition = jQuery(element).offset();
	var xCoord = elementPosition.left;
	var yCoord = elementPosition.top;

	//traverse field's parents' position:
	var domHelper = this.domHelper;
	var fieldIframe = domHelper.getDocument().getElementById(this.useID);
	var framePosition = jQuery(fieldIframe).offset();
    var scrollTop = jQuery(fieldIframe.contentDocument).scrollTop();
	xCoord += framePosition.left;
	yCoord += framePosition.top - scrollTop;
	
	return {
		x: xCoord,
		y: yCoord
	};
};

atb.viewer.TextEditor.prototype.hasUnsavedChanges = function () {
    console.warn('TextEditor: hasUnsavedChanges?');
    console.warn(this.unsavedChanges);
    return !! this.unsavedChanges;
};

atb.viewer.TextEditor.prototype.onChange = function (event) {
    console.warn('Changed!');
    this.unsavedChanges = true;

    // change to NOT SAVED here!
    var domHelper = this.domHelper;
    var saveStatusElement = domHelper.getDocument().getElementById(this.useID + '_js_save_status');
    // var this.saveStatus = "Not Saved!";
    if (this.unsavedChanges || this.databroker.syncService.hasUnsavedChanges() || saveStatusElement) {
        console.warn('saveStatusElement: ' + saveStatusElement);
        this.saveStatus = "Not Saved";
        this.domHelper.setTextContent(saveStatusElement, this.saveStatus);
    }
    
    this.timeOfLastChange = goog.now();
};

atb.viewer.TextEditor.prototype.saveDelayAfterLastChange = 1 * 1000;

// This is run every 2 seconds (see above)
atb.viewer.TextEditor.prototype.saveIfModified = function (opt_synchronously) {
    console.warn('Does databroker see unsaved changes?');
    console.warn(this.databroker.syncService.hasUnsavedChanges());
    console.warn('Sync Service Errors:');
    console.warn(this.databroker.hasSyncErrors);

    // change to SAVED here if databroker doesn't see unSavedChanges!
    var domHelper = this.domHelper;
    var saveStatusElement = domHelper.getDocument().getElementById(this.useID + '_js_save_status');
    // var this.saveStatus = "Not Saved!";
    if (!this.unsavedChanges && !this.databroker.syncService.hasUnsavedChanges() && !this.databroker.hasSyncErrors) {
        if (saveStatusElement) {
            console.warn('saveStatusElement: ' + saveStatusElement);
            this.saveStatus = "Saved";
            this.domHelper.setTextContent(saveStatusElement, this.saveStatus);
        }
    }

    var isNotStillTyping = goog.isNumber(this.timeOfLastChange) &&
        (goog.now() - this.timeOfLastChange) > this.saveDelayAfterLastChange;

    if (this.hasUnsavedChanges() && isNotStillTyping) {
        this.saveContents(null, null, opt_synchronously);
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
            console.error(error)
        }
        if (uri == this.uri) {
           this.flashDocumentIconHighlight();
        }
   }, this);
};
