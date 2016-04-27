goog.provide('atb.ui.WindowScaler');

/**
 * Window scaling library to help us auto set heights of pieces on some of our layouts
 * Also it will help us truncate some strings to fit in narrow spaces
 * @constructor
 */
atb.ui.WindowScaler = function (scalingRules) {
    /* example rules - set an object to resize if possible with option to reduce overall height by an extra offset */
    /*
    scalingRules = {
        screenBottom: 50,  // extra space before the bottom of the screen
        elements: [
            // ['str-css-class-name-or-id', 'int-extra-bottom-offset']
            ['.atb-wrapper', 0],
            ['.atb-wrapper-inner', 0],
            ['.atb-resourceviewer', 5],
            ['.atb-markereditor-pane', 5],
            ['.editable', 5]
        ],
        truncate: true,  // enables tab adjustment on resize
        tabs: [
            // ['str-id']
            ['#leftTab'],
            ['#rightTab']
        ]
    };
    */

    /*

    We wait 100 ms to actually fire off resize...

    If before that 100 ms is up we call resize again then we ignore
    the previous requests and start over waiting again.

    This improves performance of resizing by not making wasteful
    resize requests...

    */

    this.scalingRules = scalingRules;
    this.resizeTimer = "";

    this.scale();
};

/**
 * Handles resizing pieces of the UI
 */
atb.ui.WindowScaler.prototype.scale = function () {

    var rules = this.scalingRules;
    var windowHeight = jQuery(window).height();
	//debugPrint("windowHeight: "+windowHeight);
    var screenBottom = rules.screenBottom;

    for(var i = 0; i < rules.elements.length; i++) {
        var element = rules.elements[i][0];
        var offsetExtra = rules.elements[i][1];

        if(jQuery(element).length) {
			//to do this correctly, we really need to do it for-each:
			jQuery(element).each(function()
			{
				var elementOffset = jQuery(this).offset();
				jQuery(this).height(windowHeight - elementOffset.top - screenBottom - offsetExtra);
			});
            //var elementOffset = jQuery(element).offset();
			//debugPrint("elementOffset.top = "+elementOffset.top);
            //jQuery(element).height(windowHeight - elementOffset.top - screenBottom - offsetExtra);
        }
    }

    for(i = 0; i < rules.tabs.length; i++) {
        var element = rules.tabs[i];
        if(jQuery(element).length) {

            // get element in order to establish ownership with jquery
            var id = "" + element;
            id = id.replace("#", "");
            var object = document.getElementById(id);
            this.getTruncatedTitle(object, object.title);
        }
    }
};

/**
 * A semi-smart truncate, brute force style
 */
atb.ui.WindowScaler.prototype.getTruncatedTitle = function (object, text) {

    var rules = this.scalingRules;
    var truncated = "";

    if(text) {
        truncated = text;
    }

    // don't truncate unless this is turned on in the rules and there is text
    if(rules.truncate && truncated.length != 0) {

        var objectWidth = jQuery(object).width();

        jQuery(object).html("<span></span>");
        jQuery(object).find("span").css("white-space", "nowrap");

        var span = jQuery(object).find("span");

        for(var i = 0; i < text.length; i++) {

            truncated = text.substr(0,text.length-i);
            
            if(i != 0) {
                truncated += " ...";
            }

            span.html(truncated);

            var spanWidth = span.width();

            if(objectWidth > spanWidth) {
                break;
            }
        }
    }

    return truncated;
};
