goog.provide('atb.DMWebService');

goog.require('atb.WebService');

/** @deprecated */
atb.DMWebService = function(rootURI) {
    atb.WebService.call(this, rootURI);
}
goog.inherits(atb.DMWebService, atb.WebService);




