goog.require('goog.math.Size');
goog.require('goog.events');

goog.require('atb.DMWebService');
goog.require('atb.viewer.CollectionViewer');
goog.require('atb.viewer.ItemViewer');
goog.require('atb.viewer.AnnoItemViewer');
goog.require('atb.viewer.AnnoDetailsViewer');
goog.require('atb.viewer.TiledLayoutManager');
goog.require('goog.ui.IdGenerator');

/*
goog.events.listen(
    dom,
    goog.events.EventType.CLICK,
    this.handleClick, 
    false, 
    this
);
    
atb.viewer.AnnoDetailsViewer.prototype.handleClick = function(event) {
    //console.log(event);
}
*/


loadData = function(ws, cltnViewer) {
    var annoIds = ['2262', '10270', '10706', '2153', '10376', '8629', '10365', '10245', '10753'];
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
    //console.log("here");
	var webServiceURI = 
        location.href.substring(0, location.href.lastIndexOf("/") + 1);
    var ws = new atb.DMWebService(webServiceURI);

    var itemSize = new goog.math.Size(154, 154);
    var itemViewer = 
        new atb.viewer.AnnoItemViewer(ws, itemSize, 300, 300);

    var hoverId = goog.ui.IdGenerator.instance.getNextUniqueId();
    var hoverViewer = 
        new atb.viewer.AnnoDetailsViewer(ws, hoverId, null, 300, 300);

    var layoutSize = new goog.math.Size(900,1600);
    var layoutManager = 
        new atb.viewer.TiledLayoutManager('items', layoutSize, 30); 

    var cltnViewer = new atb.viewer.CollectionViewer(
        layoutManager, 
        itemViewer,
        hoverViewer,
        function(id, item) {
            //console.log(id, item);
        }
    );

    loadData(ws, cltnViewer);
}


