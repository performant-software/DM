goog.provide('dm.widgets.TwirlDown');

goog.require('goog.ui.AnimatedZippy');

/**
 * Works much like goog.ui.Zippy, except it is only opened by clicking the twirl
 * down icon, not any section of the header
 * 
 * @note Elements passed into the constructor must already be members of the DOM
 * 
 * @param header {Element}
 * @param content {Element}
 * @param button {Element}
 * @param opt_opened {boolean} True to have the TwirlDown open upon creation, 
 * defaults to false
 */
dm.widgets.TwirlDown = function (header, content, button, opt_opened) {
    this.header = header;
    this.content = content;
    this.button = button;
    
    jQuery(this.button).addClass('atb-twirldown-button');
    
    this.isOpen = false;
    this.zippy = new goog.ui.AnimatedZippy(this.button, this.content, this.isOpen);
    this.zippy.animationDuration = 300;
    
    goog.events.listen(this.button, goog.events.EventType.CLICK, function (e) {
        jQuery(this.button).toggleClass('atb-twirldown-button-open');
        e.stopPropagation();
    }, false, this);
    
    goog.events.listen(this.button, goog.events.EventType.KEYDOWN, function (e) {
        if (e.keyCode == goog.events.KeyCodes.ENTER || e.keyCode == goog.events.KeyCodes.MAC_ENTER) {
            jQuery(this.button).toggleClass('atb-twirldown-button-open');
        }
    }, false, this);
    
    if (opt_opened) {
        this.open();
    }
};

dm.widgets.TwirlDown.prototype.open = function () {
    this.isOpen = true;
    
    jQuery(this.button).addClass('atb-twirldown-button-open');
    
    this.zippy.setExpanded(true);
};

dm.widgets.TwirlDown.prototype.close = function () {
    this.isOpen = false;
    
    jQuery(this.button).removeClass('atb-twirldown-button-open');
    
    this.zippy.setExpanded(false);
};

dm.widgets.TwirlDown.prototype.toggle = function () {
    if (this.isOpen) {
        this.close();
    }
    else {
        this.open();
    }
};

dm.widgets.TwirlDown.prototype.setExpanded = function (expanded) {
    if (expanded) {
        this.open();
    }
    else {
        this.close();
    }
}

/**
 * @return {Element}
 */
dm.widgets.TwirlDown.prototype.getHeaderElement = function () {
    return this.header;
};

/**
 * @return {Element}
 */
dm.widgets.TwirlDown.prototype.getContentElement = function () {
    return this.content;
};

/**
 * @return {Element}
 */
dm.widgets.TwirlDown.prototype.getButtonElement = function () {
    return this.button;
};

/**
 * @return {boolean}
 */
dm.widgets.TwirlDown.prototype.isOpen = function () {
    return this.isOpen;
};

dm.widgets.TwirlDown.prototype.setAnimationDuration = function (duration) {
    this.zippy.animationDuration = duration;
};