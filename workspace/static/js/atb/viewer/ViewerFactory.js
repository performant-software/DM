goog.provide('atb.viewer.ViewerFactory');

//goog.require('atb.viewer.TextEditor');
//goog.require('atb.viewer.CanvasViewer');
// goog.require('atb.viewer.AudioViewer');

atb.viewer.ViewerFactory.createViewerForUri = function(uri, clientApp) {
    var databroker = clientApp.databroker;
    var resource = databroker.getResource(uri);

    var viewer = null;

    if (resource.hasType('dctypes:Text')) {
        viewer = new atb.viewer.TextEditor(clientApp);
    }
    else if (resource.hasAnyType(['sc:Canvas', 'dms:Canvas'])) {
        viewer = new atb.viewer.CanvasViewer(clientApp);
    }
    else if (resource.hasAnyType(['dctypes:Audio', 'dms:AudioSegment'])) {
        viewer = new atb.viewer.AudioViewer(clientApp);
    }
    else if (resource.hasAnyType('oa:SpecificResource')) {
        var selector = resource.getOneResourceByProperty('oa:hasSelector');

        if (selector.hasType('oa:TextQuoteSelector')) {
            viewer = viewer = new atb.viewer.TextEditor(clientApp);
        }
        else if (selector.hasType('oa:SvgSelector')) {
            viewer = new atb.viewer.CanvasViewer(clientApp);
        }
    }

    return viewer;
};

/**
 * Creates an appropriate viewer for the given resource
 *
 * @return {atb.viewer.Viewer}
 * @throws 'Unrecognized resource type'
 */
atb.viewer.ViewerFactory.createViewerForResource = function (resource, panel, clientApp) {
    var type = resource.getType();
    var id = resource.getId();
    
    var viewer = atb.viewer.ViewerFactory.createViewerForResourceType(type, clientApp);
    
    panel.setViewer(viewer);
    
    if (type == 'marker') {
        viewer.setResource(resource.getCanvasId());
        
        viewer.loadMarkerResource(resource);
        
//        var marker = viewer.getFeatureByResourceId(resource.getId());
//        var bounds = marker.geometry.getBounds();
//        window.setTimeout(function() {
//                          viewer.olViewer.zoomToExtent(bounds);
//                          }, 200);
    }
    else if (type == 'canvas') {
        viewer.setResource(id);
    }
    else if (type == 'text') {
        viewer.loadResourceById(resource.getId());
    }
    else if (type == 'textHighlight') {
        viewer.loadResourceById(resource.getTextId(), function () {
                                viewer.scrollIntoViewByResourceId(id);
                                });
    }
    
    else {
        throw 'Unrecognized resource type';
    }
    
    return viewer;
};