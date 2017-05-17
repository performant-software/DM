goog.provide('dm.resource.ResourceSummaryFactory');

goog.require('dm.resource.TextSummary');
goog.require('dm.resource.TextHighlightSummary');
goog.require('dm.resource.CanvasSummary');
goog.require('dm.resource.MarkerSummary');
goog.require('dm.resource.ManuscriptSummary');
goog.require('dm.resource.AudioSummary');

dm.resource.ResourceSummaryFactory.SUPPORTED_RESOURCE_TYPES_SET = new goog.structs.Set(["<http://purl.org/dc/dcmitype/Text>", "<http://www.w3.org/ns/oa#SpecificResource>", "<http://dms.stanford.edu/ns/Canvas>", "<http://www.shared-canvas.org/ns/Canvas>", "<http://dms.stanford.edu/ns/AudioSegment>", "<http://purl.org/dc/dcmitype/Sound>"]);

dm.resource.ResourceSummaryFactory.SUPPORTED_RESOURCE_TYPES = dm.resource.ResourceSummaryFactory.SUPPORTED_RESOURCE_TYPES_SET.getValues();

dm.resource.ResourceSummaryFactory.createFromUri = function(uri, viewer, clientApp, opt_domHelper, opt_styleOptions) {
   var result;
   var databroker = clientApp.databroker;

   var resource = databroker.getResource(uri);

   if (resource.hasAnyType('dctypes:Text')) {
      result = new dm.resource.TextSummary(uri, viewer, clientApp, opt_domHelper, opt_styleOptions);
   } else if (resource.hasAnyType('oa:SpecificResource')) {
      // THIS IS BROKEN! There can be many selectors!!!
      //var selector = resource.getOneResourceByProperty('oa:hasSelector');
      var selectors = resource.getResourcesByProperty('oa:hasSelector');
      for (var i = 0; i < selectors.length; i++) {
         var selector = selectors[i];
         if (selector.hasType('oa:TextQuoteSelector')) {
            result = new dm.resource.TextHighlightSummary(uri, viewer, clientApp, opt_domHelper, opt_styleOptions);
            break;
         } else if (selector.hasType('oa:SvgSelector')) {
            result = new dm.resource.MarkerSummary(uri, viewer, clientApp, opt_domHelper, opt_styleOptions);
            break;
         }
      }
   } else if (resource.hasAnyType(dm.data.DataModel.VOCABULARY.canvasTypes)) {
      result = new dm.resource.CanvasSummary(uri, viewer, clientApp, opt_domHelper, opt_styleOptions);
   } else if (resource.hasAnyType('dms:AudioSegment', 'dctypes:Sound')) {
      result = new dm.resource.AudioSummary(uri, viewer, clientApp, opt_domHelper, opt_styleOptions);
   } else {
      if (console && console.error) {
         console.error('Unrecognized resource type ' + resource);
      }

      // throw 'Unrecognized resource type in ResourceSummaryFactory: ' + type;
   }

   return result;
}; 