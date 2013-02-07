goog.provide('atb.ui.Preferences');

goog.require('atb.widgets.DialogWidget');
goog.require('atb.Util');

goog.require('goog.ui.CustomButton');
goog.require('goog.dom.DomHelper');

goog.require('jquery.jQuery');

//goog.require('goog.ui.TabBar');
//goog.require('goog.ui.Tab');

/**
 * A user preferences panel
 *
 * @author tandres@drew.edu (Tim Andres)
 * @constructor
 *
 * @param clientApp {atb.ClientApp}
 */
atb.ui.Preferences = function (clientApp) {
    this.clientApp = clientApp;
    this.webService = clientApp.getWebService();
    
    this.domHelper = new goog.dom.DomHelper();
        
    var self = this;
    
    this.dialogWidget = new atb.widgets.DialogWidget({
        caption: 'Preferences',
        bModal: true,
        show_buttons: [
                       {
                           name: 'OkButton',
                           visual: {content: 'Save'},
                           action: function(actionEvent) {
                               self.save();
                               actionEvent.getMenu().onDialogOK(actionEvent);
                           },
                           custom: {
                           bIsCancelButton: false,
                           bCloseByDefault: true
                           }
                       },
                       {
                           name: 'CancelButton',
                           visual: {
                           content: 'Cancel'
                           },
                           action: function (actionEvent) {
                               self.cancel();
                               actionEvent.getMenu().onDialogCancel(actionEvent);
                           },
                           custom: {
                           bIsCancelButton: true,
                           bCloseByDefault: true
                           }
                       }
                       ]
    });
    
    this.render();
    
    this.dialogWidget.setDraggable(false);
    this.dialogWidget.setContentNode(this.contentDiv);
};

atb.ui.Preferences.prototype.show = function () {
    this.dialogWidget.show();
};

atb.ui.Preferences.prototype.hide = function () {
    this.dialogWidget.hide();
};

atb.ui.Preferences.prototype.render = function () {
    this.contentDiv = this.domHelper.createDom('div', {'class': 'atb-preferences-content'});
    
    this.resizeHandler = atb.Util.scopeAsyncHandler(this.autoResize, this);
    
    this.autoResize();
    
    jQuery(window).bind('resize', this.resizeHandler);
    
    this.renderAccountSettings();
};

atb.ui.Preferences.prototype.renderAccountSettings = function () {
    var accountHeader = this.domHelper.createDom('div', {'class': 'atb-preferences-header'}, 'Account settings: ' + this.clientApp.getUsername());
    var accountDiv = this.domHelper.createDom('div', {'class': 'atb-preferences-section'}, accountHeader);
    
    var oldPasswordLabel = this.domHelper.createDom('span', {}, 'Old password: ');
    var newPasswordLabel = this.domHelper.createDom('span', {}, 'New password: ');
    var verifyNewPasswordLabel = this.domHelper.createDom('span', {}, 'Verify new password: ');
    
    var oldPasswordField = this.domHelper.createDom('input', {'type': 'password'});
    var newPasswordField = this.domHelper.createDom('input', {'type': 'password'});
    var verifyNewPasswordField = this.domHelper.createDom('input', {'type': 'password'});
    
    var oldPasswordDiv = this.domHelper.createDom('div', {}, oldPasswordLabel, oldPasswordField);
    var newPasswordDiv = this.domHelper.createDom('div', {}, newPasswordLabel, newPasswordField);
    var verifyNewPasswordDiv = this.domHelper.createDom('div', {}, verifyNewPasswordLabel, verifyNewPasswordField);
    
    var resetPasswordDiv = this.domHelper.createDom('div', {}, oldPasswordDiv, newPasswordDiv, verifyNewPasswordDiv);
    accountDiv.appendChild(resetPasswordDiv);
    
    this.contentDiv.appendChild(accountDiv);
};

atb.ui.Preferences.prototype.save = function () {
    this.hide();
};

atb.ui.Preferences.prototype.cancel = function () {
    this.hide();
};

atb.ui.Preferences.prototype.autoResize = function () {
    var width = jQuery(document).width() * .7;
    var height = jQuery(document).height() * .7;
    
    jQuery(this.contentDiv).css({'width': width + 'px', 'height': height + 'px'});
    
    this.dialogWidget.center();
};

atb.ui.Preferences.prototype.isVisible = function () {
    return this.dialogWidget.isVisible();
};