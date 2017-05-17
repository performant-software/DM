goog.provide('dm.ui.Bezel');

goog.require('goog.dom');
goog.require('goog.math.Size');
goog.require('goog.math.Coordinate');
goog.require('dm.util.StyleUtil');

/**
 * Provides a Mac OSX like semi-transparent popup (like the volume up/down indicator)
 *
 * @constructor
 * @extends {goog.Disposable}
 * @author tandres@drew.edu (Tim Andres)
 * 
 * @param cssClass {string}
 * @param opt_size {goog.math.Size=}
 * @param opt_parentElement {Element}
 */
dm.ui.Bezel = function (cssClass, opt_size, opt_parentElement) {
    goog.Disposable.call(this);
    
    /** @type {string} */
    this.cssClass = cssClass;
    
    /** @type {goog.math.Size} */
    this.size = opt_size || new goog.math.Size(100, 100);

    /** @type {Element} */
    this.parentElement = opt_parentElement || document.body;

    /** @type {Element} */
    this.div = goog.dom.createElement('div');
    
    /** @type {boolean} */
    this.rendered = false;
    
    this.render();
};
goog.inherits(dm.ui.Bezel, goog.Disposable);

dm.ui.Bezel.prototype.render = function () {
    if (this.rendered) {
        return;
    }
    
    jQuery(this.div).css('display', 'none');
    jQuery(this.div).css('width', this.size.width);
    jQuery(this.div).css('height', this.size.height);
    jQuery(this.div).addClass('atb-bezel');
    
    jQuery(this.div).addClass(this.cssClass);
    
    this.parentElement.appendChild(this.div);
    
    this.rendered = true;
};

/**
 * @param opt_centerOnPosition {goog.math.Coordinate=}
 */
dm.ui.Bezel.prototype.show = function (opt_centerOnPosition) {
    if (! this.rendered) {
        this.render();
    }
    
    var position = opt_centerOnPosition;
    
    if (! position) {
        var x = (jQuery(window).width() - this.size.width) / 2;
        var y = (jQuery(window).height() - this.size.height) / 2;
        
        x+= jQuery(window).scrollLeft();
        y+= jQuery(window).scrollTop();
        
        position = new goog.math.Coordinate(x, y);
    }
    
    jQuery(this.div).css('left', position.x);
    jQuery(this.div).css('top', position.y);
    
    jQuery(this.div).fadeIn(400, dm.Util.scopeAsyncHandler(this.hide, this));
};

dm.ui.Bezel.prototype.hide = function () {
    jQuery(this.div).fadeOut(1200, dm.Util.scopeAsyncHandler(this.dispose, this));
};

dm.ui.Bezel.prototype.disposeInternal = function () {
    this.parentElement.removeChild(this.div);
    
    this.div = null;
    this.parentElement = null;
    this.rendered = false;
};