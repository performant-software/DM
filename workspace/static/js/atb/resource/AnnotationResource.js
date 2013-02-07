goog.provide('atb.resource.AnnotationResource');

goog.require('atb.resource.Resource');

goog.require('goog.structs.Map');

/**
 * @constructor
 * @extends {atb.resource.Resource}
 */
atb.resource.AnnotationResource = function (remoteId, id) {
    atb.resource.Resource.call(this, remoteId, id, 'anno');
    
    this.bodies = [];
    this.triplesByBody = new goog.structs.Map();
    
    this.targets = [];
    this.triplesByTarget = new goog.structs.Map();
};
goog.inherits(atb.resource.AnnotationResource, atb.resource.Resource);

/**
 * Returns an array of the annotation's body ids
 * @return {Array.<string>}
 */
atb.resource.AnnotationResource.prototype.getBodyIds = function () {
    return this.bodies;
};

/**
 * Returns the first body id (in practice usually the only one)
 * @return {string}
 */
atb.resource.AnnotationResource.prototype.getBodyId = function () {
    return this.bodies[0];
};

/**
 * Returns an array of the annotation's target ids
 * @return {Array.<string>}
 */
atb.resource.AnnotationResource.prototype.getTargetIds = function () {
    return this.targets;
};

/**
 * Returns an array of the body and target ids
 * @return {Array.<string>}
 */
atb.resource.AnnotationResource.prototype.getChildIds = function () {
    return this.bodies.concat(this.targets);
};


/**
 * Returns a map object of annotation store triple ids by the bodies
 * they store, or optionally if a body is provided, the triple ids for that
 * body
 * @param opt_body {!string}
 * @return {goog.structs.Map | Array.<string>}
 */
atb.resource.AnnotationResource.prototype.getTriplesByBody = function (opt_body) {
    if (opt_body) {
        return this.triplesByBody.get(opt_body);
    }
    else {
        return this.triplesByBody;
    }
};

/**
 * Returns a map of annotation store triple ids by the targets
 * they store, or optionally if a body is provided, the triple ids for that
 * body
 * @param opt_target {!string}
 * @return {goog.structs.Map | Array.<string>}
 */
atb.resource.AnnotationResource.prototype.getTriplesByTarget = function (opt_target) {
    if (opt_target) {
        return this.triplesByTarget.get(opt_target);
    }
    else {
        return this.triplesByTarget;
    }
};

atb.resource.AnnotationResource.type = 'anno';