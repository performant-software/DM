goog.provide('sc.util.stats');

goog.require('goog.array');

/**
 * Calculates the mean (average) of a list of values
 * @param list {Array.<Number>}
 * @return {Number}
 */
sc.util.stats.mean = function (list) {
    var sum = 0;
    
    for (var i=0, len=list.length; i<len; i++) {
        var value = list[i];
        
        sum += value;
    }
    
    return sum / list.length;
};

/**
 * Calculates the Standard Deviation of a list of values
 * @param list {Array.<Number>}
 * @return {Number}
 */
sc.util.stats.standardDeviation = function (list) {
    var mean = sc.util.stats.mean(list);
    
    var sumSquaredDeviations = 0;
    
    for (var i=0, len=list.length; i<len; i++) {
        var value = list[i];
        
        var deviation = mean - value;
        sumSquaredDeviations += Math.pow(deviation, 2);
    }
    
    return Math.sqrt(sumSquaredDeviations / list.length);
};

/**
 * Returns the median of a list of values, not modifying the list by default
 * If it is not necessary to maintain the order of the given list, opt_allowSortInPlace
 * should be set to true for added efficiency
 * @param list {Array.<Number>}
 * @param opt_allowSortInPlace {?boolean} If true, the list will be modified during sorting
 * @return {Number}
 */
sc.util.stats.median = function (list, opt_allowSortInPlace) {
    var sorted;
    if (opt_allowSortInPlace) {
        sorted = list.sort();
    }
    else {
        sorted = goog.array.clone(list).sort();
    }
    
    return sorted[Math.floor(sorted.length / 2)];
};

sc.util.stats.zScore = function (value, mean, standardDeviation) {
    return (value - mean) / standardDeviation;
};