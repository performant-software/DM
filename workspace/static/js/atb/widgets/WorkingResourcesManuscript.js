goog.provide('atb.widgets.WorkingResourcesManuscript');

goog.require('atb.widgets.WorkingResourcesItem');
goog.require('goog.structs.Map');
goog.require('goog.ui.AnimatedZippy');

atb.widgets.WorkingResourcesManuscript = function(databroker, uri, opt_domHelper) {
    atb.widgets.WorkingResourcesItem.call(this, databroker, uri, opt_domHelper);

    jQuery(this.div).addClass('atb-WorkingResourcesManuscript');

    this.folios = [];
    this.foliosByUri = new goog.structs.Map();
};
goog.inherits(atb.widgets.WorkingResourcesManuscript,
              atb.widgets.WorkingResourcesItem);

atb.widgets.WorkingResourcesManuscript.prototype.setupLayout_ = function() {
    this.thumbnailDiv = this.domHelper.createDom('div', {
        'class': 'atb-WorkingResourcesItem-thumb'
    });
    this.thumbnailCurl = this.domHelper.createDom('div', {
        'class': 'atb-WorkingResourcesManuscript-pageCurl'
    });
    this.thumbnailImg = this.domHelper.createDom('img');
    this.thumbnailWrapper = this.domHelper.createDom('div', {
        'class': 'atb-WorkingResourcesManuscript-thumbWrapper'
    });
    this.thumbnailWrapper.appendChild(this.thumbnailCurl);
    this.thumbnailWrapper.appendChild(this.thumbnailImg);
    this.thumbnailDiv.appendChild(this.thumbnailWrapper);
    this.titleDiv = this.domHelper.createDom('div', {
        'class': 'atb-WorkingResourcesItem-title'
    });
    this.attributesDiv = this.domHelper.createDom('div', {
        'class': 'atb-WorkingResourcesItem-attributes'
    });

    this.removeButton = this.domHelper.createDom('div', {
        'class': 'atb-WorkingResourcesItem-remove icon-minus-sign',
        'title': 'Remove this resource from the project'
    });
    jQuery(this.removeButton).hide();
    goog.events.listen(this.removeButton, 'click', this.handleRemoveClick, false, this);

    this.clearDiv = this.domHelper.createDom('div', {
        'style': 'clear: both;'
    });

    this.headerDiv = this.domHelper.createDom('div', {
        'class': 'atb-WorkingResourcesManuscript-header'
    });
    this.contentDiv = this.domHelper.createDom('div', {
        'class': 'atb-WorkingResourcesManusctipt-folia'
    });

    this.foliaMessageDiv = this.domHelper.createDom('div', {
        'class': 'atb-WorkingResourcesManuscript-foliaMessage'
    });
    this.contentDiv.appendChild(this.foliaMessageDiv);

    this.div.appendChild(this.headerDiv);
    this.div.appendChild(this.contentDiv);


    this.headerDiv.appendChild(this.thumbnailDiv);
    this.headerDiv.appendChild(this.titleDiv);
    this.headerDiv.appendChild(this.attributesDiv);
    this.headerDiv.appendChild(this.removeButton);
    this.headerDiv.appendChild(this.domHelper.createDom('div', {
        'style': 'clear: both;'
    }));

    this.div.appendChild(this.clearDiv);

    this.zippy = new goog.ui.AnimatedZippy(this.headerDiv, this.contentDiv,
                                           false, null, this.domHelper);
};

atb.widgets.WorkingResourcesManuscript.prototype.expand = function() {
    this.zippy.expand();
};

atb.widgets.WorkingResourcesManuscript.prototype.collapse = function() {
    this.zippy.collapse();
};

atb.widgets.WorkingResourcesManuscript.prototype.isExpanded = function() {
    return this.zippy.isExpanded();
};

atb.widgets.WorkingResourcesManuscript.prototype.toggle = function() {
    this.zippy.toggle();
};

// atb.widgets.WorkingResourcesManuscript.prototype.handleClick = function(event) {
//     return;
// };

atb.widgets.WorkingResourcesManuscript.prototype.addFolio = function(folio) {
    this.folios.push(folio);
    this.foliosByUri.set(folio.getUri(), folio);

    folio.render(this.contentDiv);
};

atb.widgets.WorkingResourcesManuscript.prototype.addFolia = function(folia) {
    var fragment = this.domHelper.getDocument().createDocumentFragment();

    for (var i=0, len=folia.length; i<len; i++) {
        var folio = folia[i];

        this.folios.push(folio);
        this.foliosByUri.set(folio.getUri(), folio);

        folio.render(fragment);
    }

    this.contentDiv.appendChild(fragment);
};

atb.widgets.WorkingResourcesManuscript.prototype.containsFolio = function(uri) {
    var equivalentUris = this.databroker.getEquivalentUris(uri);

    for (var i = 0, len = equivalentUris.length; i < len; i++) {
        var equivalentUri = equivalentUris[i];

        if (this.foliosByUri.containsKey(equivalentUri)) {
            return true;
        }
    }

    return false;
};

atb.widgets.WorkingResourcesManuscript.prototype.getFolio = function(uri) {
    var equivalentUris = this.databroker.getEquivalentUris(uri);

    for (var i = 0, len = equivalentUris.length; i < len; i++) {
        var equivalentUri = equivalentUris[i];

        if (this.foliosByUri.containsKey(equivalentUri)) {
            return this.foliosByUri.get(equivalentUri);
        }
    }

    return null;
};

atb.widgets.WorkingResourcesManuscript.prototype.numFolia = function() {
    return this.folios.length;
};

atb.widgets.WorkingResourcesManuscript.prototype.isEmpty = function() {
    return this.numFolia() === 0;
};

atb.widgets.WorkingResourcesManuscript.prototype.showFoliaMessage = function(text) {
    jQuery(this.foliaMessageDiv).text(text).show();
};

atb.widgets.WorkingResourcesManuscript.prototype.hideFoliaMessage = function() {
    jQuery(this.foliaMessageDiv).hide();
};
