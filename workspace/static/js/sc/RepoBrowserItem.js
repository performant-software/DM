goog.provide('sc.RepoBrowserItem');

/**
 * UI for an entry in the sc.RepoBrowser
 *
 * @constructor
 * @param browser {sc.RepoBrowser} The parent RepoBrowser.
 */
sc.RepoBrowserItem = function(repoBrowser) {
    this.repoBrowser = repoBrowser;
    this.doc = this.repoBrowser.options.doc;

    this.titleDiv = this.doc.createElement('div');
    jQuery(this.titleDiv).addClass('sc-RepoBrowserItem-title');

    this.addButtonDiv = this.doc.createElement('div');
    jQuery(this.addButtonDiv).addClass('sc-RepoBrowserItem-addButton');
    jQuery(this.addButtonDiv).attr('title', 'Add this resource to my workspace');
    jQuery(this.addButtonDiv).hide();
};

/**
 * Turns the given div into a RepoBrowserItem
 * @param {Element} div
 */
sc.RepoBrowserItem.prototype.decorate = function(div) {
    this.rootDiv = div;
    var $div = jQuery(div);

    $div.empty();
    $div.addClass('sc-RepoBrowserItem');
    $div.attr('title', this.title);

    $div.append(this.addButtonDiv);

    $div.append(this.titleDiv);
};

/**
 * If a div is given, appends the RepoBrowserItem to that div, otherwise
 * returns a rendered div
 * @param {?Element} opt_div
 * @return {Element}
 */
sc.RepoBrowserItem.prototype.render = function(opt_div) {
    var newDiv = this.doc.createElement('div');
    this.decorate(newDiv);

    if (opt_div) {
        opt_div.appendChild(newDiv);
    }

    return newDiv;
};

/**
 * Returns the root element of the RepoBrowserItem
 */
sc.RepoBrowserItem.prototype.getElement = function() {
    return this.rootDiv;
};

/**
 * Sets the text of the title field
 * @param {string} title
 * @param {boolean} opt_temp if true, the title will be grayed out as a temporary placeholder.
 */
sc.RepoBrowserItem.prototype.setTitle = function(title, opt_temp) {
    var title = jQuery.trim(title);

    if (opt_temp && this.titleIsTemp != opt_temp) {
        jQuery(this.titleDiv).addClass('sc-RepoBrowserItem-title-temp');
    }
    else {
        jQuery(this.titleDiv).removeClass('sc-RepoBrowserItem-title-temp');
    }

    if (title != this.title) {
        jQuery(this.titleDiv).text(title);

        if (this.rootDiv) {
            jQuery(this.rootDiv).attr('title', title);
        }
    }

    this.title = title;
    this.titleIsTemp = !!opt_temp;
};

/**
 * Returns the title of the item
 * @return {string}
 */
sc.RepoBrowserItem.prototype.getTitle = function() {
    return this.title;
};

/**
 * Binds an event handler to the item, using jQuery.bind syntax
 */
sc.RepoBrowserItem.prototype.bind = function(eventType, b, c) {
    this.complainIfNotYetRendered(true);

    var self = this;
    var givenHandler, givenEventData;

    if (jQuery.isFunction(b)) {
        givenHandler = b;
        givenEventData = {};
    }
    else {
        givenHandler = c;
        givenEventData = b;
    }

    if (eventType == 'mouseenter') {
        jQuery(this.rootDiv).mouseenter(givenEventData, function(event) {
            givenHandler(event, self);
        });
    }
    else if (eventType == 'mouseleave') {
        jQuery(this.rootDiv).mouseleave(givenEventData, function(event) {
            givenHandler(event, self);
        });
    }
    else {
        jQuery(this.rootDiv).bind(eventType, givenEventData, function(event) {
            givenHandler(event, self);
        });
    }
};
sc.RepoBrowserItem.prototype.on = sc.RepoBrowserItem.prototype.bind;

/**
 * Unbinds an event handler from the item, using jQuery.unbind syntax
 * @param {Object} a
 * @param {Object} b
 */
sc.RepoBrowserItem.prototype.unbind = function(a, b) {
    this.complainIfNotYetRendered();

    jQuery(this.rootDiv).unbind(a, b);
};
sc.RepoBrowserItem.prototype.off = sc.RepoBrowserItem.prototype.unbind;

/**
 * Displays a network error icon in the browser item
 * @param {string} opt_errorTooltip A description of the error.
 */
sc.RepoBrowserItem.prototype.indicateNetworkError = function(opt_errorTooltip) {
    var errorDiv = this.doc.createElement('div');
    jQuery(errorDiv).addClass('sc-RepoBrowserItem-error');
    jQuery(errorDiv).hide();
    jQuery(errorDiv).attr('title', opt_errorTooltip);

    jQuery(this.rootDiv).prepend(errorDiv);
    jQuery(errorDiv).fadeIn(200);

    jQuery(this.rootDiv).css({'cursor': 'default'});
};

/**
 * Displays the add button for a given item, and uses the given click handler function
 * @param handler {function(jQuery.event, sc.RepoBrowserItem)}
 */
sc.RepoBrowserItem.prototype.showAddButton = function(handler) {
    var self = this;

    jQuery(this.addButtonDiv).show();

    jQuery(this.addButtonDiv).unbind('click');

    jQuery(this.addButtonDiv).bind('click', function(event) {
        event.stopPropagation();

        handler(event, self);
    });
};

/**
 * Sets the uri associated with this item
 * @param uri {string}
 */
sc.RepoBrowserItem.prototype.setUri = function(uri) {
    this.uri = uri;
};

/**
 * Gets the uri associated with this item
 * @return {string}
 */
sc.RepoBrowserItem.prototype.getUri = function() {
    return this.uri;
};

/**
 * Sets the rdf type of this item
 * @param type {string}
 */
sc.RepoBrowserItem.prototype.setType = function(type) {
    this.type = type;
};

/**
 * Returns the rdf type of this item
 * @return {string}
 */
sc.RepoBrowserItem.prototype.getType = function() {
    return this.type;
};

sc.RepoBrowserItem.prototype.setUrisInOrder = function(urisInOrder) {
    this.urisInOrder = urisInOrder;
};

sc.RepoBrowserItem.prototype.getUrisInOrder = function() {
    return this.urisInOrder;
};

sc.RepoBrowserItem.prototype.setCurrentIndex = function(index) {
    this.currentIndex = index;
};

sc.RepoBrowserItem.prototype.getCurrentIndex = function() {
    return this.currentIndex;
};

/**
 * Sends a console warning or error if the method is called before the RepoBrowserItem
 * has been rendered or has decorated a div.
 * @param opt_loudly {?boolean} True to display an error, rather than a warning.
 * @param opt_message {?string} Custom message to display at the console.
 */
sc.RepoBrowserItem.prototype.complainIfNotYetRendered = function(opt_loudly, opt_message) {
    if (this.rootDiv == null) {
        var callerName = arguments.callee.caller.name;

        if (opt_loudly == false && console && jQuery.isFunction(console.warn)) {
            console.warn(opt_message || callerName + ' was called before the RepoBrowserItem %@ was rendered.', this);
        }
        else if (opt_loudly && console && jQuery.isFunction(console.error)) {
            console.error(opt_message || callerName + ' was called before the RepoBrowserItem', this, 'was rendered.');
        }
    }
};


// Static
/**
 * Sorting function for RepoBrowserItems
 * @param a {sc.RepoBrowserItem}
 * @param b {sc.RepoBrowserItem}
 */
sc.RepoBrowserItem.sortByTitle = function(a, b) {
    var getTitle = function(item) {
        return jQuery.trim(item.getTitle().toLowerCase());
    };

    var aTitle = getTitle(a);
    var bTitle = getTitle(b);

    if (aTitle > bTitle)
        return 1;
    else if (aTitle < bTitle)
        return -1;
    else
        return 0;
};
