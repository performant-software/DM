goog.provide('atb.resource.MetaData');


atb.resource.MetaData = function(name) {
    this.name = name;
    this.images = null;
};


atb.resource.MetaData.prototype.addImage = function(image) {
    if (images == null) {
        this.images = [image]; 
    } else {
        this.images.push(image);
    }
};


atb.resource.MetaData.prototype.addImages = function(images) {
	if (this.images == null) {
		this.images = images;
	} else {
		for (image in images) {
			this.images.push(image);
		}
	}
};



