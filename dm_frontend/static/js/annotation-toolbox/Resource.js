/*
 * @requires AnnotationToolbox.js
 * @requires BaseTypes/Class.js
 */
AnnotationToolbox.Resource = {};

AnnotationToolbox.Resource.Image = AnnotationToolbox.Class({
    id: null,
    size: null,

    initialize: function(id, size) {
        this.id = id;
        this.size = size;
    }
});


AnnotationToolbox.Resource.MetaData = AnnotationToolbox.Class({
    name: null,
    images: null,

    initialize: function(name) {
        this.name = name;
    },

    addImage: function(image) {
        if (images == null) {
            this.images = [image]; // If images is empty, sets it to an array of size 1 containing the specified image
        } else {
            this.images.push(image); // Adds the specified image to the array images
        }
    },

    addImages: function(images) {
		// I changed this implementation to cover the possibility of this.images being null
		if (this.images == null) {
			this.images = images;
		} else {
			for (image in images) {
				this.images.push(image); // Adds an array of images to the current 
			}
		}
    },
});


