goog.provide('sc.util.Size');

sc.util.Size = function (width, height) {
    this.width = width;
    this.height = height;
};

sc.util.Size.prototype.getWidth = function () {
    return this.width;
};

sc.util.Size.prototype.getHeight = function () {
    return this.height;
};

sc.util.Size.prototype.setWidth = function (width) {
    this.width = width;
};

sc.util.Size.prototype.setHeight = function (height) {
    this.height = height;
};

sc.util.Size.prototype.equals = function(a, b) {
  if (a == b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return a.width == b.width && a.height == b.height;
};

sc.util.Size.prototype.clone = function () {
    return new sc.util.Size(this.width, this.height);
}

sc.util.Size.prototype.aspectRatio = function () {
    return this.width / this.height;
};

sc.util.Size.prototype.scaleByFactor = function (factor) {
    this.width *= factor;
    this.height *= factor;
    
    return this;
};

sc.util.Size.prototype.scaledByFactor = function (factor) {
    return this.clone().scaleByFactor(factor);
};

sc.util.Size.prototype.scaleToFit = function (targetSize) {
    var factor = this.aspectRatio() > targetSize.aspectRatio() ?
        targetSize.width / this.width :
        targetSize.height / this.height;
    
    return this.scaleByFactor(factor);
};

sc.util.Size.prototype.scaledToFit = function (targetSize) {
    return this.clone().scaleToFit(targetSize);
};

sc.util.Size.makeSize = function (sizeLikeObj) {
    return new sc.util.Size(sizeLikeObj.width, sizeLikeObj.height);
};

sc.util.Size.prototype.getShortest = function () {
    if (this.width > this.height) {
        return this.height;
    }
    else {
        return this.width;
    }
};

sc.util.Size.prototype.getLongest = function () {
    if (this.width > this.height) {
        return this.width;
    }
    else {
        return this.height;
    }
};
