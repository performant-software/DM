goog.provide('atb.ui.search.RemoteArrayMatcher');

goog.require('goog.ui.ac.RemoteArrayMatcher');
goog.require('goog.string');
goog.require('jquery.jQuery');

/**
 * atb.ui.search.RemoteArrayMatcher
 *
 * Implements an ArrayMatcher for AutoComplete using WebService
 *
 * @constructor
 * @extends {goog.ui.ac.RemoteArrayMatcher}
 * @param webService {atb.WebService}
 * @param opt_noSimilar {Boolean=}
 */
atb.ui.search.RemoteArrayMatcher = function (webService, opt_noSimilar) {
    this.webService = webService;

    goog.ui.ac.RemoteArrayMatcher.call(
        this, 
        this.webService.getAutoCompleteUri(), 
        opt_noSimilar
    );
};
goog.inherits(atb.ui.search.RemoteArrayMatcher, 
              goog.ui.ac.RemoteArrayMatcher);


atb.ui.search.RemoteArrayMatcher.prototype.parseResponseText = function (
    responseText
) {
    var json = jQuery.parseJSON(responseText);
    return json;
};


atb.ui.search.RemoteArrayMatcher.prototype.buildUrl = function(
    uri,
    token, 
    maxMatches, 
    useSimilar, 
    opt_fullString
) {
    var url = new goog.Uri(uri);
    url.setParameterValue('token', token);
    url.setParameterValue('max_matches', String(maxMatches));
    url.setParameterValue('use_similar', String(Number(useSimilar)));
    return goog.string.urlDecode(url.toString());
};
