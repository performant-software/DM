goog.provide('dm.Array');

dm.Array.removeElement = function (array, element) {
    var index = array.indexOf(element);
    
    if (index == -1) {
        return false
    }
    else {
        array.splice(index, 1);
        return true;
    }
};
