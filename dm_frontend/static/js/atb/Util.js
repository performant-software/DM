goog.provide('atb.Util');


atb.Util.pipeline = function(f1, f2, opt_f1Scope, opt_f2Scope) {
    f1 = atb.Util.scopeAsyncHandler(f1, opt_f1Scope);
    f2 = atb.Util.scopeAsyncHandler(f2, opt_f2Scope);
    return function(input) {
        return f2(f1(input));
    }
}


atb.Util.scopeAsyncHandler = function(handler, opt_scope) {
    var scopedHandler = handler;

    if (opt_scope) {
        scopedHandler = function() {
            return handler.apply(opt_scope, arguments);
        }
    }

    return scopedHandler;
}

/**
 * Executes functions in a sequence of timeouts (useful for animation queues)
 * Delay times are specified in milliseconds, and can be either one time, or an array of times
 * (but the array size must be the same as the array of functions to execute).
 * Scope can also be either an object or an array, but the same size restricions apply.
 *
 * @param delayMS {Number | Array<Number>}
 * @param fns {Array<Function>}
 * @param opt_scope {Object | Array<Object>}
 */
atb.Util.timeoutSequence = function (delayMS, fns, opt_scope) {
    var sumDelays = 0;
    
    for (var i=0, len=fns.length; i<len; i++) {
        var fnI = fns[i];
        var delayI, scopeI;
        
        if (goog.isArray(delayMS))
            delayI = delayMS[i];
        else
            delayI = delayMS;
        
        if (goog.isArray(opt_scope))
            scopeI = opt_scope[i];
        else
            scopeI = opt_scope;
        
        window.setTimeout(atb.Util.scopeAsyncHandler(fnI, scopeI), delayI + sumDelays);
        
        sumDelays += delayI;
    }
};

/**
 * Runs a given function asynchronously using window.setTimeout.
 * @return {Number} the id returned by window.setTimeout
 */
atb.Util.runAsync = function (fn, opt_scope) {
    return window.setTimeout(atb.Util.scopeAsyncHandler(fn, opt_scope), 1);
};