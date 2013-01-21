goog.provide('jquery.popout');
goog.require('jquery.hoverIntent');

/**
 * Based on an example from http://www.square-bracket.com/
 *
 * @author tandres@drew.edu (Tim Andres)
 *
 * Makes a div appear to pop out and expand when it is moused over, then
 * contract to it's normal size when the mouse leaves, much like Google Images'
 * hover effect
 */
(function ($, window) {
    var safeExecFunction = function (fn) {
        try {
            return fn();
        }
        catch (error) {
            if (console && $.isFunction(console.error)) {
                console.error(error);
            }
        }
    };
    
    $.fn.popout = function (user_opts) {
        return this.each(function () {
        	var originalElement = this;
            
            var opts = $.extend({
            	height: 0,
            	width: 0,
            	
                useId: 'jQuery-poppedOut-useId',
                speed: 200,
                delay: 300,
                body: $('body'),
                selectors: [],
                beforeShowBegin: $.noop,
                onShowBegin: $.noop,
                onShowEnd: $.noop,
                onHideBegin: $.noop,
                onHideEnd: $.noop,
                hideOnClick: true
            }, user_opts);
            
            var showSpeed = opts.speed;
            var hideSpeed = opts.speed / 2;
            
            var beginEffect = function () {
                safeExecFunction(opts.beforeShowBegin);
                
            	$('#'+opts.useId).fadeOut(opts.speed, function () {
            		$(this).remove();
            	});
            	
            	var $div = $(this).clone(true); // Clones event handlers too
                
                $div.unbind('mouseenter mouseleave mouseover mouseout');
                if (opts.hideOnClick) {
                    $div.bind('click', function(event) {
                        $div.trigger('mouseleave');
                    });
                }
                
                var offset = $(this).offset();
                
                $div.css({
                    'position': 'absolute',
                    'top': offset.top,
                    'left': offset.left,
                    'z-index': 100000
                });
                
                var oldDivCss = {
                    'width': $(this).width(),
                    'height': $(this).height(),
                    'top': offset.top,
                    'left': offset.left
                };
                
                $div.attr('id', opts.useId);
                
                opts.body.prepend($div);
                
                safeExecFunction(opts.onShowBegin);
                
                var newTop = offset.top - Math.abs($(this).height() - opts.height) / 2;
                var newLeft = offset.left - Math.abs($(this).width() - opts.width) / 2;
                
                if (newTop < $(window).scrollTop()) {
                	newTop = $(window).scrollTop();
                }
                else if (newTop + opts.height >
                         $(window).height() + $(window).scrollTop()) {
                	newTop = $(window).height() + $(window).scrollTop() - opts.height;
                }
                
                if (newLeft < $(window).scrollLeft()) {
                	newLeft = $(window).scrollLeft();
                }
                else if (newLeft + opts.width >
                         $(window).width() + $(window).scrollLeft()) {
                	newLeft = $(window).width() + $(window).scrollLeft() - opts.width;
                }
                
                $div.animate({
                    'top': newTop,
                    'left': newLeft,
                    'height': opts.height,
                    'width': opts.width
                }, showSpeed, function () {
                    safeExecFunction(opts.onShowEnd);
                });
                
                var oldCssBySelector = {};
                
                for (var i=0, len=opts.selectors.length; i<len; i++) {
                    var selectorObject = opts.selectors[i];
                    
                    for (var jQuerySelector in selectorObject) {
                        var cssObject = selectorObject[jQuerySelector];
                        var $selectedDiv = $div.find(jQuerySelector);
                        
                        var oldCss = {}
                        for (var property in cssObject) {
                            oldCss[property] = $selectedDiv.css(property);
                        }
                        
                        oldCssBySelector[jQuerySelector] = oldCss;
                        
                        $selectedDiv.stop();
                        $selectedDiv.animate(cssObject, showSpeed);
                    }
                }
                
                /**
                 * An unfortunately necessary hack to catch the mouse leaving
                 * even when it moves very quickly
                 */
                var onWindowMouseMove = function (event) {
                    var x = event.pageX, y = event.pageY;
                    
                    var offset = $div.offset();
                    
                    var top = offset.top, left = offset.left;
                    var bottom = top + $div.outerHeight(), right = left + $div.outerWidth();
                    
                    if ((x < left || x > right) || (y < top || y > bottom)) {
                        $div.trigger('mouseleave');
                    }
                };
                $(window).bind('mousemove', onWindowMouseMove);
                
                $div.mouseleave(function (event) {
                    safeExecFunction(opts.onHideBegin);
                    
                    $(window).unbind('mousemove', onWindowMouseMove);
                    
                    
                    $div.stop();
                    $(this).animate(oldDivCss, hideSpeed, function () {
                        $(this).remove();
                        
                        safeExecFunction(opts.onHideEnd);
                    });
                    
                    for (var selector in oldCssBySelector) {
                    	var cssObject = oldCssBySelector[selector];
                    	var $selectedObject = $div.find(selector);
                    	
                    	$selectedObject.stop();
                    	$selectedObject.animate(cssObject, hideSpeed);
                    }
                });
                
                $div.one('mousewheel', function (event) {
                    $div.trigger('mouseleave');
                });
            };
            
			$(this).hoverIntent({
				over: beginEffect,
				out: $.noop,
				interval: opts.delay
			});
        });
    };
})(jQuery, window);