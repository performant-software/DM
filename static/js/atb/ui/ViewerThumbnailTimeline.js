goog.provide('atb.ui.ViewerThumbnailTimeline');

goog.require('goog.dom.DomHelper');
goog.require('jquery.jQuery');
goog.require('atb.viewer.ViewerThumbnail');
goog.require('atb.ui.PanelLayoutThumbnail');

atb.ui.ViewerThumbnailTimeline = function (clientApp, opt_domHelper) {
    this.clientApp = clientApp;
    this.domHelper = opt_domHelper || new goog.dom.DomHelper();
    
    this.tableDiv = this.domHelper.createDom('div', {'class': 'atb-ui-ViewerThumbnailTimeline-tableDiv'});
    this.baseDiv = this.domHelper.createDom('div', {'class': 'atb-ui-ViewerThumbnailTimeline'}, this.tableDiv, this.closeButtonDiv);
    
    this.renderScrollButtons();
    
    this.backgroundDiv = this.domHelper.createDom('div', {'class': 'atb-ui-ViewerThumbnailTimeline-background'});
    this.glassPaneDiv = this.domHelper.createDom('div', {'class': 'atb-ui-ViewerThumbnailTimeline-glassPane'}, this.backgroundDiv, this.baseDiv);
    
    goog.events.listen(this.glassPaneDiv, 'click', function (e) {
                       //if (e.target == this.glassPaneDiv) {
                       this.hide();
                       //}
                       }, false, this);
    
    this.render(this.domHelper.getDocument().body);
    
    this.isVisible = false;
};

atb.ui.ViewerThumbnailTimeline.CELL_PADDING = 15;
atb.ui.ViewerThumbnailTimeline.SCROLL_INCREMENT = atb.ui.ViewerThumbnailTimeline.CELL_PADDING * 2 + atb.viewer.ViewerThumbnail.WIDTH;

atb.ui.ViewerThumbnailTimeline.prototype.renderScrollButtons = function () {
    var leftScrollButton = this.domHelper.createDom('div', {'class': 'atb-ui-ViewerThumbnailTimeline-leftScrollButton'});
    var rightScrollButton = this.domHelper.createDom('div', {'class': 'atb-ui-ViewerThumbnailTimeline-rightScrollButton'});
    
    jQuery(rightScrollButton).fadeTo(0, 0.5);
    jQuery(leftScrollButton).fadeTo(0, 0.5);
    
    this.afterTableRender = function () {
        if (jQuery(this.tableElement).innerWidth() <= jQuery(this.tableDiv).width()) {
            jQuery(leftScrollButton).fadeTo(0, 0.5);
        }
        else {
            jQuery(leftScrollButton).fadeTo(0, 1);
        }
    };
    
    var afterScrollAnimation = function () {
        var scrollLeft = jQuery(this.tableDiv).scrollLeft();
        
        if (scrollLeft == 0) {
            jQuery(leftScrollButton).fadeTo(200, 0.5);
        }
        else {
            jQuery(leftScrollButton).fadeTo(200, 1);
        }
        
        if (scrollLeft == jQuery(this.tableElement).width() - jQuery(this.tableDiv).width()) {
            jQuery(rightScrollButton).fadeTo(200, 0.5);
        }
        else {
            jQuery(rightScrollButton).fadeTo(200, 1);
        }
    };
    
    goog.events.listen(leftScrollButton, 'click', function (e) {
                       var currentScrollLeft = jQuery(this.tableDiv).scrollLeft();
                       var newScrollLeft = currentScrollLeft - atb.ui.ViewerThumbnailTimeline.SCROLL_INCREMENT;
                       jQuery(this.tableDiv).animate({'scrollLeft': newScrollLeft}, 200,
                                                     atb.Util.scopeAsyncHandler(afterScrollAnimation, this));
                       e.stopPropagation();
                       }, false, this);
    goog.events.listen(rightScrollButton, 'click', function (e) {
                       var currentScrollLeft = jQuery(this.tableDiv).scrollLeft();
                       var newScrollLeft = currentScrollLeft + atb.ui.ViewerThumbnailTimeline.SCROLL_INCREMENT;
                       jQuery(this.tableDiv).animate({'scrollLeft': newScrollLeft}, 200,
                                                     atb.Util.scopeAsyncHandler(afterScrollAnimation, this));
                       e.stopPropagation()
                       }, false, this);
    
    this.baseDiv.appendChild(leftScrollButton);
    this.baseDiv.appendChild(rightScrollButton);
};

atb.ui.ViewerThumbnailTimeline.prototype.createTable = function (thumbnails, availableTableHeight) {
    var table = this.domHelper.createDom('table', {'class': 'atb-ui-ViewerThumbnailTimeline-table'});
    var cellsByRowColumn = [];
    
    var numThumbnails = thumbnails.length;
    
    var totalCellHeight = atb.viewer.ViewerThumbnail.HEIGHT + atb.ui.ViewerThumbnailTimeline.CELL_PADDING * 2;
    
    var numRows = Math.floor(availableTableHeight / totalCellHeight);
    var numColumns = Math.ceil(numThumbnails / numRows);
    
    for (var r=0; r<numRows; r++) {
        var row = this.domHelper.createDom('tr', {});
        cellsByRowColumn.push([]);
        
        for (var c=0; c<numColumns; c++) {
            var cell = this.domHelper.createDom('td', {});
            row.appendChild(cell);
            
            cellsByRowColumn[r].push(cell);
        }
        
        table.appendChild(row);
    }
    
    this.populateTableCells(cellsByRowColumn, thumbnails);
    
    return table;
};

atb.ui.ViewerThumbnailTimeline.prototype.panelThumbClickHandler = function (index, viewerThumbnail) {
    var panelManager = this.clientApp.getPanelManager();
    var panelList = panelManager.getAllPanels();
    var panel = panelList[index];
    var viewer = viewerThumbnail.getViewer();
    
    if (panel) {
        if (panel.getViewer() == viewer) {
            null;
        }
        else if (! panelManager.isViewerVisible(viewer)) {
            panel.setViewer_impl(viewer);
        }
        else {
            //atb.viewer.ViewerFactory.createViewerForResource(viewerThumbnail.getResource(), panel, this.clientApp);
            if (! viewer.getPanelContainer().historyGoBack()) {
                viewer.getPanelContainer().setViewer(null);
            }
            panel.setViewer_impl(viewer);
        }
    }
    else {
        throw "Invalid panel index";
    }
};

atb.ui.ViewerThumbnailTimeline.prototype.panelThumbCloseHandler = function (viewerThumbnail) {
    var panelManager = this.clientApp.getPanelManager();
    panelManager.unregisterViewerThumbnail(viewerThumbnail);
    
    this.setThumbnails(panelManager.viewerThumbnails.getValues());
};

/**
 * Takes a 2D array of table cells (<td></td>) and populates them in the top-down, right-left order with the given thumbnails
 * @param cells Array.<Array.<Element>>
 * @param thumbnails Array.<atb.viewer.ViewerThumbnail>
 */
atb.ui.ViewerThumbnailTimeline.prototype.populateTableCells = function (cells, thumbnails) {
    thumbnailIndex = thumbnails.length - 1;
    var self = this;
    
    var thumbsSet = new goog.structs.Set(thumbnails);
    if (! goog.array.equals(thumbsSet.getValues(), thumbnails)) {
        console.log('duplicate thumbnails passed')
    }
    
    for (var c=cells[0].length-1; c>=0; c--) {
        for (var r=0; r<cells.length; r++) {
            var cell = cells[r][c];
            
            if (thumbnailIndex >= 0) {
                var thumbnail = thumbnails[thumbnailIndex];
                thumbnailIndex --;
                
                var div = this.domHelper.createDom('div', {'style': 'position: relative;'}); // Firefox positioning bug workaround
                
                thumbnail.render(div);
                
                var panelThumb = new atb.ui.PanelLayoutThumbnail(this.clientApp, thumbnail,
                                                                 atb.Util.scopeAsyncHandler(this.panelThumbClickHandler, this),
                                                                 atb.Util.scopeAsyncHandler(this.panelThumbCloseHandler, this));
                panelThumb.render(div);
                
                cell.appendChild(div);
            }
            else {
                break;
            }
        }
    }
};

atb.ui.ViewerThumbnailTimeline.prototype.setThumbnails = function (thumbnails) {
    this.thumbnails = thumbnails;
    
    var availableTableHeight = jQuery(this.domHelper.getWindow()).height() * 0.8 - 10;
    
    jQuery(this.tableDiv).children().detach();
    this.tableElement = this.createTable(thumbnails, availableTableHeight)
    this.tableDiv.appendChild(this.tableElement);
    
    this.afterTableRender();
};

/**
 * Does not need to be called explicitly by the user
 */
atb.ui.ViewerThumbnailTimeline.prototype.render = function (div) {
    jQuery(this.glassPaneDiv).hide();
    
    div.appendChild(this.glassPaneDiv);
    
    return this.glassPaneDiv;
};

atb.ui.ViewerThumbnailTimeline.prototype.keyHandler = function (e) {
    var keyCode = e.keyCode;

    if (keyCode == goog.events.KeyCodes.ESC) {
        this.hide();
    }
    
    e.stopPropagation();
};

atb.ui.ViewerThumbnailTimeline.prototype.centerTable = function () {
    var topOffset = (jQuery(this.baseDiv).height() - jQuery(this.tableElement).height()) / 2;
    jQuery(this.tableDiv).css({'margin-top': topOffset + 'px'});
};

atb.ui.ViewerThumbnailTimeline.prototype.hide = function (opt_duration) {
    var duration;
    if (opt_duration != null) duration = opt_duration;
    else duration = 400;
    
    this.isVisible = false;
    
    jQuery(this.backgroundDiv).addClass('atb-ui-ViewerThumbnailTimeline-backgroundHidden');
    jQuery(this.backgroundDiv).removeClass('atb-ui-ViewerThumbnailTimeline-backgroundShown');
    
    //jQuery(this.glassPaneDiv).fadeOut(duration);
    jQuery(this.glassPaneDiv).hide('drop', {'direction': 'down'}, duration);
    
    goog.events.unlisten(this.domHelper.getWindow(), 'keyup', this.keyHandler);
    goog.events.unlisten(this.domHelper.getWindow(), 'resize', this.handleWindowResize);
};

atb.ui.ViewerThumbnailTimeline.prototype.show = function (opt_duration) {
    var duration;
    if (opt_duration != null) duration = opt_duration;
    else duration = 400;
    
    this.isVisible = true;
    
    //jQuery(this.glassPaneDiv).fadeIn(duration);
    jQuery(this.glassPaneDiv).show('drop', {'direction': 'down'}, duration);
    
    jQuery(this.backgroundDiv).addClass('atb-ui-ViewerThumbnailTimeline-backgroundShown');
    jQuery(this.backgroundDiv).removeClass('atb-ui-ViewerThumbnailTimeline-backgroundHidden');
    
    var width = jQuery(this.tableDiv).width(); 
    var tableWidth = jQuery(this.tableElement).width();
    jQuery(this.tableDiv).scrollLeft(tableWidth - width);
    
    this.centerTable();
    this.afterTableRender();
    
    goog.events.listenOnce(this.domHelper.getWindow(), 'keyup', this.keyHandler, false, this);
    goog.events.listen(this.domHelper.getWindow(), 'resize', this.handleWindowResize, false, this);
    
    this.windowSize = {
    width: jQuery(this.domHelper.getWindow()).width(),
    height: jQuery(this.domHelper.getWindow()).height()
    };
};

atb.ui.ViewerThumbnailTimeline.prototype.toggleVisibility = function () {
    if (this.isVisible) {
        this.hide();
        return false;
    }
    else {
        this.show();
        return true;
    }
};

atb.ui.ViewerThumbnailTimeline.prototype.handleWindowResize = function (event) {
    var totalCellHeight = atb.viewer.ViewerThumbnail.HEIGHT + atb.ui.ViewerThumbnailTimeline.CELL_PADDING * 2;
    
    var newWidth = jQuery(this.domHelper.getWindow()).width();
    var newHeight = jQuery(this.domHelper.getWindow()).height();
    
    if (Math.abs(newHeight - this.windowSize.height) > totalCellHeight) {
        jQuery(this.tableElement).detach();
        this.setThumbnails(goog.array.clone(this.thumbnails));
        
        this.centerTable();
    }
    
    this.windowSize = {
    width: newWidth,
    height: newHeight
    };
};