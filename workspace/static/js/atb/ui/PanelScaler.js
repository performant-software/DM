goog.provide('atb.ui.PanelScaler');

goog.require('atb.ui.WindowScaler');

/**
 * Window scaling library to help us auto set heights of pieces on some of our layouts
 * Also it will help us truncate some strings to fit in narrow spaces
 * @constructor
 */
atb.ui.PanelScaler = function (scalingRules) {
    atb.ui.WindowScaler.call(this, scalingRules);
    this.numRows = 1;
};
goog.inherits(atb.ui.PanelScaler, atb.ui.WindowScaler);

/**
 * Handles resizing pieces of the UI
 */
atb.ui.PanelScaler.prototype.scale = function (opt_numRows) {
    console.log("scale called with numRows:", opt_numRows);
    this.numRows = (typeof opt_numRows === "undefined") ? this.numRows : opt_numRows;

    var rules = this.scalingRules;
    var windowHeight = jQuery(window).height();
	//debugPrint("windowHeight: "+windowHeight);
    var screenBottom = rules.screenBottom;

    for(var i = 0; i < rules.elements.length; i++) {
        var element = rules.elements[i][0];
        var offsetExtra = rules.elements[i][1];

        var numRows = this.numRows;
        if(jQuery(element).length) {
			//to do this correctly, we really need to do it for-each:
			jQuery(element).each(function()
			{
				var elementOffset = jQuery(this).offset();
  				jQuery(this).height(
                    (windowHeight - elementOffset.top - screenBottom - offsetExtra)/
                        numRows
                );
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

