goog.provide('dm.util.DefaultDict');

goog.require('goog.structs.Map');
goog.require('goog.structs.Set');

/**
 * @class
 * A default dictionary based on python's collections.defaultdict
 *
 * @author tandres@drew.edu (Tim Andres)
 * 
 * @extends {goog.structs.Map}
 * 
 * @param generator {function:Object} A function which will return the default value for the dictionary
 * @param opt_map {?Object} A javascript object map/dictionary to use for the initial values
 */
dm.util.DefaultDict = function (generator, opt_map) {
    goog.structs.Map.call(this, opt_map);
    
    this.generator = generator;
};
goog.inherits(dm.util.DefaultDict, goog.structs.Map);

/**
 * @override
 */
dm.util.DefaultDict.prototype.equals = function (otherMap, opt_equalityFn) {
    return goog.structs.Map.prototype.equals.call(this, otherMap, opt_equalityFn) && otherMap.generator === this.generator;
};

/**
 * Gets the value stored for the given key, or the default value
 * If opt_readOnly is true, the default value will not be added to the map (and any changes made
 * to the returned object will not be saved by the dictionary)
 */
dm.util.DefaultDict.prototype.get = function (key, opt_readOnly) {
    if (this.containsKey(key)) {
        return goog.structs.Map.prototype.get.call(this, key);
    }
    else if (opt_readOnly) {
        return this.generator();
    }
    else {
        this.set(key, this.generator());
        
        return goog.structs.Map.prototype.get.call(this, key);
    }
};

dm.util.DefaultDict.prototype.clone = function () {
    return new dm.util.DefaultDict(this.generator, this.map_);
};

dm.util.DefaultDict.prototype.transpose = function () {
    var map = goog.structs.Map.prototype.transpose.call(this);
    
    return new dm.util.DefaultDict(this.generator, map);
};

dm.util.DefaultDict.GENERATORS = {
    list: function () {
        return [];
    },
    object: function () {
        return {};
    },
    string: function () {
        return '';
    },
    zero: function () {
        return 0;
    },
    set: function () {
        return new goog.structs.Set();
    }
};