goog.provide('atb.Annotation');

/** @deprecated */
atb.Annotation = function(ws, id, title, user, type) {
    this.ws = ws;
    this.id = id;
    this.title = title;
        
    this.user = user;
    this.bodies = new Array();
    this.targets = new Array();
    this.type = type;
};


atb.Annotation.prototype.addBody = function (body) {
	this.bodies.push(body);
};

atb.Annotation.prototype.addTarget = function (target) {
	this.targets.push(target);
};