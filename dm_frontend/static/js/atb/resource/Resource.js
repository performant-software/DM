goog.provide('atb.resource.Resource');

/**
 * Base data representation of a DM resource
 * 
 * @constructor
 * @abstract
 * @author tandres@drew.edu (Tim Andres)
 */
atb.resource.Resource = function (remoteId, id, type) {
    this.remoteId = remoteId;
    this.id = id;
    this.type = type;
    this.title = '';
    this.modified = false;
    this.user = '';
    this.annoIds = [];
};

/**
 * @return {string}
 */
atb.resource.Resource.prototype.getType = function () {
    return this.type;
};

/**
 * @return {string} the remote server id for this resource
 */
atb.resource.Resource.prototype.getRemoteId = function () {
    return this.remoteId;
};

/**
 * @return {string} the local id for this resource if it exists, or the remote id
 */
atb.resource.Resource.prototype.getId = function () {
    return this.id;
};

/**
 * @return {string} the title of this resource
 */
atb.resource.Resource.prototype.getTitle = function () {
    return this.title;
};

/**
 * Sets the title of the resource
 * @param title {string}
 */
atb.resource.Resource.prototype.setTitle = function (title) {
    this.title = '' + title;
    this.markAsModified();
};

/**
 * Returns true if the resource has been marked as modified
 * @return {boolean}
 */
atb.resource.Resource.prototype.isModified = function () {
    return this.modified;
};

/**
 * Marks this resource as modified
 */
atb.resource.Resource.prototype.markAsModified = function () {
    this.modified = true;
};

/**
 * Sets the modified flag on this resource
 * 
 * @param modified {boolean}
 */
atb.resource.Resource.prototype.setModified = function (modified) {
    this.modified = !! modified;
};

/**
 * Should return the ids of all resources which would structurally be
 * considered children of this resource
 * @abstract
 * @return {Array.<string>}
 */
atb.resource.Resource.prototype.getChildIds = function () {
    return [];
};

/**
 * Should return the id of the resource which would structurally be
 * considered the parent of this resource, e.g., returns the canvas on which
 * a marker is located
 * @abstract
 * @return {string}
 */
atb.resource.Resource.prototype.getParentId = function () {
    return this.id;
};

/**
 * Returns the username of the user who created this resource
 * @return {string}
 */
atb.resource.Resource.prototype.getUser = function () {
    return this.user;
};

/**
 * Returns the ids of annotations which reference this resource
 */
atb.resource.Resource.prototype.getAnnoIds = function () {
    return this.annoIds;
}; 
