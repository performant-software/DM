goog.provide("atb.widgets.DialogWidget");

goog.require("goog.ui.Dialog");
goog.require("goog.ui.Dialog.ButtonSet");
goog.require("atb.debug.DebugTools");
goog.require("atb.util.StyleUtil");
goog.require("atb.util.ReferenceUtil");
goog.require("atb.widgets.MenuUtil");
goog.require("goog.dom");
goog.require("atb.widgets.MenuButtonSet");
goog.require('jquery.jQuery');

//lolforce docs:
/**
 *
 * @public
 * @constructor
**/
atb.widgets.DialogWidget = function(opt_dialog_options)
{
	this.dialogOptions = atb.util.ReferenceUtil.mergeOptions(
			opt_dialog_options,
			//defaults:
			{
				cssRoot: null,//atb.util.StyleUtil.DEFAULT_CSS_ROOT,
				bModal: false,
				caption: "",
				content: "", //HACK
				show_buttons: [
					this.StandardButtonDefs.OkButton,
					this.StandardButtonDefs.CancelButton
				]
				//menu augmentations...lol...?
			}
	);
	this.dialog = new goog.ui.Dialog();
	
	this.bVisible=false;
	this.bModal = atb.util.LangUtil.forceBoolean(this.dialogOptions.bModal, false);
	this.caption = this.dialogOptions.caption;
	this.content = this.dialogOptions.content;
	
	this.titleNode = null;//HACK
	
	this.dialog.setVisible(false);//definitely start this way!
	
	//this.dialog.setButtonSet(goog.ui.Dialog.ButtonSet.CONTINUE_SAVE_CANCEL);
	this.dialog.setModal(this.bModal);
	
	var self = this;
	goog.events.listen(
		this.dialog, 
		goog.ui.Dialog.EventType.SELECT, 
		function(e) 
		{
			return self.onSelectEvent(e);
			//alert('You chose: ' + e.key);
		}
	);
	
	this.dialog.setContent(this.content);
	this.dialog.setTitle(this.caption);
	
	
	var buttonList = this.dialogOptions.show_buttons;
	var menuItemList = atb.widgets.MenuUtil.decodeMenuItems(buttonList);
	
	//var buttonContainerDiv = document.createElement("div");
	//this.buttonContainerDiv = buttonContainerDiv;
	
	this.buttonSet = new atb.widgets.MenuButtonSet(this);
	
	for(var i=0, l = menuItemList.length; i<l; i++)
	{
		var menuItem = menuItemList[i];
		this.buttonSet.addItem(menuItem);
	}
	this.dialog.setButtonSet(this.buttonSet);
	
	this.dialog.setVisible(this.bVisible);
	
	this.contentNode = null;
	
	//atb.util.StyleUtil.includeStyleSheetOnceFromRoot(this.dialogOptions.cssRoot, "/goog/dialog.css");
	//atb.util.StyleUtil.includeStyleSheetOnceFromRoot(this.dialogOptions.cssRoot, "/atb/viewer/MarkerEditor.css");//HACK
	
};

atb.widgets.DialogWidget.prototype.setContent = function(set_content)
{
	this.content = set_content;
	this.dialog.setContent("" + this.content);
};


atb.widgets.DialogWidget.prototype.setTitleNode = function(set_title_node)
{
	set_title_node = atb.util.ReferenceUtil.applyDefaultValue(set_title_node, null);//hack-paranoia, probably!
	
	//this.title = null;
	this.caption = null;
	//this.titleNode = set_content_node;
	this.titleNode = set_title_node;
	this.dialog.setTitle("");
	//if (This.contentNode
	if (this.titleNode !== null)
	{
		var dialogElem = this.dialog.getTitleElement();
		dialogElem.appendChild(this.titleNode);//HACK
		//set_content_node
	}
};
//setContentNode
atb.widgets.DialogWidget.prototype.setContentNode = function(set_content_node)
{
	set_content_node = atb.util.ReferenceUtil.applyDefaultValue(set_content_node, null);//hack-paranoia, probably!
	
	this.content = null;
	this.contentNode = set_content_node;
	this.dialog.setContent("");
	//if (This.contentNode
	if (this.contentNode !== null)
	{
		var dialogElem = this.dialog.getContentElement();
		dialogElem.appendChild(this.contentNode);//HACK
		//set_content_node
	}
};

atb.widgets.DialogWidget.prototype.setCaption = function(set_caption)
{
	this.caption = set_caption;
	this.dialog.setTitle(this.caption);
};


atb.widgets.DialogWidget.prototype.onSelectEvent=function(selectEvent)
{
	return this.buttonSet.onSelectEvent(selectEvent);
};

atb.widgets.DialogWidget.prototype.setModal=function(set_bModal)
{
	set_bModal = !!set_bModal;
	this.bModal = set_bModal;
	this.dialog.setModal(this.bModal);
};

atb.widgets.DialogWidget.prototype.show = function()
{
	this.setVisible(true);
};

atb.widgets.DialogWidget.prototype.tryPerformCancel = function()
{
	var bResult = this.onDialogCancel();
	bResult = atb.util.LangUtil.forceBoolean(bResult, true);
	if (bResult)
	{
		this.hide();
	}
}

atb.widgets.DialogWidget.prototype.performCancel = function()
{
	this.onDialogCancel();
	this.hide();
};

atb.widgets.DialogWidget.prototype.hide = function()
{
	//Q: does this actually make as much sense as one might think at first?
	//		(i.e., what to do about cancelling /etc..?)
	this.setVisible(false);
};

atb.widgets.DialogWidget.prototype.setVisible = function(bVisible)
{
	bVisible = !!bVisible;
	this.bVisible=bVisible;
	this.dialog.setVisible(this.bVisible);
};

atb.widgets.DialogWidget.prototype.onDialogOK = function(actionEvent)
{
};

atb.widgets.DialogWidget.prototype.onDialogCancel = function(actionEvent)
{
};

atb.widgets.DialogWidget.prototype.StandardButtonDefs = {
	OkButton: 
		{
			name: "OkButton",
			visual: {
				//icon: "atb-editor-addpolylinebutton",	//"dialog-ok-button",
				content: "OK"
			},
			action: function(actionEvent)
			{
				var theDialog = actionEvent.getMenu();
				return theDialog.onDialogOK(actionEvent);
			},
			custom:
			{
				bIsCancelButton: false,
				bCloseByDefault: true
			}
		},
	
	CancelButton:
		{
			name: "CancelButton",
			visual: {
				//icon: "dialog-cancel-button",
				content: "Cancel"
			},
			action: function(actionEvent)
			{
				var theDialog = actionEvent.getMenu();
				return theDialog.onDialogCancel(actionEvent);
			},
			custom:
			{
				bIsCancelButton: true,
				bCloseByDefault: true
			}
		}
};

atb.widgets.DialogWidget.StandardButtonDefs = atb.widgets.DialogWidget.prototype.StandardButtonDefs;

atb.widgets.DialogWidget.prototype.center = function () {
    var elem = this.dialog.getDialogElement();
    
    var width = jQuery(elem).width();
    var height = jQuery(elem).height();
    
    var windowWidth = jQuery(document).width();
    var windowHeight = jQuery(document).height();
    
    var left = (windowWidth - width) / 2;
    var top = (windowHeight - height) / 2;
    
    jQuery(elem).css({'top': top, 'left': left});
};

atb.widgets.DialogWidget.prototype.isVisible = function () {
    return this.dialog.isVisible();
};

atb.widgets.DialogWidget.prototype.setDraggable = function (draggable) {
    return this.dialog.setDraggable(draggable);
};