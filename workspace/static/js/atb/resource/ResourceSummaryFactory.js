goog.provide('atb.resource.ResourceSummaryFactory');

goog.require('atb.resource.TextSummary');
goog.require('atb.resource.TextHighlightSummary');
goog.require('atb.resource.CanvasSummary');
goog.require('atb.resource.MarkerSummary');
goog.require('atb.resource.ManuscriptSummary');
goog.require('atb.resource.AudioSummary');

atb.resource.ResourceSummaryFactory.createFromUri = function(uri, clickHandler, viewer, clientApp, opt_domHelper, opt_styleOptions) {
    var result;
    var databroker = clientApp.databroker;

    var resource = databroker.getResource(uri);
    
    if (resource.hasAnyType('dctypes:Text')) {
        result = new atb.resource.TextSummary(uri, clickHandler, viewer, clientApp, opt_domHelper, opt_styleOptions);
    }
    
    else if (resource.hasAnyType('oac:SpecificResource')) {
        result = new atb.resource.MarkerSummary(uri, clickHandler, viewer, clientApp, opt_domHelper, opt_styleOptions);
    }
    
    else if (resource.hasAnyType('dms:Canvas')) {
        result = new atb.resource.CanvasSummary(uri, clickHandler, viewer, clientApp, opt_domHelper, opt_styleOptions);
    }

    else if (resource.hasAnyType('dms:AudioSegment', 'dctypes:Sound')) {
        result = new atb.resource.AudioSummary(uri, clickHandler, viewer, clientApp, opt_domHelper, opt_styleOptions);
    }
    
    else {
        if (console.log) {
            console.error('Unrecognized resource type', resource);
        }
        
        // throw 'Unrecognized resource type in ResourceSummaryFactory: ' + type;
    }
    
    return result;
};