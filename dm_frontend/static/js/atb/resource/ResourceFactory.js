goog.provide('atb.resource.ResourceFactory');

goog.require('atb.resource.AnnotationResource');
goog.require('atb.resource.CanvasResource');
goog.require('atb.resource.ManuscriptResource');
goog.require('atb.resource.MarkerResource');
goog.require('atb.resource.TextResource');
goog.require('atb.resource.TextHighlightResource');
goog.require('atb.resource.UserResource');

atb.resource.ResourceFactory.createFromJSON = function (json) {
    var resource = null;
    var type = json.type;
    
    if (type == 'anno') {
        resource = atb.resource.ResourceFactory.createAnnotationFromJSON(json);
    }
    else if (type == 'canvas') {
        resource = atb.resource.ResourceFactory.createCanvasFromJSON(json);
    }
    else if (type == 'marker') {
        resource = atb.resource.ResourceFactory.createMarkerFromJSON(json);
    }
    else if (type == 'manuscript') {
        resource = atb.resource.ResourceFactory.createManuscriptFromJSON(json);
    }
    else if (type == 'text') {
        resource = atb.resource.ResourceFactory.createTextFromJSON(json);
    }
    else if (type == 'textHighlight') {
        resource = atb.resource.ResourceFactory.createTextHighlightFromJSON(json);
    }
    else if (type == 'user') {
        resource = atb.resource.ResourceFactory.createUserFromJSON(json);
    }
    
    resource = resource || {};
    resource.rawJSON = json;
    
    return resource;
};

atb.resource.ResourceFactory.createAnnotationFromJSON = function (json) {
    var annotation = new atb.resource.AnnotationResource(json.id, json.id);
    
    annotation.bodies = json.anno.bodies;
    annotation.targets = json.anno.targets;
    
    annotation.triplesByBody = new goog.structs.Map(json.anno.triples_by_body);
    annotation.triplesByTarget = new goog.structs.Map(json.anno.triples_by_target);
    
    annotation.user = json.user;
    
    return annotation;
};

atb.resource.ResourceFactory.createCanvasFromJSON = function (json) {
    var canvas = new atb.resource.CanvasResource(json.id, json.id);
    
    canvas.user = json.user;
    canvas.title = json.name;
    
    canvas.markerIds = json.markers;
    canvas.annoIds = json.annos;
    
    canvas.thumb = json.thumb;
    
    canvas.height = json.height;
    canvas.width = json.width;
    
    canvas.defaultImage = json.defaultImage;
    
    canvas.images = new goog.structs.Map(json.images);
    
    return canvas;
};

atb.resource.ResourceFactory.createManuscriptFromJSON = function (json) {
    var manuscript = new atb.resource.ManuscriptResource(json.id, json.id);
    
    manuscript.user = json.user;
    manuscript.title = json.manuscript.title;
    manuscript.annoIds = json.annos;
    
    manuscript.pages = json.manuscript.pages;
    
    return manuscript;
};

atb.resource.ResourceFactory.createMarkerFromJSON = function (json) {
    var marker = new atb.resource.MarkerResource(json.id, json.id);
    
    marker.user = json.user;
    marker.annoIds = json.annos;
    
    marker.shapeType = json.shape;
    
    marker.shapeData = json.circle || json.polyline || json.polygon;
    marker.canvasId = json.canvas;
    
    return marker;
};

atb.resource.ResourceFactory.createTextFromJSON = function (json) {
    var text = new atb.resource.TextResource(json.id, json.id);
    
    text.user = json.user;
    text.annoIds = json.annos;
    text.title = json.text.title;
    
    text.contents = json.text.content;
    text.highlightIds = json.text.highlights;
    text.annoIdsAsBody = json.annosAsBody;
    text.purpose = json.text.purpose;
    
    return text;
};

atb.resource.ResourceFactory.createTextHighlightFromJSON = function (json) {
    var highlight = new atb.resource.TextHighlightResource(json.id, json.id);
    
    highlight.user = json.user;
    highlight.annoIds = json.annos;
    
    highlight.contents = json.textHighlight.html;
    highlight.textId = json.text;
    highlight.annoIdsAsBody = json.annosAsBody;
    highlight.textTitle = json.textTitle;
    
    return highlight;
};

atb.resource.ResourceFactory.createUserFromJSON = function (json) {
    var user = new atb.resource.UserResource(json.id, json.id);
    
    user.canvasIds = json.user.canvases;
    user.markerIds = json.user.markers;
    user.textIds = json.user.texts;
    user.textHighlightIds = json.user.textHighlights;
    user.annoIds = json.user.annos;
    user.manuscriptIds = json.user.manuscripts;
    
    return user;
};





atb.resource.ResourceFactory.createFromOAC = function (oac) {
    
};




atb.resource.ResourceFactory.serializeToJSON = function (resource) {
    var json = {};
    var type = resource.getType();
    
    if (type == 'anno') {
        json = atb.resource.ResourceFactory.serializeAnnotationToJSON(resource);
    }
    else if (type == 'canvas') {
        json = atb.resource.ResourceFactory.serializeCanvasToJSON(resource);
    }
    else if (type == 'marker') {
        json = atb.resource.ResourceFactory.serializeMarkerToJSON(resource);
    }
    else if (type == 'manuscript') {
        json = atb.resource.ResourceFactory.serializeManuscriptToJSON(resource);
    }
    else if (type == 'text') {
        json = atb.resource.ResourceFactory.serializeTextToJSON(resource);
    }
    else if (type == 'textHighlight') {
        json = atb.resource.ResourceFactory.serializeTextHighlightToJSON(resource);
    }
    else if (type == 'user') {
        json = atb.resource.ResourceFactory.serializeUserToJSON(resource);
    }
    
    return json;
};

atb.resource.ResourceFactory.serializeToJSONString = function (resource) {
    return JSON.stringify(atb.resource.ResourceFactory.serializeToJSON(resource));
};

atb.resource.ResourceFactory.serializeAnnotationToJSON = function (annotation) {
    var json = {};
    
    json.id = annotation.getRemoteId();
    
    json.type = 'anno';
    
    json.anno = {};
    json.anno.bodies = annotation.getBodyIds();
    json.anno.targets = annotation.getTargetIds();
    
    var triplesByBody = annotation.getTriplesByBody().toObject();
    var triplesByTarget = annotation.getTriplesByTarget().toObject();
    json.anno.triples_by_body = triplesByBody;
    json.anno.triples_by_target = triplesByTarget;
    
    json.user = annotation.getUser();
    
    return json;
};

atb.resource.ResourceFactory.serializeCanvasToJSON = function (canvas) {
    var json = {};
    
    json.id = canvas.getRemoteId();
    
    json.type = 'canvas';
    
    json.user = canvas.getUser();
    json.name = canvas.getTitle();
    
    json.markers = canvas.getMarkerIds();
    json.annos = canvas.getAnnoIds();
    
    json.thumb = canvas.getThumbInfo();
    
    json.height = canvas.getHeight();
    json.width = canvas.getWidth();
    
    json.defaultImage = canvas.getDefaultImageId();
    
    json.images = canvas.getImages().toObject();
    
    return json;
};

atb.resource.ResourceFactory.serializeManuscriptToJSON = function (manuscript) {
    var json = {};
    
    json.id = manuscript.getRemoteId();
    
    json.type = 'manuscript';
    
    json.manuscript = {};
    
    json.user = manuscript.getUser();
    json.manuscript.title = manuscript.getTitle();
    json.annos = manuscript.getAnnoIds();
    
    json.manuscript.pages = manuscript.getPages();
    
    return json;
};

atb.resource.ResourceFactory.serializeMarkerToJSON = function (marker) {
    var json = {};
    
    json.id = marker.getRemoteId();
    
    json.type = 'marker';
    
    //    json.user = marker.getUser()
    //    json.annos = marker.getAnnoIds();
    
    var shape = marker.getShapeType();
    json.shape = shape;
    
    if (shape == 'point') {
        json.circle = marker.getShapeData();
    }
    else if (shape == 'line') {
        json.polyline = marker.getShapeData();
    }
    else if (shape == 'polygon') {
        json.polygon = marker.getShapeData();
    }
    
    json.canvas = marker.getCanvasId();
    
    return json;
};

atb.resource.ResourceFactory.serializeTextToJSON = function (text) {
    var json = {};
    
    json.id = text.getRemoteId();
    
    json.type = 'text';
    
    //    json.user = text.getUser();
    //    json.annos = text.getAnnoIds();
    
    json.text = {};
    json.text.title = text.getTitle();
    json.text.content = text.getContents();
    //    json.text.highlights = text.getHighlightIds();
    //    json.annosAsBody = text.getAnnoIdsAsBody();
    json.text.purpose = text.getPurpose();
    
    return json;
};

atb.resource.ResourceFactory.serializeTextHighlightToJSON = function (highlight) {
    var json = {};
    
    json.type = 'textHighlight';
    
    json.id = highlight.getRemoteId();
    
    json.user = highlight.getUser();
    json.annos = highlight.getAnnoIds();
    
    json.textHighlight = {};
    
    json.textHighlight.html = highlight.getContents();
    json.textHighlight.text = highlight.getTextId();
    json.annosAsBody = highlight.getAnnoIdsAsBody();
    json.textTitle = highlight.getTextTitle();
    
    return json;
};

atb.resource.ResourceFactory.serializeUserToJSON = function (user) {
    var json = {};
    
    json.id = user.getRemoteId();
    
    json.type = 'user';
    
    json.user = {};
    
    json.user.canvases = user.getCanvasIds();
    json.user.markers = user.getMarkerIds();
    json.user.texts = user.getTextIds();
    json.user.textHighlights = user.getTextHighlightIds();
    json.user.annos = user.getAnnoIds();
    json.user.manuscrips = user.getManuscriptIds();
    
    return json;
};