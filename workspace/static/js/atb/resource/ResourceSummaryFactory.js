goog.provide('atb.resource.ResourceSummaryFactory');

goog.require('atb.resource.TextSummary');
goog.require('atb.resource.TextHighlightSummary');
goog.require('atb.resource.CanvasSummary');
goog.require('atb.resource.MarkerSummary');
goog.require('atb.resource.ManuscriptSummary');
goog.require('atb.resource.AudioSummary');

atb.resource.ResourceSummaryFactory.SUPPORTED_RESOURCE_TYPES_SET = new goog.structs.Set([
    "<http://purl.org/dc/dcmitype/Text>",
    "<http://www.w3.org/ns/oa#SpecificResource>",
    "<http://dms.stanford.edu/ns/Canvas>", "<http://www.shared-canvas.org/ns/Canvas>",
    "<http://dms.stanford.edu/ns/AudioSegment>",
    "<http://purl.org/dc/dcmitype/Sound>"
]);

atb.resource.ResourceSummaryFactory.SUPPORTED_RESOURCE_TYPES = atb.resource.ResourceSummaryFactory.SUPPORTED_RESOURCE_TYPES_SET.getValues();

atb.resource.ResourceSummaryFactory.createFromUri = function(uri, viewer, clientApp, opt_domHelper, opt_styleOptions) {
    var result;
    var databroker = clientApp.databroker;

    var resource = databroker.getResource(uri);
    
    if (resource.hasAnyType('dctypes:Text')) {
        result = new atb.resource.TextSummary(uri, viewer, clientApp, opt_domHelper, opt_styleOptions);
    }
    
    else if (resource.hasAnyType('oa:SpecificResource')) {
        var selector = resource.getOneResourceByProperty('oa:hasSelector');

        if (selector.hasType('oa:TextQuoteSelector')) {
            result = new atb.resource.TextHighlightSummary(uri, viewer, clientApp, opt_domHelper, opt_styleOptions);
        }
        else if (selector.hasType('oa:SvgSelector')) {
            result = new atb.resource.MarkerSummary(uri, viewer, clientApp, opt_domHelper, opt_styleOptions);
        }
    }
    
    else if (resource.hasAnyType(sc.data.DataModel.VOCABULARY.canvasTypes)) {
        result = new atb.resource.CanvasSummary(uri, viewer, clientApp, opt_domHelper, opt_styleOptions);
    }

    else if (resource.hasAnyType('dms:AudioSegment', 'dctypes:Sound')) {
        result = new atb.resource.AudioSummary(uri, viewer, clientApp, opt_domHelper, opt_styleOptions);
    }
    
    else {
        if (console && console.error) {
            console.error('Unrecognized resource type ' + resource);
        }
        
        // throw 'Unrecognized resource type in ResourceSummaryFactory: ' + type;
    }
    
    return result;
};