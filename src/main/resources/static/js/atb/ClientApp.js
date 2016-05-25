goog.provide("atb.ClientApp");

goog.require("atb.util.StyleUtil"); //used for a giant hack
goog.require("atb.util.ReferenceUtil");

goog.require('goog.events.EventTarget');
goog.require('goog.events');
goog.require('goog.ui.Popup');
goog.require('atb.ui.Bezel');
goog.require('goog.fx.dom.FadeIn');
goog.require('goog.fx.dom.FadeOut');
goog.require('goog.ui.CustomButton');
goog.require('goog.ui.KeyboardShortcutHandler');

goog.require('atb.events.LinkingModeEntered');
goog.require('atb.events.LinkingModeExited');

goog.require('sc.data.Databroker');

atb.ClientApp = function (basePath, username, databroker) {
    this.domHelper = new goog.dom.DomHelper();
    
    this.databroker = databroker;
    
    this.eventDispatcher = new goog.events.EventTarget();
    
    this.username = username;

    this.basePath = basePath;
	this.styleRoot = basePath + "/static/css/";
    
	atb.util.StyleUtil.DEFAULT_CSS_ROOT = this.styleRoot; // HACK -- moved over from panel manager!!, also, was a giant hack there, too!

    this.annotationBody = null;
	this.activeAnnotation = null;
    this.createdAnnoLinkIds = [];
    
    this.popupsByName = {};
    
    goog.events.listen(window, 'beforeunload', this.onBeforeUnload, false, this);
    
    this.linkingInProgress = false;
    
    this.keyboardShortcutHandler = new goog.ui.KeyboardShortcutHandler(window);
};

atb.ClientApp.prototype.getEventDispatcher = function () {
    return this.eventDispatcher;
};

atb.ClientApp.prototype.getDatabroker = function() {
    return this.databroker;
};

atb.ClientApp.prototype.getBasePath = function () {
    return this.basePath;
};

atb.ClientApp.prototype.getStyleRoot = function () {
    return this.styleRoot;
};

atb.ClientApp.prototype.getActiveAnnotation = function () {
	return this.activeAnnotation;
};

atb.ClientApp.prototype.setActiveAnnotation = function (set_active_annotation) {
	this.activeAnnotation = set_active_annotation;
};

atb.ClientApp.prototype.clearActiveAnnotation = function () {
	this.setActiveAnnotation(null);
	this.setAnnotationBody(null);
};


atb.ClientApp.prototype.getAnnotationBody = function() {
    return this.annotationBody;
};


atb.ClientApp.prototype.setAnnotationBody = function(annotationBody) {
    this.annotationBody = annotationBody;
};

/**
 * @param popup {atb.ui.PopupWindow}
 */
atb.ClientApp.prototype.registerPopup = function (popup) {
    this.popupsByName[popup.getName()] = popup;
};

atb.ClientApp.prototype.unregisterPopup = function (popup) {
    this.popupsByName[popup.getName()] = null;
};

atb.ClientApp.prototype.getPopupByName = function (name) {
    return this.popupsByName[name];
};

atb.ClientApp.prototype.forEachPopup = function (fn, opt_scope) {
    for (var name in this.popupsByName) {
        var popup = this.popupsByName[name];
        
        if (popup)
            fn.call(opt_scope || window, popup);
    }
};

atb.ClientApp.prototype.numOpenPopups = function () {
    var num = 0;
    
    this.forEachPopup(function (popup) {
        num ++;
    }, this);
    
    return num;
};

atb.ClientApp.prototype.getUsername = function () {
    return this.username;
};

/**
 * Starts the process of creating a link between two resources, taking a body id and optional annoId,
 * and listening for the next 'resource-click' event for the target id
 */
atb.ClientApp.prototype.createAnnoLink = function (bodyId, opt_annoId) {
    this.linkingInProgress = true;
    
    this.annoLinkCreationBodyId = bodyId;
    this.annoLinkCreationAnnoId = opt_annoId || this.databroker.createUuid();
    
    var modeEnteredEvent = new atb.events.LinkingModeEntered(this.annoLinkCreationAnnoId, this.eventDispatcher);
    this.eventDispatcher.dispatchEvent(modeEnteredEvent);
    
    this.createAnnoLinkAddListeners_();
    
    this.showLinkCreationUI();
};

/**
 * Cancels the process of creating a link between two resources after createAnnoLink has been called,
 * but no target has yet been added
 */
atb.ClientApp.prototype.cancelAnnoLinking = function () {
    this.linkingInProgress = false;
    
    var exitedEvent = new atb.events.LinkingModeExited(this.annoLinkCreationAnnoId);
    this.eventDispatcher.dispatchEvent(exitedEvent);
    
    this.annoLinkCreationBodyId = null;
    this.annoLinkCreationAnnoId = null;
    
    this.createAnnoLinkRemoveListeners_();
    
    this.hideLinkCreationUI();
};

atb.ClientApp.prototype.renderLinkCreationUI = function () {
	this.linkCreationPopup = $("<div id='cancel-link'>Cancel link creation</div>");
	$("body").append(this.linkCreationPopup);
	var that = this;
	this.linkCreationPopup.on("click", function() {
		that.cancelAnnoLinking();
	});
};

atb.ClientApp.prototype.showLinkCreationUI = function () {
	this.linkCreationPopup.fadeIn();
};

atb.ClientApp.prototype.hideLinkCreationUI = function () {
	this.linkCreationPopup.fadeOut();
};

atb.ClientApp.prototype.createAnnoLinkAddListeners_ = function () {
    goog.events.listen(this.getEventDispatcher(), 'resource-click', this.annoLinkCreationHandler_, false, this);
    goog.events.listen(window, 'keyup', this.annoLinkCreationKeyHandler_, false, this);
};

atb.ClientApp.prototype.createAnnoLinkRemoveListeners_ = function () {
    goog.events.unlisten(this.getEventDispatcher(), 'resource-click', this.annoLinkCreationHandler_, false, this);
    goog.events.unlisten(window, 'keyup', this.annoLinkCreationKeyHandler_, false, this);
};

atb.ClientApp.prototype.annoLinkCreationHandler_ = function (e) {
    e.stopPropagation();
    e.preventDefault();
    
    this.createAnnoLinkRemoveListeners_();
    this.linkingInProgress = false;
    
    var targetUri = e.uri;
    e.viewer.cancelHover();
    
    // see if this viewer is locked for edit
    if ( e.viewer.isEditable() == false ) {
       alert("Target resource is not locked for edit.\n\nLock it and try again.");
    } else {
       
       if (this.annoLinkCreationBodyId && targetUri) {
           var bodyId = this.annoLinkCreationBodyId;
           this.annoLinkCreationBodyId = null;
   
           var anno = this.databroker.dataModel.createAnno(bodyId, targetUri);
           
           var bezel = new atb.ui.Bezel('atb-bezel-linked');
           bezel.show();
                      
           this.databroker.sync();
       } else {
          alert("Link creation failed; one of the highlights was missing an ID. Remove and re-add the highlights and try again.");
       }
    }

    this.hideLinkCreationUI();
    var exitedEvent = new atb.events.LinkingModeExited(this.annoLinkCreationAnnoId);
    this.eventDispatcher.dispatchEvent(exitedEvent);

};

atb.ClientApp.prototype.annoLinkCreationKeyHandler_ = function (e) {
    var keyCode = e.keyCode;
    
    if (keyCode == goog.events.KeyCodes.ESC) {
        this.cancelAnnoLinking();
    }
};

atb.ClientApp.prototype.isAnnoLinkingInProgress = function () {
    return this.linkingInProgress;
};

atb.ClientApp.prototype.undoLastAnnoLinkCreation = function () {
    var lastAnnoLinkId = this.createdAnnoLinkIds.pop();
    
    if (lastAnnoLinkId != null) {
        this.webService.withDeletedResource(lastAnnoLinkId, function () {
            
        }, this, null);
        
        var bezel = new atb.ui.Bezel('atb-bezel-unlinked');
        bezel.show();
    }
    
    this.hideUndoLinkCreationUI();
};

atb.ClientApp.prototype.onBeforeUnload = function (event) {
    $.ajax({
        url: this.basePath + "/store/lock",
        method: "DELETE",
        async: false,
        beforeSend: function(xhr) {
            xhr.setRequestHeader("X-CSRFToken", getCookie("csrftoken"));
        }
    });
};

$(function() {
   var username = $("#logged-in-user").text();
   if (username.indexOf("guest_") == 0 ) {
      $("#logged-in-user").text("Guest");
      $(".sc-ProjectViewer-createProjectButton").hide();
      $(".sc-ProjectViewer-modal .nav-pills").hide();
   }
   
   $(window).on('beforeunload', function(){
      if ( $("#logged-in-user").text() === "Guest" ) {
          $.ajax({
              url: '/accounts/logout/',
              async:false
          });
       }
   });
   
   $("#create-user").on("click", function() {
      $(".create-user-modal").modal('show');
   });
   $("#submit-new-user").on("click", function() {
       $("#new-user-error").text("");
      var name = $("#name").val();
      var email = $("#email").val();
      var pass = $("#password").val();
      var passConf  = $("#password-confirmation").val();
      var admin = $("#admin-checkbox").is(':checked');
      if ( name.length==0 || email.length==0 || pass.length==0 || passConf.length==0  ) {
         $("#new-user-error").text("All fields are required!");
         return;
      }
      if (pass != passConf ) {
         $("#new-user-error").text("Passwords do not match");
         return;
      }
      var token = $("[name='csrfmiddlewaretoken']").val();
      $.ajax({
         url: "/accounts/create/",
         method: "POST",
         data: { name: name, email: email, pass: pass, admin: admin},
         beforeSend: function(xhr, settings) {
            xhr.setRequestHeader("X-CSRFToken", token);
         },
         complete: function(jqXHR, textStatus ) {
            if (textStatus == "success" ) {
               alert("Account created");
               $(".create-user-modal").modal('hide');
            } else {
               alert("Create user failed: "+jqXHR.responseText);
            }
         }
      });
   });
});
