/*
 * @requires AnnotationToolbox.js
 * @requires BaseTypes/Class.js
 */

AnnotationToolbox.Size = AnnotationToolbox.Class({
    width: null,
    height: null,
    
    initialize: function(width, height) {
        this.width = width;
        this.height = height;
    },
});
