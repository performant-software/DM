goog.provide("atb.viewer.TextEditorAnnotate");

goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.editor.Plugin');
goog.require('atb.viewer.ResourceListViewer');
goog.require('atb.ui.Bezel');
goog.require('atb.events.ResourceClick');
goog.require('goog.userAgent.product');

goog.require("atb.widgets.ForegroundMenuDisplayer");
goog.require("atb.util.DomTraverser");//lolhack!

/**
 * Plugin to insert annotation highlights into an editable field.
 * @constructor
 * @extends {goog.editor.Plugin}
 */
atb.viewer.TextEditorAnnotate = function(viewer) {
	this.viewer = viewer;
    goog.editor.Plugin.call(this);

    this.clientApp = this.viewer.clientApp;
    this.databroker = this.clientApp.getDatabroker();
	
	this.lastStartNode = null;
	this.lastEndNode = null;//debug hack
};
goog.inherits(atb.viewer.TextEditorAnnotate, goog.editor.Plugin);


/**
 * Commands implemented by this plugin.
 * @enum {string}
 */
atb.viewer.TextEditorAnnotate.COMMAND = {
  ADD_ANNOTATION: '+addAnnotation'
};

/**
 * ANNOTATION_CLASS
 */
atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS = 'atb-editor-textannotation';

/**
 * ANNOTATION_CLASS_SELECTED
 */
atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS_SELECTED = 'atb-editor-textannotation-selected';

/**
 * ANNOTATION_CLASS_HOVER
 */
atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS_HOVER = 'atb-editor-textannotation-hover';




/** @inheritDoc */
atb.viewer.TextEditorAnnotate.prototype.getTrogClassId = function() {
    return 'Annotation';
};

//moved the fields up...!

/** @inheritDoc */
atb.viewer.TextEditorAnnotate.prototype.isSupportedCommand = function(command) {
   return command == atb.viewer.TextEditorAnnotate.COMMAND.ADD_ANNOTATION;
};


/**
 * Executes a command. Does not fire any BEFORECHANGE, CHANGE, or
 * SELECTIONCHANGE events (these are handled by the super class implementation
 * of {@code execCommand}.
 * @param {string} command Command to execute.
 * @override
 * @protected
 */
atb.viewer.TextEditorAnnotate.prototype.execCommandInternal = function (command) {
    var domHelper = this.fieldObject.getEditableDomHelper();

    var selectedAnnotation = domHelper.getElementByClass(atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS_SELECTED);
    
    // if we have one selected assume we need to delete it, otherwise we're adding new.
    if (selectedAnnotation) {
        this.deleteAnnotation(selectedAnnotation);
    }
	else {
		this.addAnnotation(this.fieldObject.getRange());
    }

    return true;
};


atb.viewer.TextEditorAnnotate.prototype.elementOffsetHelper_ = function(node, offset) {
	/*
	startOffset: 0; endOffset: 1921
	#childnodes: 1921
	//^Lolnorecurslook!
	*/
	var TypeElement = Node.ELEMENT_NODE;// == 1
	var TypeText = Node.TEXT_NODE;// == 3
	var TypeCDataSection = Node.CDATA_SECTION_NODE;// == 4
	var TypeCommentNode = Node.COMMENT_NODE;// == 8
	
	
	//var info = {node: node.firstChild, offset: offset, bSolved: false};
	var info = {node: node, offset: offset, bSolved: false};
	var nodeType = node.nodeType;
	var bOffsetIsNumChildNodesCounted = ((nodeType !== TypeText) && (nodeType !== TypeCDataSection) && (nodeType !== TypeCommentNode));
	info.bOffsetTypeIsNodeCount = bOffsetIsNumChildNodesCounted;
	return this.elementOffsetHelper2_(info);
};

atb.viewer.TextEditorAnnotate.prototype.elementOffsetHelper2_ = function(info) {
	var TypeElement = Node.ELEMENT_NODE;// == 1
	var TypeText = Node.TEXT_NODE;// == 3
	var TypeCDataSection = Node.CDATA_SECTION_NODE;// == 4
	var TypeCommentNode = Node.COMMENT_NODE;// == 8
	//lol@debug info needed on page ...lol..!?
	
	if (info.bSolved)
	{
		return info;
	}
	
	
	var node = info.node;
	var nodeType = node.nodeType;
	
	var counter = info.offset;
	
	if (info.bOffsetTypeIsNodeCount)
	{
		//var ptr = info.firstChild;
		var ptr = node.firstChild;//lol!
		//while(counter > 0)
		//while(counter > 0)
		counter--;//firstchild
		while(counter > 0)
		{
			counter--;
			ptr = ptr.nextSibling;
			if (ptr == null)
			{
				//throw new Error("not enough siblings!");
				throw new Error("not enough siblings; counter ="+counter);
			}
		}
		info.node = ptr;
		info.offset = 0;
		//info.startNode = ptr;
		info.bSolved=true;
	}
	else
	{
		info.bSolved=true;
	}
	return info;
};
	

atb.viewer.TextEditorAnnotate.prototype.createAnnoSpan = function(uri) {
	var domHelper = this.fieldObject.getEditableDomHelper() || this.viewer.domHelper;
	var span = domHelper.createElement('span');

	jQuery(span).addClass(atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS);
	this.setHighlightElementUri(span, uri);

	this.addListeners(span);
	return span;
};

atb.viewer.TextEditorAnnotate.prototype.getTextResource = function() {
    return this.databroker.getResource(this.viewer.uri);
};

atb.viewer.TextEditorAnnotate.prototype.createHighlightResource = function(highlightUri, range) {
	var highlight = this.databroker.getResource(highlightUri);
    highlight.addProperty('rdf:type', 'oa:TextQuoteSelector');
    highlight.addProperty('oa:exact', sc.util.Namespaces.quoteWrap(range.getText()));
    // Need a solution for keeping this up to date
    // TODO
    // highlight.addProperty('oa:prefix')
    // highlight.addProperty('oa:suffix')
    
    var specificResource = this.databroker.getResource(this.databroker.createUuid());
    specificResource.addProperty('rdf:type', 'oa:SpecificResource');
    specificResource.addProperty('oa:hasSource', this.getTextResource().bracketedUri);
    specificResource.addProperty('oa:hasSelector', highlight.bracketedUri);

    var anno = this.databroker.getResource(this.databroker.createUuid());
    anno.addProperty('rdf:type', 'oa:Annotation');
    anno.addProperty('oa:hasTarget', this.getTextResource().bracketedUri);

    return highlight;
};

atb.viewer.TextEditorAnnotate.prototype.deleteHighlightResource = function(highlightUri) {
    var highlight = this.databroker.getResource(highlightUri);
    var specificResource = this.databroker.getResource(this.databroker.dataModel.findSelectorSpecificResourceUri(highlightUri));

    goog.structs.forEach(specificResource.getReferencingResources('oa:hasTarget'), function(anno) {
    	anno.deleteProperty('oa:hasTarget', specificResource);
    }, this);
    highlight.deleteAllProperties();
    specificResource.deleteAllProperties();
};

atb.viewer.TextEditorAnnotate.prototype.updateAllHighlightResources = function() {
    var elements = this.getAllAnnotationTags();
    goog.structs.forEach(elements, function(element) {
    	var highlightUri = atb.viewer.TextEditorAnnotate.getHighlightSelectorUri(element);
    	var highlightResource = this.databroker.getResource(highlightUri);

    	highlightResource.setProperty('oa:exact', sc.util.Namespaces.quoteWrap(jQuery(element).text()));
    }, this);
};


/**
 * Add annotation wrapper to a selection 
 * @param {string} range The range object for the selection
 */
atb.viewer.TextEditorAnnotate.prototype.addAnnotation = function(range) {
	if (range == null || range.getText() == '') {
		return;
	}

	var highlightUri = this.databroker.createUuid();
	var highlightResource = this.createHighlightResource(highlightUri, range);
	
	var TypeElement = Node.ELEMENT_NODE;
	var TypeText = Node.TEXT_NODE;
			
    var domHelper = this.fieldObject.getEditableDomHelper();
	var self = this;
    
    if (range.getHtmlFragment() == range.getValidHtml()) {
		var span = this.createAnnoSpan(highlightUri);
        range.surroundContents(span);
    }
	else {
		var putNodeAfter = function (parent, afterNode, newNode) {
			if (afterNode.nextSibling == null) {
				parent.appendChild(newNode);
			}
			else {
				parent.insertBefore(newNode, afterNode.nextSibling);
			}
		};
		
		var putNodeBefore = function (parent, beforeNode, newNode) {
			parent.insertBefore(newNode,beforeNode);
		};
		
		
		var newParents = [];
		var rangeHack = range.browserRangeWrapper_.range_; //HACK
		
		var startNode = rangeHack.startContainer;
		var startOffset = rangeHack.startOffset;
		var endNode = rangeHack.endContainer;
		var endOffset = rangeHack.endOffset;
		
		if ((this.lastStartNode == startNode) || (this.lastEndNode == endNode)) {
			console.log("!?!");
		}
		this.lastStartNode = startNode;
		this.lastEndNode = endNode;
		
		
		var bSameNode = (startNode===endNode);
		
		var bStartNodeIsElement =(startNode.nodeType===TypeElement);
		var bEndNodeIsElement =(endNode.nodeType===TypeElement);
		console.log("startOffset: "+startOffset+"; endOffset: "+endOffset);
		
		//element start tag; startOffset: 1
		if (bStartNodeIsElement) {
			//TODO: need to figure out how to really do this properly...!?
			//occured: element start tag; startOffset: 1
			//unexpected if were to occur...?:
			
			var startInfo;
			
			startInfo = this.elementOffsetHelper_(startNode, startOffset);
			
			startNode = startInfo.node;
			startOffset=startInfo.offset;
			//bStartNodeIsElement =(startNode.nodeType===TypeElement);
			bStartNodeIsElement =(startNode.nodeType===TypeElement);
			//lol42..?
		}

		if (bEndNodeIsElement) {
			//unexpected if were to occur...?:
			//alert("element end tag; endOffset: "+endOffset);
			var endInfo;
		
			endInfo = this.elementOffsetHelper_(endNode, endOffset);
			
			endNode = endInfo.node;
			endOffset = endInfo.offset;
			bEndNodeIsElement =(endNode.nodeType===TypeElement);
		}
		//lol@selection bug in stuff...when changing it...!
		
		var endPrime;
		var startPrime;
		
		var startNodeText = "" + startNode.nodeValue;
		var endNodeText = "" + endNode.nodeValue;
		
		{
			var beforeText = startNodeText.substring(0,startOffset);
			var startNodeSelText = startNodeText.substring(startOffset);//+1);
			var endNodeSelText = endNodeText.substring(0, endOffset);
			var endNodeAfterText = endNodeText.substring(endOffset);// + 1);
			//if (
			//console.log("startOffset:"+startOffset+", endOffset:"+endOffset);
			var beforeTextNode = document.createTextNode(beforeText);
			var startSelTextNode =document.createTextNode(startNodeSelText);
			
			
			//var endNodeSelText = document.createTextNode(endNodeSelText);
			var endNodeSelTextNode = document.createTextNode(endNodeSelText);
			var afterTextNode = document.createTextNode(endNodeAfterText);
			
			var startParent= startNode.parentNode;
			var endParent = endNode.parentNode;
			
			if (bStartNodeIsElement) {//TODO: finish figuring this out... what does it really mean tho...?
			
				//startPRime = startNode;//hack...?
				
				//TODO: split the parent tag in two, maybe...?
				console.log("warning: starting on an element!");
				if (startOffset != 0) {
					console.log("WARNING: starting on an element, w/o a start-offset of zero!");
				}
				startPrime = startNode;//hack...?
			}
			else {
				console.log("textStart");
				startParent.replaceChild(startSelTextNode, startNode);//NORMAL -- null here...?
				startParent.insertBefore(beforeTextNode,startSelTextNode);
				startPrime = startSelTextNode;
			}
			
			if (bEndNodeIsElement) {
				console.log("warning: ending on an element!");
				if (endOffset != 0) {
					console.log("WARNING: ending on an element, w/o a end-offset of zero!");
				}
				endPrime = endNode;//hack...?
			}
			else {
				console.log("textEnd");
				endParent.replaceChild(afterTextNode, endNode);//another bug...?
				endParent.insertBefore(endNodeSelTextNode,afterTextNode);
				endPrime = endNodeSelTextNode;
			}
		}
		var traversal = new atb.util.DomTraverser(startPrime, endPrime);
		
		//TODO: ?= check this beforehand...?
		var bFoundSpans = false;
		traversal.each(function() {
			if (jQuery(this).hasClass(atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS)) {
				bFoundSpans = true;
			}
		});
		if (bFoundSpans) {
			this.viewer.showErrorMessage("Can't highlight a selection containing an existing highlight!");
			return;
		}
		var arr = [];
		traversal.eachTextNode(function() {
			if (this.parentNode!=null) {
				var ndName = (""+this.parentNode.nodeName).toLowerCase();
				if (ndName === "style") {
					return;
				}
			}
			arr.push(this);
		});
		var bunches = arr;//hack
		
		for(var i=0,l=bunches.length; i<l; i++) {
			var bunch=bunches[i];
			bunch = [bunch,bunch];//HACK
			var newParent = this.createAnnoSpan(annoId);
			traversal.replaceBunchWithCommonParent(bunch, newParent);
			newParents.push(newParent);
			//document.createElement(
		}
		
		console.log("# new parents: "+newParents.length);
    }
};

/**
 * Delete an annotation
 * @param {node} annotation The annotation to delete
 */
atb.viewer.TextEditorAnnotate.prototype.deleteAnnotation = function(element) {
	if (jQuery(element).children().length > 0) {
		jQuery(element).unwrap();
	}
	else {
		jQuery(element).replaceWith(jQuery(element).text());
	}

    var uri = atb.viewer.TextEditorAnnotate.getHighlightSelectorUri(element);
    this.deleteHighlightResource(uri);
};

/**
 * Add listeners to an annotation object.  We'll need to call this most likely when we load annotations from
 * a saved sate.
 * @param {string} object The element to apply to.
 * @return {true}
 */
atb.viewer.TextEditorAnnotate.prototype.addListeners = function(object) {
	if (!this.isHighlightElement(object)) {
		console.error('attempting to add highlight event listeners to an element which is not a highlight', object);
	}

	var selector = this.getElementSelectorResource(object);
	var specificResourceUri = this.databroker.dataModel.findSelectorSpecificResourceUri(selector);

	var self = this;
	
	// Check for click listeners so that they aren't fired multiple times
	if(!goog.events.hasListener(object, goog.events.EventType.CLICK)) {
		goog.events.listen(object, goog.events.EventType.CLICK, function( mouseEvent ){
            this.selectAnnotationSpan(object, mouseEvent);
			return this.handleHighlightClick(object, mouseEvent);
		}, false, this);
	}
    
    if (!goog.events.hasListener(object, goog.events.EventType.MOUSEOVER)) {
        goog.events.listen(object, goog.events.EventType.MOUSEOVER, function( mouseEvent ) {
            this.hoverAnnotationSpan(object);
            return false;
        }, false, this);
    }
    
    if (!goog.events.hasListener(object, goog.events.EventType.MOUSEOUT)) {
        goog.events.listen(object, goog.events.EventType.MOUSEOUT, function( mouseEvent ) {
			return this.unhoverAnnotationSpan(object);
        }, false, this);
    }
    
    var createButtonGenerator = atb.widgets.MenuUtil.createDefaultDomGenerator;

    if (this.viewer.isEditable()) {
		var menuButtons = [
			new atb.widgets.MenuItem(
				"newTextAnno",
				createButtonGenerator("atb-radialmenu-button icon-pencil"),
				function(actionEvent) {
		            self.createNewAnnoBody(object);

		            if (self.annoTitlesList) {
		                self.annoTitlesList.loadForResource(specificResourceUri);
		            }
		        },
	            'Annotate this highlight'
			),
		  
			new atb.widgets.MenuItem(
				"createLink",
				createButtonGenerator("atb-radialmenu-button atb-radialmenu-button-create-link"),
				function(actionEvent) {
		            self.linkAnnotation(object);

		            if (self.annoTitlesList) {
		                self.annoTitlesList.loadForResource(specificResourceUri);
		            }
				},
	            'Link another resource to this highlight'
			),
			// new atb.widgets.MenuItem(
		 //        "showLinkedAnnos",
		 //        createButtonGenerator("atb-radialmenu-button icon-search"),
		 //        function(actionEvent) {
		 //            self.showAnnos(object);
		 //        }, 
		 //        'Show resources linked to this highlight'
		 //    ),
			new atb.widgets.MenuItem(
				'delete_highlight_button',
				createButtonGenerator('atb-radialmenu-button icon-remove'),
				function(actionEvent) {
					self.viewer.hideHoverMenu()
					self.deleteAnnotation(object);
				},
	            'Delete this highlight'
			)
		];
	    menuButtons.reverse();
    }
    else {
    	var menuButtons = [];
    }
    
    this.viewer.addHoverMenuListenersToElement(object, menuButtons, specificResourceUri);
	
	return true;
};

/**
 * Gets the command value.
 * @param {string} command The command value to get.
 * @return {string|boolean|null} The current value of the command in the given
 *     selection.
 */
atb.viewer.TextEditorAnnotate.prototype.queryCommandValue = function(command) {
    var isSelection = this.selectionIsAnnotation();
    if(isSelection != true) {
        this.unselectAllHighlights();
    }
    return isSelection;
};

atb.viewer.TextEditorAnnotate.prototype.addListenersToAllHighlights = function () {
    var annotations = this.getAllAnnotationTags();

    for(var i=0, len=annotations.length; i < len; i++) {
        var highlightTag = annotations[i];

    	this.addListeners(highlightTag);
    }
};

atb.viewer.TextEditorAnnotate.OA_EXACT_URI = 'http://www.w3.org/ns/oa#exact';

atb.viewer.TextEditorAnnotate.prototype.setHighlightElementUri = function(element, uri) {
	jQuery(element).attr('about', uri);
    jQuery(element).attr('property', atb.viewer.TextEditorAnnotate.OA_EXACT_URI);
};


/**
 * getAnnotationId()
 * gets ID of existing annotation
 * @param annotation is the annontation to look at
 * @return annotationId, 1 or higher
 **/
atb.viewer.TextEditorAnnotate.getHighlightSelectorUri = function (element) {
    return jQuery(element).attr('about');
};

atb.viewer.TextEditorAnnotate.prototype.getElementSelectorResource = function(element) {
    return this.databroker.getResource(atb.viewer.TextEditorAnnotate.getHighlightSelectorUri(element));
};

atb.viewer.TextEditorAnnotate.prototype.isHighlightElement = function(element) {
    return jQuery(element).hasClass(atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS) && atb.viewer.TextEditorAnnotate.getHighlightSelectorUri(element) != null;
};

atb.viewer.TextEditorAnnotate.prototype.getAllAnnotationTags = function () {
	var annotation_class = atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS;

	if (this.viewer.isEditable()) {
		var domHelper = this.fieldObject.getEditableDomHelper();
		var spans = domHelper.getElementsByClass(annotation_class);
	}
	else {
		var spans = jQuery('#' + this.viewer.useID + ' .' + annotation_class).toArray();
	}

	var highlights = [];

	for (var i=0, len=spans.length; i<len; i++) {
		var span = spans[i];
		if (this.isHighlightElement(span)) {
			highlights.push(span);
		}
	}

	return highlights;
};

atb.viewer.TextEditorAnnotate.prototype.getHighlightElementByUri = function (uri) {
	if (this.viewer.isEditable()) {
		var domHelper = this.viewer.field.getEditableDomHelper();
		var editableDocument = domHelper.getDocument();

		return jQuery('.' + atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS + '[about=\'' + uri + '\']', editableDocument).get(0);
	}
	else {
		return jQuery('#' + this.viewer.useID + ' .' + atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS + '[about=\'' + uri + '\']').get(0);
	}
};


/**
 * selectionIsAnnotation(opt_textRange)
 * returns whether the selection or specified text range is surrounded by a span with the class
 * ANNOTATION_CLASS
 * Note: the function will return true if the selection contains text outside of the annotation span, or
 * if an element other than a span (such as a div) has the appropriate class
 * @param opt_range optionally specifies the goog.dom.AbstractRange to check
 * @return boolean true if the selection is an annotation
 **/
atb.viewer.TextEditorAnnotate.prototype.selectionIsAnnotation = function (opt_range) {
	var selectionRange = opt_range || this.fieldObject.getRange();

	// Mozilla includes the span tag in the range, but other browsers do not
	if(goog.userAgent.product.Firefox) {
		var selectedHtml = selectionRange.getPastableHtml();
		return jQuery(selectedHtml).hasClass(atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS);
	}
	else {
		var containerNode = selectionRange.getContainerElement();
		return jQuery(containerNode).hasClass(atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS);
	}
};


/**
 * selectAnnotationSpan()
 **/
atb.viewer.TextEditorAnnotate.prototype.selectAnnotationSpan = function (tag) {
	// Prevents firing of delayed change events
	this.fieldObject.manipulateDom(function() {
		this.deselectAllHighlights();
		jQuery(tag).addClass(atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS_SELECTED);
	}, true, this);
};

atb.viewer.TextEditorAnnotate.prototype.flashSpanHighlight = function (tag) {
    this.selectAnnotationSpan(tag);
    
    var timeoutFns = [
    	function () {
            this.unselectAllHighlights();
        }, function () {
            this.selectAnnotationSpan(tag);
        }, function () {
            this.unselectAllHighlights();
        }
    ];
    atb.Util.timeoutSequence(250, timeoutFns, this);
};

atb.viewer.TextEditorAnnotate.prototype.handleHighlightClick = function (tag) {
    var eventDispatcher = this.viewer.clientApp.getEventDispatcher();
    var event = new atb.events.ResourceClick(atb.viewer.TextEditorAnnotate.getHighlightSelectorUri(tag), eventDispatcher, this.viewer);
    
    eventDispatcher.dispatchEvent(event);
};

atb.viewer.TextEditorAnnotate.prototype.unselectAllHighlights = function() {
    var annotation_class = atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS_HOVER;

    if (this.viewer.isEditable()) {
    	var domHelper = this.fieldObject.getEditableDomHelper();
    	var spans = domHelper.getElementsByClass(annotation_class);
    	this.fieldObject.manipulateDom(function() {
    		for (var i=0, len=spans.length; i<len; i++) {
    			jQuery(spans[i]).removeClass(annotation_class);
    		}
    	}.bind(this));
    }
    else {
    	jQuery('#' + this.viewer.useID + ' .' + annotation_class).removeClass(annotation_class);
    }
};


/**
 * hoverAnnotationSpan()
 **/
atb.viewer.TextEditorAnnotate.prototype.hoverAnnotationSpan = function (forSpan) {
	this.unselectAllHighlights();

    var viewer = this.viewer;
    var field = viewer.field;

    if (field && viewer.isEditable()) {
    	// Prevents firing of delayed change events
    	field.manipulateDom(function() {
    	    jQuery(forSpan).addClass(atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS_HOVER);
    	}, true, this);
    }
    else {
    	jQuery(forSpan).addClass(atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS_HOVER);
    }
};


/**
 * unhoverAnnotationSpan()
 **/
atb.viewer.TextEditorAnnotate.prototype.unhoverAnnotationSpan = function(forSpan) {
    var viewer = this.viewer;
    var field = viewer.field;

    if (field && viewer.isEditable()) {
    	// Prevents firing of delayed change events
    	field.manipulateDom(function() {
    	    jQuery(forSpan).removeClass(atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS_HOVER);
    	}, true, this);
    }
    else {
    	jQuery(forSpan).removeClass(atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS_HOVER);
    }
};

atb.viewer.TextEditorAnnotate.prototype.deselectAllHighlights = function() {
	// Prevents firing of delayed change events
	this.fieldObject.manipulateDom(function() {
		jQuery(this.getAllAnnotationTags()).removeClass(atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS_SELECTED);
	}, true, this);
};

atb.viewer.TextEditorAnnotate.prototype.showErrorMessage = function(msg) {
	this.viewer.showErrorMessage(msg);
};

atb.viewer.TextEditorAnnotate.prototype.createNewAnnoBody = function(spanElem) {
	var highlightUri = atb.viewer.TextEditorAnnotate.getHighlightSelectorUri(spanElem);
	var specificResourceUri = this.databroker.dataModel.findSelectorSpecificResourceUri(highlightUri);

	var databroker = this.databroker;
    var body = databroker.dataModel.createText('New annotation on ' + this.viewer.getTitle());

    var anno = databroker.dataModel.createAnno(body, specificResourceUri);
	
    var annoBodyEditor = new atb.viewer.TextEditor(this.clientApp);
    annoBodyEditor.toggleIsAnnoText(true);
    this.viewer.openRelatedViewer(annoBodyEditor);
    annoBodyEditor.loadResourceByUri(body.uri);
};

atb.viewer.TextEditorAnnotate.prototype.linkAnnotation = function(spanElem) {
	var highlightUri = atb.viewer.TextEditorAnnotate.getHighlightSelectorUri(spanElem);
	var specificResourceUri = this.databroker.dataModel.findSelectorSpecificResourceUri(highlightUri);
    
    this.viewer.clientApp.createAnnoLink(specificResourceUri);
    
    this.selectAnnotationSpan(spanElem);
};

atb.viewer.TextEditorAnnotate.prototype.showAnnos = function(tag) {
	var id = atb.viewer.TextEditorAnnotate.getHighlightSelectorUri(tag);
	
	var finder = new atb.viewer.Finder(this.viewer.clientApp, id);
    finder.setContextType(atb.viewer.Finder.ContextTypes.RESOURCE);
    
	this.viewer.openRelatedViewer(finder);
};
