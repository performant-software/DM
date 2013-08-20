goog.provide('atb.viewer.ViewerFactory');

goog.require('sc.data.DataModel');

//goog.require('atb.viewer.TextEditor');
//goog.require('atb.viewer.CanvasViewer');
// goog.require('atb.viewer.AudioViewer');

atb.viewer.ViewerFactory.createViewerForUri = function(uri, clientApp) {
    var databroker = clientApp.databroker;
    var resource = databroker.getResource(uri);

    var viewer = null;

    if (resource.hasAnyType(sc.data.DataModel.VOCABULARY.textTypes)) {
        viewer = new atb.viewer.TextEditor(clientApp);
    }
    else if (resource.hasAnyType(sc.data.DataModel.VOCABULARY.canvasTypes)) {
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