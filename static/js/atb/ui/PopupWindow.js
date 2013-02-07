goog.provide('atb.ui.PopupWindow');

goog.require('goog.dom');
goog.require('jquery.jQuery');
goog.require('goog.events');
goog.require('atb.Util');
goog.require('goog.dom.DomHelper');

/**
 * @author tandres@drew.edu (Tim Andres)
 * @constructor
 * 
 * Provides a wrapper around the standard javascript window.open procedure, and
 * handles its inconsistencies
 */
atb.ui.PopupWindow = function (opt_location, opt_params) {
    this.location = opt_location || 'javascript:""';
    this.params = atb.util.ReferenceUtil.mergeOptions(opt_params,
        {
            'status': false,
            'toolbar': false,
            'location': false,
            'menubar': true,
            'resizeable': true,
            'scrollbars': true,
            'height': 600,
            'width': 500
        }
    );
        
    var dummyObj = {};
    this.name = 'atb-ui-Popup:' + goog.getUid(dummyObj);
    dummyObj = null;
    
    this.win = null;
    this.hasLoaded = false;
};

/**
 * Opens the popup window
 * @return {Object} the window object of the new window
 */
atb.ui.PopupWindow.prototype.open = function () {
    this.win = window.open(this.location, this.name, this.generateParamsString());
    
    this.bindToLoad(function (e) {
        this.hasLoaded = true;
    }, this);
    
    return this.win;
};

/**
 * Gets the javascript window object of the popup window
 * @return {Object}
 */
atb.ui.PopupWindow.prototype.getWindow = function () {
    return this.win;
};

/**
 * Returns a Google Closure DomHelper for the new window
 * @reuturn {goog.dom.DomHelper}
 */
atb.ui.PopupWindow.prototype.getDomHelper = function () {
    return new goog.dom.DomHelper(this.win.document);
};

/**
 * Returns the name of the window
 */
atb.ui.PopupWindow.prototype.getName = function () {
    return this.name;
};

/**
 * Binds a function to the load event of the new window
 * @param fn {Function}
 * @param opt_scope {!Object}
 */
atb.ui.PopupWindow.prototype.bindToLoad = function (fn, opt_fnScope) {
    goog.events.listen(this.win, goog.events.EventType.LOAD, fn, false, opt_fnScope);
};

/**
 * @Note(tandres): Only use this function if you have loaded a real html page
 * @param fn {Function}
 * @param opt_scope {!Object}
 */
atb.ui.PopupWindow.prototype.bindToReady = function (fn, opt_fnScope) {
    jQuery(this.win.document).ready(function (e) {
        (atb.Util.scopeAsyncHandler(fn, opt_fnScope))();
    });
};

/**
 * Binds a function to the load event of the new window
 * @param fn {Function}
 * @param opt_scope {!Object}
 */
atb.ui.PopupWindow.prototype.bindToUnload = function (fn, opt_fnScope) {
    goog.events.listen(this.win, goog.events.EventType.UNLOAD, function (e) {
        if (this.hasLoaded) {
            (atb.Util.scopeAsyncHandler(fn, opt_fnScope))();
        }
    }, false, this);
};

/**
 * Generates the javascript window.open params string from an object of parameters
 */
atb.ui.PopupWindow.prototype.generateParamsString = function () {
    var str = '';
    
    function boolToNum (bool) {
        if (bool === true) {
            return 1;
        }
        else if (bool === false) {
            return 0;
        }
        else {
            return bool;
        }
    }
    
    for (var key in this.params) {
        var value = this.params[key];
        if (this.params.hasOwnProperty(key)) {
            str += key + '=' + boolToNum(value) + ',';
        }
    }
    
    str = str.substring(0, str.length - 1); // Remove trailing comma
    
    return str;
};

atb.ui.PopupWindow.prototype.focus = function () {
    this.win.focus();
};

atb.ui.PopupWindow.prototype.blur = function () {
    this.win.blur();
};

atb.ui.PopupWindow.prototype.close = function () {
    this.win.close();
    
    this.win = null;
};

atb.ui.PopupWindow.prototype.moveTo = function (x,y) {
    this.win.moveTo(x,y);
};

atb.ui.PopupWindow.prototype.moveBy = function (x,y) {
    this.win.moveBy(x,y);
};

atb.ui.PopupWindow.prototype.resizeTo = function (width, height) {
    this.win.resizeTo(width, height);
};

atb.ui.PopupWindow.prototype.getTitle = function () {
    return this.win.document.title;
};

atb.ui.PopupWindow.prototype.setTitle = function (title) {
    this.win.document.title = title;
};