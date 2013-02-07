goog.require('goog.math.Size');
goog.require('goog.events');

goog.require('atb.DMWebService');
goog.require('atb.viewer.CollectionViewer');
goog.require('atb.viewer.ItemViewer');
goog.require('atb.viewer.AnnoItemViewer');
goog.require('atb.viewer.AnnoHoverViewer');
goog.require('atb.viewer.HorizontalLayoutManager');


loadData = function(ws, cltnViewer) {
    var annoIds = ['12', '123', '1234'];
    for (i=0; i<annoIds.length; i++) {
        ws.withAnnotation(
            annoIds[i], 
            function(anno) {
                cltnViewer.addItem(anno.id, anno);
            },
            cltnViewer
        ); 
    }
}

init = function() {
	var webServiceURI = 
        location.href.substring(0, location.href.lastIndexOf("/") + 1);
    var ws = new atb.DMWebService(webServiceURI);

    var itemSize = new goog.math.Size(150, 170);
    var itemViewer = 
        new atb.viewer.AnnoItemViewer(itemSize, ws, 300, 300, 90);

    var itemHoverSize = new goog.math.Size(350, 300);
    var itemHoverViewer = 
        new atb.viewer.AnnoHoverViewer(itemHoverSize, ws, 300, 300, 300);

    var layoutSize = new goog.math.Size(600,1600);
    var layoutManager = 
        new atb.viewer.HorizontalLayoutManager('items', layoutSize, 20); 

    var cltnViewer = new atb.viewer.CollectionViewer(
        layoutManager, 
        itemViewer,
        itemHoverViewer
    );

    loadData(ws, cltnViewer);
}


