goog.provide('atb.resource.ResourceSummaryFactory');

goog.require('atb.resource.TextSummary');
goog.require('atb.resource.TextHighlightSummary');
goog.require('atb.resource.CanvasSummary');
goog.require('atb.resource.MarkerSummary');
goog.require('atb.resource.ManuscriptSummary');

/**
 * @param resource {atb.resource.Resource}
 * @return {atb.resource.ResourceSummary}
 */
atb.resource.ResourceSummaryFactory.createFromResource = function (resource, clickHandler, viewer, clientApp, opt_domHelper, opt_styleOptions) {
    var result;
    var id = resource.getId();
    var type = resource.getType();
    
    if (type == 'text') {
        result = new atb.resource.TextSummary(id, clickHandler, viewer, resource, clientApp, opt_domHelper, opt_styleOptions);
    }
    
    else if (type == 'textHighlight') {
        result = new atb.resource.TextHighlightSummary (id, clickHandler, viewer, resource, clientApp, opt_domHelper, opt_styleOptions);
    }
    
    else if (type == 'marker') {
        result = new atb.resource.MarkerSummary(id, clickHandler, viewer, resource, clientApp, opt_domHelper, opt_styleOptions);
    }
    
    else if (type == 'canvas') {
        result = new atb.resource.CanvasSummary(id, clickHandler, viewer, resource, clientApp, opt_domHelper, opt_styleOptions);
    }
    
    else if (type == 'manuscript') {
        result = new atb.resource.ManuscriptSummary(id, clickHandler, viewer, resource, clientApp, opt_domHelper, opt_styleOptions);
    }
    
    else {
        if (console.log) {
            console.log(resource);
        }
        
        throw 'Unrecognized resource type in ResourceSummaryFactory: ' + type;
    }
    
    return result;
};