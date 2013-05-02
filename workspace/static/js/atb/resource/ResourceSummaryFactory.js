goog.provide('atb.resource.ResourceSummaryFactory');

goog.require('atb.resource.TextSummary');
goog.require('atb.resource.TextHighlightSummary');
goog.require('atb.resource.CanvasSummary');
goog.require('atb.resource.MarkerSummary');
goog.require('atb.resource.ManuscriptSummary');

atb.resource.ResourceSummaryFactory.createFromUri = function(uri, clickHandler, viewer, clientApp, opt_domHelper, opt_styleOptions) {
    var result;

    var type = ''; //TODO: Remove

    var resource = clientApp.getDatabroker().getResource(uri);
    
    if (resource.hasAnyType('dctypes:Text')) {
        result = new atb.resource.TextSummary(uri, clickHandler, viewer, clientApp, opt_domHelper, opt_styleOptions);
    }
    
    else if (type == 'textHighlight') {
        result = new atb.resource.TextHighlightSummary (uri, clickHandler, viewer, clientApp, opt_domHelper, opt_styleOptions);
    }
    
    else if (resource.hasAnyType('oac:SvgSelector')) {
        result = new atb.resource.MarkerSummary(uri, clickHandler, viewer, clientApp, opt_domHelper, opt_styleOptions);
    }
    
    else if (resource.hasAnyType('dms:Canvas')) {
        result = new atb.resource.CanvasSummary(uri, clickHandler, viewer, clientApp, opt_domHelper, opt_styleOptions);
    }
    
    else if (type == 'manuscript') {
        result = new atb.resource.ManuscriptSummary(uri, clickHandler, viewer, clientApp, opt_domHelper, opt_styleOptions);
    }
    
    else {
        if (console.log) {
            console.error('Unrecognized resource type', resource);
        }
        
        // throw 'Unrecognized resource type in ResourceSummaryFactory: ' + type;
    }
    
    return result;
};