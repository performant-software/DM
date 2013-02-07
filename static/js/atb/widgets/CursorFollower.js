goog.provide('atb.widgets.CursorFollower');

goog.require('goog.dom');
goog.require('jquery.jQuery');
goog.require('goog.events');

atb.widgets.CursorFollower = function (followerCssClass) {
	this.div = goog.dom.createElement('div');
	jQuery(this.div).addClass(followerCssClass);
	document.body.appendChild(this.div);
	
	this.div.style.zindex = 10000;
	this.div.style.position = 'absolute';
	
	goog.events.listen(document.body, goog.events.EventType.MOUSEMOVE, this.updatePosition, false, this);
	goog.events.listen(window, goog.events.EventType.SCROLL, this.updatePosition, false, this);
};

atb.widgets.CursorFollower.prototype.updatePosition = function (event) {
	var x = event.clientX + jQuery(window).scrollLeft();
	var y = event.clientY + jQuery(window).scrollTop();
	
	x = x + 10;
	y = y + 10;
	
	this.updatePositionInternal_(x,y);
	
	//Hack:
	var iframes = document.getElementsByTagName('iframe');
	
	for (var x in iframes) {
		var iframe = iframes[x];
		
		if (!goog.events.hasListener(iframe, goog.events.EventType.MOUSEMOVE) && iframe.contentWindow) {
			goog.events.listen(iframe.contentWindow, goog.events.EventType.MOUSEMOVE, function (event) {
				this.updatePositionForIframe(iframes[x], event);
			}, false, this);
			goog.events.listen(iframe.contentWindow, goog.events.EventType.SCROLL, function (event) {
				this.updatePositionForIframe(iframes[x], event);
			}, false, this);
		}
	}
};

atb.widgets.CursorFollower.prototype.updatePositionForIframe = function (iframe, event) {
	if(!iframe) {
		return;
	}
	
	var x = event.clientX + jQuery(window).scrollLeft();
	var y = event.clientY + jQuery(window).scrollTop();
	
	var iframeOffset = jQuery(iframe).offset();
	
	x += iframeOffset.left;
	y += iframeOffset.right;
	
	x += 10;
	y += 10;
	
	this.updatePositionInternal_(x,y);
};

atb.widgets.CursorFollower.prototype.updatePositionInternal_ = function (x,y) {
	var divCoords = goog.style.getPosition(this.div);
	var divX = divCoords.x;
	var divY = divCoords.y;
	
	goog.style.setPosition(this.div, x, y);
};

atb.widgets.CursorFollower.prototype.stop = function () {
	goog.events.unlisten(document.body, goog.events.EventType.MOUSEMOVE, false, this.updatePosition);
	goog.events.unlisten(window, goog.events.EventType.SCROLL, false, this.updatePosition);
};