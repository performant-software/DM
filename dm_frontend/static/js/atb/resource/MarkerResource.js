goog.provide('atb.resource.MarkerResource');

goog.require('atb.resource.Resource');

atb.resource.MarkerResource = function (remoteId, id) {
    atb.resource.Resource.call(this, remoteId, id, 'marker');
    
    this.shapeType = '';
    this.canvasId = '';
    this.shapeData = {};
};
goog.inherits(atb.resource.MarkerResource, atb.resource.Resource);

atb.resource.MarkerResource.prototype.getShapeType = function () {
    return this.shapeType || this.shapeData.shapeType;
};

atb.resource.MarkerResource.prototype.getShapeData = function () {
    return this.shapeData;
};

atb.resource.MarkerResource.prototype.getCanvasId = function () {
    return this.canvasId;
};

atb.resource.MarkerResource.type = 'marker';

goog.provide('atb.resource.MarkerResource.shapes');
atb.resource.MarkerResource.shapes = {
    point: 'point',
    line: 'line',
    polygon: 'polygon'
};