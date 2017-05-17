goog.provide('dm.util.Size');

dm.util.Size = function (width, height) {
    this.width = width;
    this.height = height;
};

dm.util.Size.prototype.getWidth = function () {
    return this.width;
};

dm.util.Size.prototype.getHeight = function () {
    return this.height;
};

dm.util.Size.prototype.setWidth = function (width) {
    this.width = width;
};

dm.util.Size.prototype.setHeight = function (height) {
    this.height = height;
};

dm.util.Size.prototype.equals = function(a, b) {
  if (a == b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return a.width == b.width && a.height == b.height;
};

dm.util.Size.prototype.clone = function () {
    return new dm.util.Size(this.width, this.height);
}

dm.util.Size.prototype.aspectRatio = function () {
    return this.width / this.height;
};

dm.util.Size.prototype.scaleByFactor = function (factor) {
    this.width *= factor;
    this.height *= factor;
    
    return this;
};

dm.util.Size.prototype.scaledByFactor = function (factor) {
    return this.clone().scaleByFactor(factor);
};

dm.util.Size.prototype.scaleToFit = function (targetSize) {
    var factor = this.aspectRatio() > targetSize.aspectRatio() ?
        targetSize.width / this.width :
        targetSize.height / this.height;
    
    return this.scaleByFactor(factor);
};

dm.util.Size.prototype.scaledToFit = function (targetSize) {
    return this.clone().scaleToFit(targetSize);
};

dm.util.Size.makeSize = function (sizeLikeObj) {
    return new dm.util.Size(sizeLikeObj.width, sizeLikeObj.height);
};

dm.util.Size.prototype.getShortest = function () {
    if (this.width > this.height) {
        return this.height;
    }
    else {
        return this.width;
    }
};

dm.util.Size.prototype.getLongest = function () {
    if (this.width > this.height) {
        return this.width;
    }
    else {
        return this.height;
    }
};
