goog.provide("atb.viewer.TextEditorAnnotate");

goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.editor.Plugin');
goog.require('atb.viewer.ResourceListViewer');
goog.require('atb.ui.Bezel');
goog.require('atb.events.ResourceClicked');
goog.require('atb.resource.TextHighlightResource');
goog.require('atb.resource.ResourceFactory');

goog.require("atb.widgets.ForegroundMenuDisplayer");
goog.require("atb.util.DomTraverser");//lolhack!

/**
 * Plugin to insert annotation highlights into an editable field.
 * @constructor
 * @extends {goog.editor.Plugin}
 */
atb.viewer.TextEditorAnnotate = function(set_thisViewer)
{
	this.thisViewer = set_thisViewer;//HACK
    goog.editor.Plugin.call(this);
	
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

atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS_ID = atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS + '-ID-';

atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS_LOCAL_ID = atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS + '-LOCALID-';

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
    var range = this.fieldObject.getRange();

    var selectedAnnotation = domHelper.getElementByClass(atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS_SELECTED);

    var errorHandler = atb.Util.scopeAsyncHandler(this.thisViewer.flashErrorIcon, this.thisViewer);
    
    // if we have one selected assume we need to delete it, otherwise we're adding new.
    if (selectedAnnotation) {
        this.deleteAnnotation(selectedAnnotation);
    }
	else {
	    this.thisViewer.webService.withUid(
		    function (uid) {
                this.addAnnotation(uid, range);
		    },
		    this,
            errorHandler
	    );
    }

    return true;
};


atb.viewer.TextEditorAnnotate.prototype.elementOffsetHelper_ = function(node, offset)
{
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

atb.viewer.TextEditorAnnotate.prototype.elementOffsetHelper2_ = function(info)
{
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
	

atb.viewer.TextEditorAnnotate.prototype.createAnnoSpan = function(annoId)
{
	//var count = counter;
	//counter += 1;
	var domHelper = this.fieldObject.getEditableDomHelper();
	var span = domHelper.createElement('span');
	
	var newAnnotationId = annoId;
	var cssClassNames = atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS + " " +
		//atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS_SELECTED + " " +  // start selected
        //atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS_LOCAL_ID + newAnnotationId;
	    atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS_ID + newAnnotationId;
	span.setAttribute('class', cssClassNames);
	this.addListeners(span);
	return span;
};


/**
 * Add annotation wrapper to a selection 
 * @param {string} range The range object for the selection
 */
atb.viewer.TextEditorAnnotate.prototype.addAnnotation = function(annoId, range)
{
	if (range == null) {
		return;
	}
    
    var highlightResource = new atb.resource.TextHighlightResource(annoId, annoId);
    highlightResource.user = this.thisViewer.clientApp.username;
    highlightResource.textId = this.thisViewer.resourceId;
    highlightResource.contents = range.getValidHtml();
    highlightResource.textTitle = this.thisViewer.getTitle();
    
    var errorHandler = atb.Util.scopeAsyncHandler(this.thisViewer.flashErrorIcon, this.thisViewer);
    
    var ws = this.thisViewer.webService;
    ws.withSavedResource(highlightResource, function (response) {}, this, errorHandler);
	
	var TypeElement = Node.ELEMENT_NODE;
	var TypeText = Node.TEXT_NODE;
			
    if (range.getText() != "") {
        var domHelper = this.fieldObject.getEditableDomHelper();
		var self = this;
        
        if (range.getHtmlFragment() == range.getValidHtml()) {
			var span = this.createAnnoSpan(annoId);
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
				debugPrint("!?!");
			}
			this.lastStartNode = startNode;
			this.lastEndNode = endNode;
			
			
			var bSameNode = (startNode===endNode);
			
			var bStartNodeIsElement =(startNode.nodeType===TypeElement);
			var bEndNodeIsElement =(endNode.nodeType===TypeElement);
			debugPrint("startOffset: "+startOffset+"; endOffset: "+endOffset);
			
			//element start tag; startOffset: 1
			if (bStartNodeIsElement)
			{
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
			if (bEndNodeIsElement)
			{
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
				//debugPrint("startOffset:"+startOffset+", endOffset:"+endOffset);
				var beforeTextNode = document.createTextNode(beforeText);
				var startSelTextNode =document.createTextNode(startNodeSelText);
				
				
				//var endNodeSelText = document.createTextNode(endNodeSelText);
				var endNodeSelTextNode = document.createTextNode(endNodeSelText);
				var afterTextNode = document.createTextNode(endNodeAfterText);
				
				var startParent= startNode.parentNode;
				var endParent = endNode.parentNode;
				
				if (bStartNodeIsElement)
				{//TODO: finish figuring this out... what does it really mean tho...?
				
					//startPRime = startNode;//hack...?
					
					//TODO: split the parent tag in two, maybe...?
					debugPrint("warning: starting on an element!");
					if (startOffset != 0)
					{
						debugPrint("WARNING: starting on an element, w/o a start-offset of zero!");
						//:
					}
					startPrime = startNode;//hack...?
				}
				else
				{
					debugPrint("textStart");
					startParent.replaceChild(startSelTextNode, startNode);//NORMAL -- null here...?
					startParent.insertBefore(beforeTextNode,startSelTextNode);
					startPrime = startSelTextNode;
				}
				
				if (bEndNodeIsElement)
				{
					debugPrint("warning: ending on an element!");
					if (endOffset != 0)
					{
						debugPrint("WARNING: ending on an element, w/o a end-offset of zero!");
						//:
					}
					endPrime = endNode;//hack...?
				}
				else
				{
					debugPrint("textEnd");
					endParent.replaceChild(afterTextNode, endNode);//another bug...?
					endParent.insertBefore(endNodeSelTextNode,afterTextNode);
					endPrime = endNodeSelTextNode;
				}
			}
			var traversal = new atb.util.DomTraverser(startPrime, endPrime);
			
			//TODO: ?= check this beforehand...?
			var bFoundSpans = false;
			traversal.each(function()
			{
				if (jQuery(this).hasClass(atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS))
				{
					bFoundSpans = true;
				}
			});
			if (bFoundSpans)
			{
				//	//!!
				//this.thisViewer.showErrorMessage("Can't highlight a selection 
				this.thisViewer.showErrorMessage("Can't highlight a selection containing an existing highlight!");
				return;
			}
			var arr = [];
			traversal.eachTextNode(function()
			{
				if (this.parentNode!=null) {
					var ndName = (""+this.parentNode.nodeName).toLowerCase();
					if (ndName === "style") {
						return;
					}
				}
				arr.push(this);
			});
			var bunches = arr;//hack
			
			for(var i=0,l=bunches.length; i<l; i++)
			{
				var bunch=bunches[i];
				bunch = [bunch,bunch];//HACK
				var newParent = this.createAnnoSpan(annoId);
				traversal.replaceBunchWithCommonParent(bunch, newParent);
				newParents.push(newParent);
				//document.createElement(
			}
			
			debugPrint("# new parents: "+newParents.length);
		
			
        }
    }
};

/**
 * Delete an annotation
 * @param {node} annotation The annotation to delete
 */
atb.viewer.TextEditorAnnotate.prototype.deleteAnnotation = function(annotation) {

    if(annotation) {

        var domHelper = this.fieldObject.getEditableDomHelper();
        var annotationId = atb.viewer.TextEditorAnnotate.getAnnotationId(annotation);
        var annotationParts = domHelper.getElementsByClass(atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS_LOCAL_ID + annotationId);
        var annotationParts2 = domHelper.getElementsByClass(atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS_ID + annotationId);
        
        var annos = [];
        
        for (var i in annotationParts) {
            annos.push(annotationParts[i]);
        }
        for (var i in annotationParts2) {
            annos.push(annotationParts2[i]);
        }
	
		/*
		//No. this kills ALL of the spans:
		var annotationParts3 = domHelper.getElementsByClass(atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS);
		for (var i in annotationParts3)
		{
            annos.push(annotationParts3[i]);
        }
		*/
		//^LOLHACK
		
		//atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS_LOCAL_ID + annotationId);
        for(var i = 0; i < annos.length; i++) {
            domHelper.flattenElement(annos[i]);
        }

    }
};

/**
 * Add listeners to an annotation object.  We'll need to call this most likely when we load annotations from
 * a saved sate.
 * @param {string} object The element to apply to.
 * @return {true}
 */
atb.viewer.TextEditorAnnotate.prototype.addListeners = function(object) {
	var self = this;
	
	// Check for click listeners so that they aren't fired multiple times
	if(!goog.events.hasListener(object, goog.events.EventType.CLICK)) {
		goog.events.listen(object, goog.events.EventType.CLICK, function( mouseEvent ){
            self.selectAnnotationSpan(object, mouseEvent);
			return self.handleHighlightClick(object, mouseEvent);
		}, false, this);
	}
    
    if (!goog.events.hasListener(object, goog.events.EventType.MOUSEOVER)) {
        goog.events.listen(object, goog.events.EventType.MOUSEOVER, function( mouseEvent ) {
            self.hoverAnnotationSpan(object);
            return false;
        }, false, this);
    }
    
    if (!goog.events.hasListener(object, goog.events.EventType.MOUSEOUT)) {
        goog.events.listen(object, goog.events.EventType.MOUSEOUT, function( mouseEvent ) {
                    return self.unhoverAnnotationSpan(object);
        }, false, this);
    }
    
    var createButtonGenerator = atb.widgets.MenuUtil.createDefaultDomGenerator;
	
	var menuButtons = [
		new atb.widgets.MenuItem(
			"newTextAnno",
			createButtonGenerator("atb-radialmenu-button atb-radialmenu-button-new-text-anno"),
			function(actionEvent) {
	            self.createNewAnnoBody(object);
	        },
            'Annotate this highlight'
		),
	  
		new atb.widgets.MenuItem(
			"createLink",
			createButtonGenerator("atb-radialmenu-button atb-radialmenu-button-create-link"),
			function(actionEvent) {
	            self.linkAnnotation(object);
			},
            'Link another resource to this highlight'
		),
		new atb.widgets.MenuItem(
		        "showLinkedAnnos",
		        createButtonGenerator("atb-radialmenu-button atb-radialmenu-button-show-linked-annos"),
		        function(actionEvent)
		        {
		            self.showAnnos(object);
		        }, 
		        'Show resources linked to this highlight'
		    ),
		new atb.widgets.MenuItem(
				'delete_highlight_button',
				createButtonGenerator('atb-radialmenu-button atb-radialmenu-button-delete'),
				function(actionEvent)
				{
					self.thisViewer.hideHoverMenu()
					self.deleteAnnotation(object);

				},
                'Delete this highlight'
			)
	];
    menuButtons.reverse();
    
    this.thisViewer.addHoverMenuListenersToElement(object, menuButtons, atb.viewer.TextEditorAnnotate.getAnnotationId(object));
	
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
        this.unselectAnnotationSpan();
    }
    return isSelection;
};

atb.viewer.TextEditorAnnotate.prototype.addListenersToAllHighlights = function () {
    var domHelper = this.fieldObject.getEditableDomHelper();
    var annotations = domHelper.getElementsByClass(atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS);

    for(var i=0, len=annotations.length; i < len; i++) {
        var highlightTag = annotations[i];
        this.addListeners(highlightTag);
    }
};

/**
 * getNewAnnotationId()
 * get list of existing annotation spans and find the highest span ID
 * we want the new ID to be 1 larger than the last
 * if we delete one in the middle we still don't want to reuse that one
 * @return new annotationId, 1 or higher
 **/
atb.viewer.TextEditorAnnotate.prototype.getNewAnnotationId = function () {

     var annotationId = 0;

    // get all annotations in an editor
    // look through their classnames for the number ID
    // get one higher than it
    var domHelper = this.fieldObject.getEditableDomHelper();
    var annotations = domHelper.getElementsByClass(
                    atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS);

    for(var i = 0; i < annotations.length; i++) {
        var testId = atb.viewer.TextEditorAnnotate.getAnnotationId(annotations[i]);
        if(testId > annotationId) {
            annotationId = testId;
        }
    }

    annotationId++; // get just 1 more than the highest existing spanId value

    return annotationId;
};


/**
 * getAnnotationId()
 * gets ID of existing annotation
 * @param annotation is the annontation to look at
 * @return annotationId, 1 or higher
 **/
atb.viewer.TextEditorAnnotate.getAnnotationId = function (annotation) {

    var annotationId = 0;

    //console.log("Annotate.getAnnotationId: annotation: ");
    //console.log(annotation);
    var classNames = annotation.className.split(" ");
    for(var j = 0; j < classNames.length; j++) {
        if(classNames[j].indexOf('-LOCALID-') != -1) {
            var id = classNames[j].split("-"); // split class up
            annotationId = id[id.length-1];  // and get just last number
        }
        else if (classNames[j].indexOf('-ID-') != -1) {
            var id = classNames[j].split("-"); // split class up
            annotationId = id[id.length-1];  // and get just last number
        }
    }

    return annotationId;
};

atb.viewer.TextEditorAnnotate.prototype.getAllAnnotationTags = function () {
    var domHelper = this.thisViewer.field.getEditableDomHelper();

    var annotations = domHelper.getElementsByClass(atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS);

    return annotations;
};

atb.viewer.TextEditorAnnotate.prototype.getAnnotationTagByResourceId = function (resourceId) {
    var annotations = this.getAllAnnotationTags(); //console.log(annotations);

    for (var i=0; i<annotations.length; i++) {
        var anno = annotations[i];

        if (atb.viewer.TextEditorAnnotate.getAnnotationId(anno) == resourceId) {
            return anno;
        }
    }
    return null;
};

atb.viewer.TextEditorAnnotate.isUsingLocalId = function (spanElem) {
    var result = false;

    var classNames = spanElem.className.split(" ");

    for (var j=0; j<classNames.length; j++) {
        if (classNames[j].indexOf('-LOCALID-') != -1) {
            result = true;
        }
    }

    return result;
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
	if(opt_range == null) {
		var selectionRange = this.fieldObject.getRange();
	}
	else {
		var selectionRange = opt_range;
	}

	// Mozilla includes the span tag in the range, but other browsers do not
	if(jQuery.browser.mozilla) {
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
atb.viewer.TextEditorAnnotate.prototype.selectAnnotationSpan = function (tag, mouseEvent) {
    var annotationId = atb.viewer.TextEditorAnnotate.getAnnotationId(tag);
	
	this.setSelectedAnnotationHelper(annotationId, tag);
    
	return false;
};

atb.viewer.TextEditorAnnotate.prototype.flashSpanHighlight = function (tag) {
    this.selectAnnotationSpan(tag);
    
    var timeoutFns = [function () {
                      this.unselectAnnotationSpan();
                      }, function () {
                      this.selectAnnotationSpan(tag);
                      }, function () {
                      this.unselectAnnotationSpan();
                      }];
    atb.Util.timeoutSequence(250, timeoutFns, this);
};

atb.viewer.TextEditorAnnotate.prototype.handleHighlightClick = function (tag) {
    var eventDispatcher = this.thisViewer.clientApp.getEventDispatcher();
    var event = new atb.events.ResourceClicked(atb.viewer.TextEditorAnnotate.getAnnotationId(tag));
    
    eventDispatcher.dispatchEvent(event);
};



atb.viewer.TextEditorAnnotate.prototype.autoHideMenu = function () {
    var afterTimer = function () {
        if (! (this.mouseIsOverHighlight || this.mouseIsOverMenu)) {
            this.hideTestRadialMenu();
        }
    };
    afterTimer = atb.Util.scopeAsyncHandler(afterTimer, this);
    window.setTimeout(afterTimer, 300);
};

atb.viewer.TextEditorAnnotate.prototype.hideTestRadialMenu = function () {
	if (this.contextMenuDisplayer) {
        this.contextMenuDisplayer.hide();
    }
};

/**
 * unselectAnnotationSpan()
 * looks for a selected annotation and then removes the selected css class
 **/
atb.viewer.TextEditorAnnotate.prototype.unselectAnnotationSpan = function () {
    var domHelper = this.fieldObject.getEditableDomHelper();
	
	this.setSelectedAnnotationHelper(null, domHelper.getDocument());
	
	//hack:
	this.hideTestRadialMenu();//hack
	//end hack
    
	return true;
};


/**
 * hoverAnnotationSpan()
 **/
atb.viewer.TextEditorAnnotate.prototype.hoverAnnotationSpan = function (forSpan) {
    var domHelper = goog.dom.getDomHelper(forSpan);
    var annotationId = atb.viewer.TextEditorAnnotate.getAnnotationId(forSpan);
    this.setHoverAnnotationHelper(annotationId,forSpan);
};


/**
 * unhoverAnnotationSpan()
 **/
atb.viewer.TextEditorAnnotate.prototype.unhoverAnnotationSpan = function(forSpan) {
    this.setHoverAnnotationHelper(null,forSpan);
};

atb.viewer.TextEditorAnnotate.prototype.setHoverAnnotationHelper = function(hoverAnnotationId,forSpan) {
    var viewer = this.thisViewer;
    var field = viewer.field;
    
    // Prevents firing of delayed change events
    field.manipulateDom(function () {
                        this.enforceSingleSelectionRules(atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS_HOVER, hoverAnnotationId,forSpan);
                        }, true, this);
};

atb.viewer.TextEditorAnnotate.prototype.setSelectedAnnotationHelper = function(hoverAnnotationId,forSpan) {
    var viewer = this.thisViewer;
    var field = viewer.field;
    
    // Prevents firing of delayed change events
    field.manipulateDom(function () {
                        this.enforceSingleSelectionRules(atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS_SELECTED, hoverAnnotationId,forSpan);
                        }, true, this);
};

atb.viewer.TextEditorAnnotate.prototype.enforceSingleSelectionRules = function(enforceForCssClass, hoverAnnotationId, forSpan)
{
	//Note: converted a bunch of dom.addClasses stuff to use jquery, since it complains less when a match fails, etc. ...
	
	var domHelper = goog.dom.getDomHelper(forSpan);
	var fromSubtree = domHelper.getDocument();
	
	//first deselect them all:
	jQuery("."+atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS,fromSubtree).removeClass(enforceForCssClass);
	
	
	//now select the one:
	if (hoverAnnotationId != null)
	{
		//hack to handle the :id variation from the "-id-" case.
			//we need to "escape" the ':' for jquery:
		hoverAnnotationId = ""+hoverAnnotationId;
		if (hoverAnnotationId.length > 1)
		{
			if (hoverAnnotationId[0] === ":")//HACK
			{
				hoverAnnotationId = "\\" + hoverAnnotationId;//HACK
			}
		}
		
		//HACK - will affect both a local and remote with the same id... =/:
		var clsA = "."+atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS_ID + hoverAnnotationId;
		var clsB = "."+atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS_LOCAL_ID + hoverAnnotationId;
		var jqA = jQuery(clsA,fromSubtree);
		var jqB = jQuery(clsB,fromSubtree);
		
		jqA.addClass(enforceForCssClass);
		jqB.addClass(enforceForCssClass);
		
		if ((jqA.length < 1) &&(jqB.length < 1))
		{
			//in case we still didn't find something, make sure we know that something odd is up:
			debugPrint("warning: hoverAnnotationId not matched: '"+hoverAnnotationId+"'");
		}
	}
};

atb.viewer.TextEditorAnnotate.prototype.showErrorMessage = function(msg)
{
	this.thisViewer.showErrorMessage(msg);
};

atb.viewer.TextEditorAnnotate.prototype.getOtherPanelHelper = function()
{
	return this.thisViewer.getOtherPanelHelper();
};

atb.viewer.TextEditorAnnotate.prototype.createNewAnnoBody = function (spanElem)
{
	var otherContainer = this.getOtherPanelHelper();
    if (otherContainer == null)
	{
		this.showErrorMessage("only one panel container!");
        return;
    }
    var annoBodyEditor = new atb.viewer.Editor(
		this.thisViewer.clientApp,	//Hack -- maybe there must be a better way than creating these everywhere...?
        ''
    );
    annoBodyEditor.setPurpose('anno');
    
    var targetTextTitle = this.thisViewer.getTitle();
    
    var myResourceId = atb.viewer.TextEditorAnnotate.getAnnotationId(spanElem);
    
    var errorHandler = atb.Util.scopeAsyncHandler(this.thisViewer.flashErrorIcon, this.thisViewer);
        	
    this.thisViewer.webService.withUidList(
        2,
        function (uids) {
            var newTextId = uids[0];
            var annoId = uids[1];
            
            annoBodyEditor.resourceId = newTextId;
            annoBodyEditor.annotationUid = annoId;
            this.thisViewer.annotationUid = annoId;
            
            annoBodyEditor.setTitle('New Annotation on ' + targetTextTitle);
            annoBodyEditor.toggleIsAnnoText(true);
            
            this.thisViewer.setAnnotationBody(newTextId);
            
            annoBodyEditor.saveContents(
            	function () {
            		this.thisViewer.webService.withSavedAnno(
            			annoId,
            			{
            				'id': annoId,
            				'type': 'anno',
            				'anno': {
            					'targets': [myResourceId],
            					'bodies': [newTextId]
            				}
            			},
            			function (response) {
            				
            			},
            			this
            		);
            	},
            	this
            );
        },
        this,
        errorHandler
    );

    //viewer.toggleAnnotationMode(true);
    /*
    this.thisViewer.saveContents(
        function () {
        	var myResourceId = atb.viewer.TextEditorAnnotate.getAnnotationId(spanElem);
        	
        	this.thisViewer.webService.withUidList(
            		2,
            		function (uids) {
            			var newTextId = uids[0];
            			var annoId = uids[1];
            			
            			annoBodyEditor.resourceId = newTextId;
            			annoBodyEditor.annotationUid = annoId;
            			this.thisViewer.annotationUid = annoId;
            			
            			annoBodyEditor.setTitle('New Annotation on ' + targetTextTitle);
            			annoBodyEditor.toggleIsAnnoText(true);
            			
            			this.thisViewer.setAnnotationBody(newTextId);
            			
            			annoBodyEditor.saveContents(
            				function () {
            					this.thisViewer.webService.withSavedAnno(
            							annoId,
            							{
            								'id': annoId,
            								'type': 'anno',
            								'anno': {
            									'targets': [myResourceId],
            									'bodies': [newTextId]
            								}
            							},
            							function (response) {
            								
            							},
            							this
            						);
            				},
            				this
            			);
            		},
            		this
    		);
        },
        this
    );
    */

    otherContainer.setViewer( annoBodyEditor );
    otherContainer.setTabContents('New Annotation');

    this.thisViewer.toggleAnnotationMode(true);
};



atb.viewer.TextEditorAnnotate.prototype.linkAnnotation = function (tag) {
	var myResourceId = atb.viewer.TextEditorAnnotate.getAnnotationId(tag);
    
    this.thisViewer.clientApp.createAnnoLink(myResourceId);
    
    this.selectAnnotationSpan(tag);
};



atb.viewer.TextEditorAnnotate.prototype.showAnnos = function (tag) {
	var id = atb.viewer.TextEditorAnnotate.getAnnotationId(tag);
	
	var otherContainer = this.getOtherPanelHelper();
	
	var finder = new atb.viewer.Finder(this.thisViewer.clientApp, id);
    finder.setContextType(atb.viewer.Finder.ContextTypes.RESOURCE);
    
	otherContainer.setViewer(finder);
/*
	this.thisViewer.saveContents(function () {
		var id = atb.viewer.TextEditorAnnotate.getAnnotationId(tag);
	
	    var otherContainer = this.getOtherPanelHelper();
	
		var finder = new atb.viewer.Finder(this.thisViewer.clientApp, id);
        finder.setContextType(atb.viewer.Finder.ContextTypes.RESOURCE);

		otherContainer.setViewer(finder);
	}, this);
*/
};



atb.viewer.TextEditorAnnotate.prototype.createNewResourceListViewer = function (myAnnoId)
{
	var otherContainer = this.getOtherPanelHelper();

    if (otherContainer == null)
	{
		this.showErrorMessage("Annotate::createNewResourceListViewer(): only one panel container!");
        //alert("only one panel container!");
        return;
    }
	
	// TODO: editor loads with a null DIV id but right now the resource viewer needs one (rightPane)...needs modified
    // TODO: resource viewer needs root div to unload properly, right now viewers just append instead of replace
	
	//debugPrint(
	this.showErrorMessage("TODO: implement 'atb.viewer.TextEditorAnnotate.prototype.createNewResourceListViewer'...!");
};
