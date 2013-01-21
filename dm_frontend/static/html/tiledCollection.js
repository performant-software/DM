goog.require('goog.math.Size');
goog.require('goog.events');

goog.require('atb.DMWebService');
goog.require('atb.viewer.CollectionViewer');
goog.require('atb.viewer.ItemViewer');
goog.require('atb.viewer.AnnoItemViewer');
goog.require('atb.viewer.TiledLayoutManager');


loadData = function(ws, cltnViewer) {
    var annoIds = ['12', '123', '1234', '12', '123', '1234', '12', '123', '1234', '12', '123', '1234', '12', '123', '1234', '12', '123', '1234'];
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

    var itemSize = new goog.math.Size(200, 170);
    var itemViewer = 
        new atb.viewer.AnnoItemViewer(itemSize, ws, 300, 300, 150);

    var layoutSize = new goog.math.Size(800,1600);
    var layoutManager = 
        new atb.viewer.TiledLayoutManager('items', layoutSize); 

    var cltnViewer = new atb.viewer.CollectionViewer(layoutManager, itemViewer);

    loadData(ws, cltnViewer);
}


