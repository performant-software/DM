goog.provide('dm.viewer.ViewerFactory');

goog.require('dm.data.DataModel');

//goog.require('dm.viewer.TextEditor');
//goog.require('dm.viewer.CanvasViewer');
// goog.require('dm.viewer.AudioViewer');

dm.viewer.ViewerFactory.createViewerForUri = function(uri, clientApp) {
    var databroker = clientApp.databroker;
    var resource = databroker.getResource(uri);

    var viewer = null;

    if (resource.hasAnyType(dm.data.DataModel.VOCABULARY.textTypes)) {
        viewer = new dm.viewer.TextEditor(clientApp);
    }
    else if (resource.hasAnyType(dm.data.DataModel.VOCABULARY.canvasTypes)) {
        viewer = new dm.viewer.CanvasViewer(clientApp);
    }
    else if (resource.hasAnyType(['dctypes:Audio', 'dms:AudioSegment'])) {
        viewer = new dm.viewer.AudioViewer(clientApp);
    }
    else if (resource.hasAnyType('oa:SpecificResource')) {
        var selector = resource.getOneResourceByProperty('oa:hasSelector');

        if (selector.hasType('oa:TextQuoteSelector')) {
            viewer = viewer = new dm.viewer.TextEditor(clientApp);
        }
        else if (selector.hasType('oa:SvgSelector')) {
            viewer = new dm.viewer.CanvasViewer(clientApp);
        }
    }

    return viewer;
};