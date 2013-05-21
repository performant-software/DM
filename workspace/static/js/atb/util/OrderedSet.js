goog.provide('atb.util.OrderedSet');

goog.require('goog.structs.Set');
goog.require('goog.array');

/**
 * @class
 * Implements an Ordered Set data structure, using goog.structs.Set as its base
 *
 * @author  tandres@drew.edu (Tim Andres)
 */
atb.util.OrderedSet = function (opt_values, opt_uidFunction) {
    goog.structs.Set.call(this, opt_values);
    this.uidFunction = opt_uidFunction || goog.structs.Set.getKey_;
    
    this.keysInOrder_ = [];
    this.indexByKey_ = new goog.structs.Map();
};
goog.inherits(atb.util.OrderedSet, goog.structs.Set);

/**
 * Returns a uid key for any element
 */
atb.util.OrderedSet.prototype.getKey_ = function (element) {
    return this.uidFunction(element);
};

/**
 * Gets the index of the specified element in the ordered set
 * @return {Number}
 */
atb.util.OrderedSet.prototype.getIndexOfElement = function (element) {
    var index = this.indexByKey_.get(this.getKey_(element));
    
    if (index == null) {
        index = -1;
    }
    
    return index;
};

atb.util.OrderedSet.prototype.indexOf = atb.util.OrderedSet.prototype.getIndexOfElement;

/**
 * @inheritdoc
 */
atb.util.OrderedSet.prototype.contains = function (element) {
    return this.map_.containsKey(this.getKey_(element));
};

/**
 * Adds an element to the ordered set
 * O(1)
 *
 * @param element {*}
 */
atb.util.OrderedSet.prototype.add = function (element) {
    var key = this.getKey_(element);
    
    if (this.contains(element)) {
        this.remove(element);
    }
    
    this.keysInOrder_.push(key);
    this.indexByKey_.set(key, this.keysInOrder_.length - 1);
    
    this.map_.set(key, element);
};

/**
 * Removes an element from the ordered set
 * O(1)
 *
 * @param element {*}
 * @return {Boolean} true if the element was successfully removed
 */
atb.util.OrderedSet.prototype.remove = function (element) {
    var key = this.getKey_(element);
    
    goog.array.removeAt(this.keysInOrder_, this.indexByKey_.get(key));
    this.indexByKey_.remove(key);
    
    return this.map_.remove(this.getKey_(element));
};

/**
 * Clears all elements
 */
atb.util.OrderedSet.prototype.clear = function () {
    this.keysInOrder_ = [];
    this.indexByKey_.clear();
    goog.structs.Set.prototype.clear.call(this);
};

/**
 * Returns a list of the elements of this set in order
 * O(n)
 *
 * @return {Array}
 */
atb.util.OrderedSet.prototype.getValues = function () {
    var values = [];
    
    for (var i=0, len=this.keysInOrder_.length; i<len; i++) {
        var key = this.keysInOrder_[i];
        
        var value = this.map_.get(key);
        
        values.push(value);
    }
    
    return values;
};

/**
 * Returns a copy of this ordered set
 * O(n)
 *
 * @return {atb.util.OrderedSet}
 */
atb.util.OrderedSet.prototype.clone = function () {
    return new atb.util.OrderedSet(this.getValues());
};

/**
 * Returns true if every element of the comparison set is the same as those in this set, and are in the same order
 * O(n)
 *
 * @return {Boolean}
 */
atb.util.OrderedSet.prototype.equals = function (col) {
    return goog.structs.Set.prototype.equals.call(this, col) && goog.array.equals(this.keysInOrder_, col.keysInOrder_);
};

atb.util.OrderedSet.prototype.__iterator__ = function (opt_keys) {
    var i = 0;
    var keys = this.keysInOrder_;
    var map = this.map_.map_;
    var version = this.version_;
    var selfObj = this;
    
    var newIter = new goog.iter.Iterator;
    newIter.next = function() {
        while (true) {
            if (version != selfObj.version_) {
                throw Error('The map has changed since the iterator was created');
            }
            if (i >= keys.length) {
                throw goog.iter.StopIteration;
            }
            var key = keys[i++];
            return opt_keys ? key : map[goog.structs.Map.makeKey_(key)];
        }
    };
    return newIter;
};