goog.provide('dm.util.DeferredCollection');

/**
 * @constructor
 *
 * Aggregates jQuery.defferred objects and allows for group operations on them
 * (like jQuery.when(), but with finer control)
 * Provides an allComplete handler, which is called even if some of the deferreds fail
 *
 * @param {?Array.<jQuery.deferred>} opt_deferreds
 */
dm.util.DeferredCollection = function(opt_deferreds) {
    if (opt_deferreds)
        this.addAll(opt_deferreds);

    this.deferreds = [];
    this.resolvedDeferreds = [];
    this.failedDeferreds = [];

    this.singleDoneCallbacks = [];
    this.singleFailCallbacks = [];
    this.singleProgressCallbacks = [];

    this.allResolvedCallbacks = [];
    this.allCompleteCallbacks = [];
    this.allFailedCallbacks = [];
};

/**
 * @param {jQuery.deferred} deferred
 */
dm.util.DeferredCollection.prototype.add = function(deferred) {
    this.deferreds.push(deferred);

    this.setupCallbacks_(deferred);
};

/**
 * @param {Array.<jQuery.deferred>} deferreds
 */
dm.util.DeferredCollection.prototype.addAll = function(deferreds) {
    for (var i = 0, len = deferreds.length; i < len; i++) {
        this.add(deferreds[i]);
    }
};

/**
 * Adds a callback for when a single deferred object resolves
 */
dm.util.DeferredCollection.prototype.singleDone = function(callback) {
    this.singleDoneCallbacks.push(callback);

    return this;
};

/**
 * Adds a callback for when a single deferred object fails
 */
dm.util.DeferredCollection.prototype.singleFail = function(callback) {
    this.singleFailCallbacks.push(callback);

    return this;
};

/**
 * Adds a callback for when a single deferred object notifies a progress event
 */
dm.util.DeferredCollection.prototype.singleProgress = function(callback) {
    this.singleProgressCallbacks.push(callback);

    return this;
};

/**
 * Adds a callback function to be called when all deferreds are successfully resolved
 * @param {function(Array.<jQuery.deferred>, dm.util.DeferredCollection)} callback
 */
dm.util.DeferredCollection.prototype.allResolved = function(callback) {
    this.allResolvedCallbacks.push(callback);

    if (this.areAllResolved()) {
        window.setTimeout(jQuery.proxy(function() {
            callback(this.deferreds, this);
        }, this), 1);
    }

    return this;
};

/**
 * Adds a callback function to be called when all deferreds are individually either resolved or failed, but not pending
 * @param {function(Array.<jQuery.deferred>, dm.util.DeferredCollection)} callback
 */
dm.util.DeferredCollection.prototype.allComplete = function(callback) {
    this.allCompleteCallbacks.push(callback);

    if (this.areAllComplete()) {
        window.setTimeout(jQuery.proxy(function() {
            callback(this.deferreds, this);
        }, this), 1);
    }

    return this;
};

/**
 * Adds a callback function to be called when all deferreds fail
 * @param {function(Array.<jQuery.deferred>, dm.util.DeferredCollection)} callback
 */
dm.util.DeferredCollection.prototype.allFailed = function(callback) {
    this.allFailedCallbacks.push(callback);

    if (this.areAllFailed()) {
        window.setTimeout(jQuery.proxy(function() {
            callback(this.deferreds, this);
        }, this), 1);
    }

    return this;
};

/**
 * Returns whether all deferreds are individually either resolved or failed, but not pending
 */
dm.util.DeferredCollection.prototype.areAllComplete = function() {
    return this.deferreds.length == this.resolvedDeferreds.length + this.failedDeferreds.length;
};

/**
 * Returns whether all deferreds are resolved
 */
dm.util.DeferredCollection.prototype.areAllResolved = function() {
    return this.deferreds.length == this.resolvedDeferreds.length;
};

/**
 * Returns whether all deferreds are failed
 */
dm.util.DeferredCollection.prototype.areAllFailed = function() {
    return this.deferreds.length == this.failedDeferreds.length;
};



/**
 * @private
 */
dm.util.DeferredCollection.prototype.callAllDoneCallbacks_ = function(scope, args) {
    for (var i = 0, len = this.singleDoneCallbacks.length; i < len; i++) {
        var callback = this.singleDoneCallbacks[i];

        window.setTimeout(function() {
            callback.apply(scope, args);
        }, 1);
    }

    if (this.areAllResolved()) {
        for (var i = 0, len = this.allResolvedCallbacks.length; i < len; i++) {
            var callback = this.allResolvedCallbacks[i];

            window.setTimeout(jQuery.proxy(function() {
                callback(this.deferreds, this);
            }, this), 1);
        }
    }
    if (this.areAllComplete()) {
        for (var i = 0, len = this.allCompleteCallbacks.length; i < len; i++) {
            var callback = this.allCompleteCallbacks[i];

            window.setTimeout(jQuery.proxy(function() {
                callback(this.deferreds, this);
            }, this), 1);
        }
    }
};

/**
 * @private
 */
dm.util.DeferredCollection.prototype.callAllFailedCallbacks_ = function(scope, args) {
    for (var i = 0, len = this.singleFailCallbacks.length; i < len; i++) {
        var callback = this.singleFailCallbacks[i];

        window.setTimeout(function() {
            callback.apply(scope, args);
        }, 1);
    }

    if (this.areAllComplete()) {
        for (var i = 0, len = this.allCompleteCallbacks.length; i < len; i++) {
            var callback = this.allCompleteCallbacks[i];

            window.setTimeout(jQuery.proxy(function() {
                callback(this.deferreds, this);
            }, this), 1);
        }
    }

    if (this.areAllFailed()) {
        for (var i = 0, len = this.allFailedCallbacks.length; i < len; i++) {
            var callback = this.allFailedCallbacks[i];

            window.setTimeout(jQuery.proxy(function() {
                callback(this.deferreds, this);
            }, this), 1);
        }
    }
};

/**
 * @private
 */
dm.util.DeferredCollection.prototype.callAllProgressCallbacks_ = function(scope, args) {
    for (var i = 0, len = this.singleProgressCallbacks.length; i < len; i++) {
        var callback = this.singleProgressCallbacks[i];

        window.setTimeout(function() {
            callback.apply(scope, args);
        }, 1);
    }
};

/**
 * @private
 */
dm.util.DeferredCollection.prototype.setupCallbacks_ = function(deferred) {
    var self = this;

    deferred.done(function() {
        self.resolvedDeferreds.push(this);

        self.callAllDoneCallbacks_(this, arguments);
    });

    deferred.fail(function() {
        self.failedDeferreds.push(this);

        self.callAllFailedCallbacks_(this, arguments);
    });

    deferred.progress(function() {
        self.callAllProgressCallbacks_(this, arguments);
    });
};
