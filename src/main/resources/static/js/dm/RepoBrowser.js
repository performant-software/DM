goog.provide('dm.RepoBrowser');

goog.require('goog.events.Event');
goog.require('goog.events.EventTarget');

goog.require('jquery.popout');
goog.require('jquery.rdfquery');
goog.require('dm.Array');
goog.require('dm.BreadCrumbs');
goog.require('dm.RepoBrowserFolio');
goog.require('dm.RepoBrowserItem');
goog.require('dm.RepoBrowserManuscript');
goog.require('dm.data.Databroker');

/**
 * @author tandres@drew.edu (Tim Andres)
 *
 * Shared Canvas Repository Browser
 * Reads rdf files from manuscript repositories and displays them through drill-down menus and
 * expanding thumbnails, allowing for customization of the display format and actions
 *
 * @param options {?Object}
 *
 * @extends {goog.events.EventTarget}
 */
dm.RepoBrowser = function(options) {
    goog.events.EventTarget.call(this);

    if (! options) {
        options = {};
    }

    this.options = jQuery.extend(true, {
        databroker: new dm.data.Databroker(),
        slideAnimationSpeed: 300,
        doc: window.document,
        imageSourceGenerator: function(url, opt_width, opt_height) {
            return this.databroker.getImageSrc(url, opt_width, opt_height);
        },
        errorHandler: jQuery.proxy(this.flashErrorIcon, this),
        showLoadingIndicator: jQuery.proxy(this.showLoadingSpinner, this),
        hideLoadingIndicator: jQuery.proxy(this.hideLoadingSpinner, this),
        showAddButton: true,
        showErrors: true
    }, options);

    this.databroker = this.options.databroker;

    this.prefetchInitialRdf();

    this.currentRepository = '';
};
goog.inherits(dm.RepoBrowser, goog.events.EventTarget);

/**
 * Shows the loading indicator specified in options, or the default loading indicator
 */
dm.RepoBrowser.prototype.showLoadingIndicator = function() {
    this.options.showLoadingIndicator();
};

/**
 * Hides the loading indicator specified in options, or the default loading indicator
 */
dm.RepoBrowser.prototype.hideLoadingIndicator = function() {
    this.options.hideLoadingIndicator();
};

/**
 * If an element is given, the RepoBrowser will be appended to it; otherwise, a div element containing
 * the RepoBrowser will be returned
 *
 * @param opt_div {?Element}
 * @return {Element}
 */
dm.RepoBrowser.prototype.render = function(opt_div) {
    var doc = this.options.doc;

    this.baseDiv = doc.createElement('div');
    jQuery(this.baseDiv).addClass('sc-RepoBrowser');

    this.spinner = doc.createElement('div');
    jQuery(this.spinner).addClass('sc-RepoBrowser-loadingSpinner');
    jQuery(this.spinner).hide();
    this.baseDiv.appendChild(this.spinner);

    this.errorIcon = doc.createElement('div');
    jQuery(this.errorIcon).addClass('sc-RepoBrowser-errorIcon');
    jQuery(this.errorIcon).hide();
    this.baseDiv.appendChild(this.errorIcon);


    this.messageDiv = doc.createElement('div');
    jQuery(this.messageDiv).addClass('sc-RepoBrowser-message');
    jQuery(this.messageDiv).hide();
    this.baseDiv.appendChild(this.messageDiv);

    this.breadCrumbs = new dm.BreadCrumbs(doc);
    this.breadCrumbs.render(this.baseDiv);

    this.innerDiv = doc.createElement('div');
    jQuery(this.innerDiv).addClass('sc-RepoBrowser-inner');
    jQuery(this.baseDiv).append(this.innerDiv);

    this.sectionDivs = {
        repositories: doc.createElement('div'),
        collections: doc.createElement('div'),
        manuscripts: doc.createElement('div')
    };
    for (var name in this.sectionDivs) {
        if (this.sectionDivs.hasOwnProperty(name)) {
            var sectionDiv = this.sectionDivs[name];

            jQuery(sectionDiv).addClass('sc-RepoBrowser-section');
        }
    }
    jQuery(this.sectionDivs.repositories).addClass('sc-RepoBrowser-repositories');
    jQuery(this.sectionDivs.collections).addClass('sc-RepoBrowser-collections');
    jQuery(this.sectionDivs.manuscripts).addClass('sc-RepoBrowser-manuscripts');

    jQuery(this.innerDiv).append(
        this.sectionDivs.repositories,
        this.sectionDivs.collections,
        this.sectionDivs.manuscripts
    );

    this.loadAllRepositories();

    if (opt_div) {
        jQuery(opt_div).append(this.baseDiv);
    }

    return this.baseDiv;
};

/**
 * Shows a spinning loading indicator
 */
dm.RepoBrowser.prototype.showLoadingSpinner = function() {
    var div = this.baseDiv;

    var top = jQuery(div).height() / 2 - 16;
    var left = jQuery(div).width() / 2 - 16;

    if (top < 0) top = 0;
    if (left < 0) left = 0;

    jQuery(this.spinner).css({'top': top, 'left': left});

    jQuery(this.spinner).fadeIn(200);
};

/**
 * Hides the spinning loading indicator
 */
dm.RepoBrowser.prototype.hideLoadingSpinner = function() {
    jQuery(this.spinner).fadeOut(200);
};

/**
 * Smoothly displays a network error icon for approximately one second
 */
dm.RepoBrowser.prototype.flashErrorIcon = function() {
    this.hideLoadingSpinner();

    var div = this.baseDiv;

    var top = jQuery(div).height() / 2 - 18;
    var left = jQuery(div).width() / 2 - 18;

    if (top < 0) top = 0;
    if (left < 0) left = 0;

    jQuery(this.errorIcon).css({'top': top, 'left': left});

    var self = this;
    jQuery(this.errorIcon).fadeIn(200, function() {
        window.setTimeout(function() {
            jQuery(self.errorIcon).fadeOut(1500);
        }, 1000);
    });
};

/**
 * Shows a textual message which floats centered over the browser
 *
 * @param text {string}
 */
dm.RepoBrowser.prototype.showMessage = function(text) {
    jQuery(this.messageDiv).text(text);

    // Calculate the height of the div without actually showing it
    jQuery(this.messageDiv).css({'visibility': 'hidden', 'display': 'block'});
    var textHeight = jQuery(this.messageDiv).height();
    jQuery(this.messageDiv).css({'display': 'none', 'visibility': 'visible'});

    var div = this.baseDiv;

    var top = (jQuery(div).height()) / 2 - (textHeight / 2);
    var left = 0;
    var width = jQuery(div).width();
    jQuery(this.messageDiv).css({'top': top, 'left': left, 'width': width});

    jQuery(this.messageDiv).fadeIn(200);
};

/**
 * Hides the textual message which floats over the browser
 */
dm.RepoBrowser.prototype.hideMessage = function() {
    jQuery(this.messageDiv).fadeOut(200);
};

/**
 * @private
 * @param {number} index
 * @param {!Function} opt_after
 */
dm.RepoBrowser.prototype.slideToIndex_ = function(index, opt_after) {
    jQuery(this.innerDiv).animate({
        'margin-left': String(-100 * index) + '%'
    }, this.animationSpeed, opt_after);

    this.hideMessage();
};

/**
 * Slides the drill-down view to the All Repositories section
 * @param opt_after {function} code to perform after the slide is completed.
 */
dm.RepoBrowser.prototype.slideToRepositories = function(opt_after) {
    var self = this;

    return this.slideToIndex_(0, function() {
        if (jQuery.isFunction(opt_after)) {
            opt_after();
        }
    });
};

/**
 * Slides the drill-down view to the Collections section of a repository
 * @param opt_after {function} code to perform after the slide is completed.
 */
dm.RepoBrowser.prototype.slideToCollections = function(opt_after) {
    var self = this;

    return this.slideToIndex_(1, function() {
        if (jQuery.isFunction(opt_after)) {
            opt_after();
        }
    });
};

/**
 * Slides the drill-down view to the Manuscripts section of a collection
 * @param opt_after {function} code to perform after the slide is completed.
 */
dm.RepoBrowser.prototype.slideToManuscripts = function(opt_after) {
    var self = this;

    return this.slideToIndex_(2, function() {
        if (jQuery.isFunction(opt_after)) {
            opt_after();
        }
    });
};

dm.RepoBrowser.prototype.prefetchInitialRdf = function() {
    var repos = this.options.repositories;

    if (repos) {
        for (var i=0, len=repos.length; i<len; i++) {
            var repo = repos[i];

            var url = repo.url;

            if (url) {
                this.databroker.fetchRdf(url);
            }
        }
    }
};

/**
 * Displays working links to all repositories specified in this.options.repositoryUrlsByName
 */
dm.RepoBrowser.prototype.loadAllRepositories = function() {
    var repos = this.options.repositories;
    var repositoriesDiv = this.sectionDivs.repositories;

    jQuery(repositoriesDiv).empty();

    this.slideToRepositories();

    this.breadCrumbs.push('Repositories', this.loadAllRepositories.bind(this));

    if (! repos) {
        return;
    }

    for (var i=0, len=repos.length; i<len; i++) {
        var repo = repos[i];

        var item = new dm.RepoBrowserItem(this);

        if (repo.title) {
            item.setTitle(repo.title);
        }
        else {
            var title = this.databroker.dataModel.getTitle(repo.uri) ||
                'Untitled repository';
            item.setTitle(title);
        }

        item.render(repositoriesDiv);

        item.bind('click', {uri: repo.uri}, function(event) {
            this.loadRepositoryByUri(event.data.uri);
        }.bind(this));
    }
};

dm.RepoBrowser.prototype.pushTitleToBreadCrumbs = function(uri, clickHandler) {
    var title = dm.RepoBrowser.parseTitleFromPath(uri);
    this.breadCrumbs.push(title, clickHandler);
};

dm.RepoBrowser.prototype.createItemEvent = function(item, eventType, originalEvent, manifestUri) {
    var itemEvent = new goog.events.Event(eventType, this);
    itemEvent.originalEvent = originalEvent;
    itemEvent.uri = item.getUri();
    itemEvent.item = item;
    itemEvent.manifestUri = manifestUri;

    itemEvent.resource = this.databroker.getResource(item.getUri());

    return itemEvent;
};

dm.RepoBrowser.prototype.addManifestItem = function(uri, clickHandler, div) {
    var self = this;

    var collection = self.databroker.getDeferredResource(uri);

    var item = new dm.RepoBrowserItem(self);
    item.setTitle(uri, true);
    item.setUri(uri);
    item.render(div);

    var handler = function(event, item) {
        if (self.dispatchEvent(self.createItemEvent(item, 'click', event, uri))) {
            clickHandler(uri);
        }
    };
    item.unbind('click');
    item.bind('click', handler);

    item.bind('mouseover', function(event, item) {
        self.dispatchEvent(self.createItemEvent(item, 'mouseover', event, uri));
    });
    item.bind('mouseout', function(event, item) {
        self.dispatchEvent(self.createItemEvent(item, 'mouseout', event, uri));
    });

    var withResource = function(resource) {
        var title = this.databroker.dataModel.getTitle(resource);
        if (title) {
            item.setTitle(title);
        }
    }.bind(this);
    collection.progress(withResource).done(withResource);

    collection.fail(function(resource) {
        if (this.options.showErrors) {
            item.indicateNetworkError();
        }
        else {
            jQuery(item.getElement()).hide();
        }
    }.bind(this));
};

dm.RepoBrowser.prototype.addManifestItems = function(manifestUri, clickHandler, div) {
    this.showLoadingIndicator();

    this.databroker.getDeferredResource(manifestUri).done(function(resource) {
        var aggregatedUris = this.databroker.dataModel.findAggregationContentsUrisForRepoBrowser(manifestUri);

        var fragment = this.options.doc.createDocumentFragment();

        for (var i = 0, len = aggregatedUris.length; i < len; i++) {
            var uri = aggregatedUris[i];

            this.addManifestItem(uri, clickHandler, fragment);
        }

        div.appendChild(fragment);

        this.hideLoadingIndicator();
    }.bind(this));
};

/**
 * Loads all collections in a given repository given the url of the repository rdf file
 * @param url {string}
 */
dm.RepoBrowser.prototype.loadRepositoryByUri = function(uri) {
    var collectionsDiv = this.sectionDivs.collections;

    this.slideToCollections();

    this.repositoryUrl = uri;
    this.currentRepository = dm.RepoBrowser.parseRepoTitleFromURI(uri);

    jQuery(collectionsDiv).empty();

    this.showLoadingIndicator();

    this.databroker.getDeferredResource(uri).done(function(resource) {
        this.pushTitleToBreadCrumbs(uri, this.loadRepositoryByUri.bind(this, uri));

        this.addManifestItems(
            uri, 
            this.loadCollectionByUri.bind(this), 
            collectionsDiv
        );
    }.bind(this));
};

/**
 * Loads all manuscripts in a given collection given the uri of the collection
 * @param uri {string}
 */
dm.RepoBrowser.prototype.loadCollectionByUri = function(uri) {
    var self = this;

    var manuscriptsDiv = this.sectionDivs.manuscripts;

    this.slideToManuscripts();

    this.collectionUri = uri;

    jQuery(manuscriptsDiv).empty();

    this.pushTitleToBreadCrumbs(uri, this.loadCollectionByUri.bind(this, uri));

    var manifest = this.databroker.getDeferredResource(uri);
    manifest.done(this.generateManuscriptItems.bind(this, uri));
};

dm.RepoBrowser.prototype.generateManuscriptItems = function(manifestUri) {
    var self = this;
    var manuscriptsDiv = this.sectionDivs.manuscripts;

    var aggregatedUris = this.databroker.dataModel.findAggregationContentsUrisForRepoBrowser(manifestUri);
    this.databroker.sortUrisByTitle(aggregatedUris);

    var fragment = this.options.doc.createDocumentFragment();

    for (var i = 0, len = aggregatedUris.length; i < len; i++) {
        var uri = aggregatedUris[i];

        var item = this.generateManuscriptItem(uri);
        item.render(fragment);
    }

    manuscriptsDiv.appendChild(fragment);
};

dm.RepoBrowser.prototype.generateManuscriptItem = function(uri) {
    var item = new dm.RepoBrowserManuscript(this);
    item.setTitle(uri, true);
    item.setUri(uri);
    item.showFoliaMessage('Loading folia...');

    if (this.options.showAddButton) {
        item.showAddButton(jQuery.proxy(function(event, item) {
            this.dispatchEvent(this.createItemEvent(item, 'add_request', event, uri));
        }, this));
    }

    var deferredManuscript = this.databroker.getDeferredResource(uri);
    var withManuscript = jQuery.proxy(function(manuscript) {
        var title = this.databroker.dataModel.getTitle(manuscript);
        if (title) {
            item.setTitle(title);
        }

        this.setManuscriptThumb(uri, item);

        item.bind('click', function(event) {
            var sequenceUri = this.databroker.dataModel.findManuscriptSequenceUris(uri)[0];

            if (sequenceUri && item.getNumFolia() == 0) {
                window.setTimeout(jQuery.proxy(function() {
                    this.generateManuscriptFolia(uri, item);
                }, this), 1);
            }
        }.bind(this));
    }, this);
    deferredManuscript.progress(withManuscript).done(withManuscript);

    deferredManuscript.fail(jQuery.proxy(function(manuscript) {
        if (this.options.showErrors) {
            item.indicateNetworkError();
            item.showFoliaMessage('There was a network error when attempting to load this manuscript.');
        }
        else {
            jQuery(item.getElement()).hide();
        }
    }, this));

    return item;
};

dm.RepoBrowser.prototype.generateManuscriptFolia = function(manuscriptUri, manuscriptItem) {
    var sequenceUri = this.databroker.dataModel.findManuscriptSequenceUris(manuscriptUri)[0];
    var imageAnnoUri = this.databroker.dataModel.findManuscriptImageAnnoUris(manuscriptUri)[0];

    var urisInOrder = this.databroker.dataModel.listSequenceContents(sequenceUri);

    var renderSequence = function() {
        if (manuscriptItem.getNumFolia() > 0) {
            return;
        }

        var urisInOrder = this.databroker.dataModel.listSequenceContents(sequenceUri);
        var thumbs = [];
        var thumbsByUri = {};

        manuscriptItem.hideFoliaMessage();

        for (var i = 0, len = urisInOrder.length; i < len; i++) {
            var canvasUri = urisInOrder[i];

            var thumb = new dm.RepoBrowserFolio(this);
            thumb.setType('dms:Canvas');
            thumb.setUri(canvasUri);
            thumb.setUrisInOrder(urisInOrder);
            thumb.setCurrentIndex(i);

            var canvasResource = this.databroker.getResource(canvasUri);

            var title = this.databroker.dataModel.getTitle(canvasResource);
            if (title) {
                thumb.setTitle(title);
            }

            thumbs.push(thumb);
            thumbsByUri[canvasUri] = thumb;
        }

        manuscriptItem.addFolia(thumbs);

        for (var i = 0, len = urisInOrder.length; i < len; i++) {
            var thumb = thumbs[i];
            var canvasUri = thumb.getUri();

            thumb.bind('click', jQuery.proxy(function(event, thumb) {
                var itemEvent = this.createItemEvent(thumb, 'click', event, manuscriptUri);
                itemEvent.urisInOrder = thumb.getUrisInOrder();
                itemEvent.currentIndex = thumb.getCurrentIndex();
                this.dispatchEvent(itemEvent);
            }, this));

            thumb.bind('mouseover', jQuery.proxy(function(event, thumb) {
                var itemEvent = this.createItemEvent(thumb, 'mouseover', event, manuscriptUri);
                itemEvent.urisInOrder = thumb.getUrisInOrder();
                itemEvent.currentIndex = thumb.getCurrentIndex();
                this.dispatchEvent(itemEvent);
            }, this));
            thumb.bind('mouseout', jQuery.proxy(function(event, thumb) {
                var itemEvent = this.createItemEvent(thumb, 'mouseout', event, manuscriptUri);
                itemEvent.urisInOrder = thumb.getUrisInOrder();
                itemEvent.currentIndex = thumb.getCurrentIndex();
                this.dispatchEvent(itemEvent);
            }, this));

            if (this.options.showAddButton) {
                thumb.showAddButton(jQuery.proxy(function(event, thumb) {
                    var itemEvent = this.createItemEvent(thumb, 'add_request', event, manuscriptUri);
                    itemEvent.urisInOrder = thumb.getUrisInOrder();
                    itemEvent.currentIndex = thumb.getCurrentIndex();
                    this.dispatchEvent(itemEvent);
                }, this));
            }
        }

        if (thumbs.length == 0) {
            manuscriptItem.showFoliaMessage('Badly formed data - unable to determine page order');
        }

        return thumbsByUri;
    }.bind(this);

    var renderImages = function(thumbsByUri) {
        for (var uri in thumbsByUri) {
            var thumb = thumbsByUri[uri];
            var canvasResource = this.databroker.getResource(uri);

            var title = this.databroker.dataModel.getTitle(canvasResource);
            if (title) {
                thumb.setTitle(title);
            }
        }

        this.setManuscriptThumb(manuscriptUri, manuscriptItem);
    }.bind(this);

    if (urisInOrder.length == 0) {
        // Fetch the sequence and image anno, then render

        var deferredSequence = this.databroker.getDeferredResource(sequenceUri);
        var deferredImageAnno = this.databroker.getDeferredResource(imageAnnoUri);

        deferredSequence.done(function() {
            var thumbsByUri = renderSequence();
            deferredImageAnno.done(function() {
                renderImages(thumbsByUri);
            }.bind(this));
        }.bind(this));
        deferredSequence.fail(jQuery.proxy(function() {
            manuscriptItem.showFoliaMessage('Unable to load folia information');
        }, this));
    }
    else {
        // Render immediately
        
        renderImages(renderSequence());
    }
};

dm.RepoBrowser.prototype.setManuscriptThumb = function(manuscriptUri, manuscriptItem) {
    var sequenceUri = this.databroker.dataModel.findManuscriptSequenceUris(manuscriptUri)[0];

    if (! sequenceUri) {
        return;
    }

    var urisInOrder = this.databroker.dataModel.listSequenceContents(sequenceUri);

    if (urisInOrder.length > 0) {
        var firstThumbSrc = this.databroker.dataModel.findCanvasImageUris(urisInOrder[0])[0];
        if (firstThumbSrc) {
            var image = this.databroker.getResource(firstThumbSrc);

            var size = new goog.math.Size(
                Number(image.getOneProperty('exif:width')),
                Number(image.getOneProperty('exif:height'))
            ).scaleToFit(dm.RepoBrowserManuscript.THUMB_SIZE);

            manuscriptItem.setThumb(
                this.options.imageSourceGenerator(firstThumbSrc, size.width, size.height),
                size.width,
                size.height
            );
        }
    }
};

/**
 * Parses the canvas number from its uri. Returns -1 if
 * the number cannot be parsed.
 *
 * @note initially used as a hack for sorting, which is now performed correctly
 * with sequence files
 *
 * @static
 * @param uri {string}
 * @param return number}.
 */
dm.RepoBrowser.parseCanvasNumberFromURI = function(uri) {
    var numberRegex = /-(\d+)$/;
    var match = numberRegex.exec(uri);

    if (match) {
        return Number(match[1]);
    } else {
        return -1;
    }
};

/**
 * Attempts to parse the name of a collection from its path
 */
dm.RepoBrowser.parseCollectionTitleFromPath = function(path) {
    var nameRegex = /\/(\w+)\/Collection/;
    var match = nameRegex.exec(path);

    if (match) {
        var title = match[1];
    } else {
        var title = '';
    }

    return title;
};

/**
 * Attempts to parse the name of a manuscript from its manifest path uri
 */
dm.RepoBrowser.parseManuscriptTitleFromPath = function(path) {
    var nameRegex = /\/(\w+)\/Manifest/;
    var match = nameRegex.exec(path);

    if (match) {
        var title = match[1];
    }
    else {
        var title = '';
    }

    return title;
};

/**
 * Parses the name of a repository from its uri by using the domain name
 */
dm.RepoBrowser.parseRepoTitleFromURI = function(uri) {
    var nameRegex = /\/\/([^\/]+)\//;
    var match = nameRegex.exec(uri);

    if (match) {
        var title = match[1];
    } else {
        var title = '';
    }

    return title;
};

/**
 * Attempts to parse the title of a resource from its path (or uri)
 */
dm.RepoBrowser.parseTitleFromPath = function(path) {
    var title = dm.RepoBrowser.parseCollectionTitleFromPath(path);
    if (title) return title;

    title = dm.RepoBrowser.parseManuscriptTitleFromPath(path);
    if (title) return title;

    title = dm.RepoBrowser.parseRepoTitleFromURI(path);
    if (title) return title;

    var index = path.lastIndexOf('/');
    if (index + 1 == path.length) {
        path = path.substring(0, path.length - 1);

        return path.substring(path.lastIndexOf('/'), path.length);
    }
    else {
        return path.substring(index, path.length);
    }
};
