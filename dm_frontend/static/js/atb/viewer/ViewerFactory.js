goog.provide('atb.viewer.ViewerFactory');

//goog.require('atb.viewer.Editor');
//goog.require('atb.viewer.CanvasViewer');

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

atb.viewer.ViewerFactory.createViewerForResourceType = function (type, clientApp) {
    var viewer;
    
    if (type == 'marker') {
        viewer = new atb.viewer.StandardSimpleMarkerEditor(clientApp);
        
    }
    else if (type == 'canvas') {
        viewer = new atb.viewer.StandardSimpleMarkerEditor(clientApp);
    }
    else if (type == 'text') {
        viewer = new atb.viewer.Editor(clientApp);
    }
    else if (type == 'textHighlight') {
        viewer = new atb.viewer.Editor(clientApp);
    }
    
    else {
        throw 'Unrecognized resource type';
    }
    
    return viewer;
};