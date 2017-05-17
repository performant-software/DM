goog.provide('dm.RepoBrowserManuscript');

goog.require('dm.RepoBrowserItem');

goog.require('goog.ui.AnimatedZippy');
goog.require('goog.math.Size');
goog.require('goog.dom');

dm.RepoBrowserManuscript = function(repoBrowser) {
    dm.RepoBrowserItem.call(this, repoBrowser);

    this.foliaDiv = this.doc.createElement('div');
    jQuery(this.foliaDiv).addClass('sc-RepoBrowserManuscript-folia');

    this.foliaMessageDiv = this.doc.createElement('div');
    jQuery(this.foliaMessageDiv).addClass('sc-RepoBrowserManuscript-foliaMessage');
    this.foliaDiv.appendChild(this.foliaMessageDiv);

    this.headerDiv = this.doc.createElement('div');
    jQuery(this.headerDiv).addClass('sc-RepoBrowserManuscript-header');

    this.imageDiv = this.doc.createElement('div');
    jQuery(this.imageDiv).addClass('sc-RepoBrowserManuscript-imageDiv');

    this.imageWrapperDiv = this.doc.createElement('div');
    jQuery(this.imageWrapperDiv).addClass('sc-RepoBrowserManuscript-imageWrapper');

    this.thumbnailCurl = this.doc.createElement('div');
    jQuery(this.thumbnailCurl).addClass('sc-RepoBrowserManuscript-pageCurl');
    this.imageWrapperDiv.appendChild(this.thumbnailCurl);
    this.imageDiv.appendChild(this.imageWrapperDiv);

    this.clearDiv = this.doc.createElement('div');
    jQuery(this.clearDiv).css('clear', 'both');

    this.headerDiv.appendChild(this.imageDiv);
    this.headerDiv.appendChild(this.titleDiv);
    this.headerDiv.appendChild(this.clearDiv);

    this.folios = [];
    this.foliosByUri = new goog.structs.Map();
};
goog.inherits(dm.RepoBrowserManuscript, dm.RepoBrowserItem);

dm.RepoBrowserManuscript.prototype.decorate = function(div) {
    this.rootDiv = div;
    var $div = jQuery(div);

    $div.empty();
    $div.addClass('sc-RepoBrowserItem');
    $div.addClass('sc-RepoBrowserManuscript');
    $div.attr('title', this.title);

    jQuery(this.headerDiv).append(this.addButtonDiv);

    $div.append(this.headerDiv, this.foliaDiv);

    this.zippy = new goog.ui.AnimatedZippy(this.headerDiv, this.foliaDiv, false);
};

dm.RepoBrowserManuscript.prototype.addFolio = function(item) {
    this.addFolia([item]);
};

dm.RepoBrowserManuscript.prototype.addFolia = function(items) {
    for (var i = 0, len=items.length; i<len; i++) {
        var item = items[i];

        this.folios.push(item);
        this.foliosByUri.set(item.getUri(), item);
    };

    var fragment = this.doc.createDocumentFragment();

    for (var i = 0, len=items.length; i<len; i++) {
        var item = items[i];

        item.render(fragment);
    };

    this.foliaDiv.appendChild(fragment);
};

dm.RepoBrowserManuscript.prototype.clearFolia = function() {
    this.folios = [];
    this.foliosByUri.clear();

    jQuery(this.foliaDiv).empty();
    this.foliaDiv.appendChild(this.foliaMessageDiv);
};

dm.RepoBrowserManuscript.prototype.getNumFolia = function () {
    return this.folios.length;
};

dm.RepoBrowserManuscript.prototype.expand = function() {
    this.complainIfNotYetRendered();

    this.zippy.expand();
};

dm.RepoBrowserManuscript.prototype.collapse = function() {
    this.complainIfNotYetRendered();

    this.zippy.collapse();
};

dm.RepoBrowserManuscript.prototype.isExpanded = function() {
    this.complainIfNotYetRendered();

    return this.zippy.isExpanded();
};

dm.RepoBrowserManuscript.THUMB_SIZE = new goog.math.Size(75, 75);

dm.RepoBrowserManuscript.prototype.setThumb = function(src, width, height) {
    if (! this.thumbImg) {
        this.thumbImg = this.doc.createElement('img');
        jQuery(this.thumbImg).addClass('sc-RepoBrowserManuscript-thumbImg');
        this.imageWrapperDiv.appendChild(this.thumbImg);
    }

    if (! width && ! height) {
        width = dm.RepoBrowserManuscript.THUMB_SIZE.width;
        height = dm.RepoBrowserManuscript.THUMB_SIZE.height;
    }

    jQuery(this.thumbImg).attr({
        'src': src,
        'width': width,
        'height': height
    });
};

dm.RepoBrowserManuscript.prototype.showFoliaMessage = function(text) {
    jQuery(this.foliaMessageDiv).text(text).show();
};

dm.RepoBrowserManuscript.prototype.hideFoliaMessage = function() {
    jQuery(this.foliaMessageDiv).hide();
};

dm.RepoBrowserManuscript.prototype.indicateNetworkError = function() {
    jQuery(this.imageWrapperDiv).addClass('sc-RepoBrowserManuscript-error');
};