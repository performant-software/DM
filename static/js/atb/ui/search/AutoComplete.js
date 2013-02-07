goog.provide('atb.ui.search.AutoComplete');

goog.require('atb.ui.search.RemoteArrayMatcher');

goog.require('goog.dom');
goog.require('goog.ui.ac.Renderer');
goog.require('goog.ui.ac.InputHandler');

goog.require('atb.util.ReferenceUtil');
goog.require('atb.util.StyleUtil');

/**
 * atb.ui.AutoComplete
 *
 * Wraps Google Closure's basic AutoComplete functionality for atb
 *
 * @constructor
 * @param clientApp {atb.ClientApp}
 * @param inputField {HTML Element}
 * @param opt_matchSimilar {Boolean} default true - false to strictly match similar queries and suggestions
 * @param opt_allowMulti {Boolean} default false - true to allow comma separated queries
 */
atb.ui.search.AutoComplete = function(
    clientApp, 
    inputField, 
    opt_matchSimilar, 
    opt_allowMulti
) {
    this.webService = clientApp.getWebService();
    this.inputField = goog.dom.getElement(inputField);

    this.matchSimilar = atb.util.ReferenceUtil.applyDefaultValue(
        opt_matchSimilar,
        true
    );

    this.allowMulti = atb.util.ReferenceUtil.applyDefaultValue(
        opt_allowMulti,
        false
    );

    /** @protected */
    this._googAutoComplete = null;

    this.initWrappedAutoComplete_();
};

/**
 * initWrappedAutoComplete_()
 * 
 * @protected
 */
atb.ui.search.AutoComplete.prototype.initWrappedAutoComplete_ = function () {
    var matcher = new atb.ui.search.RemoteArrayMatcher(
        this.webService, !this.matchSimilar
    );

    var renderer = new goog.ui.ac.Renderer();
    renderer.setMenuFadeDuration(200);

    var inputhandler = new goog.ui.ac.InputHandler(
        null, 
        null, 
        !!this.allowMulti
    );

    this._googAutoComplete = new goog.ui.AutoComplete(
        matcher, 
        renderer, 
        inputhandler
    );
    this._googAutoComplete.setAutoHilite(false);
    this._googAutoComplete.setAllowFreeSelect(true);

    inputhandler.attachAutoComplete(this._googAutoComplete);
    inputhandler.attachInputs(this.inputField);
};


