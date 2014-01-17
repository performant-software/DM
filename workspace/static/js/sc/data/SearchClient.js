goog.provide('sc.data.SearchClient');

sc.data.SearchClient = function(databroker) {
    this.databroker = databroker;
};

/**
 * Main search query method. Takes a query string and a function to call back with results.
 * @param {string} query The query string.
 * @param {Function(object, string, string)} callback A callback function which takes a list of results, an optional spelling suggestion, and the original query as parameters.
 * @param {Function?} opt_errorCallback A function to call in case of a network error.
 */
sc.data.SearchClient.prototype.query = function(query, callback, opt_errorCallback) {
    jQuery.ajax({
        'url': this.getSearchUrl(query),
        'type': 'GET',
        'success': function(data, textStatus, jqXHR) {
            this.databroker.processRdfData(data['n3'], 'n3', function() {
                callback(data['results'], data['spelling_suggestion']);
            });
        }.bind(this),
        'error': function(jqXHR, textStatus, errorThrown) {
            if (goog.isFunction(opt_errorCallback)) {
                opt_errorCallback(textStatus);
            }
        }
    });
};

sc.data.SearchClient.prototype.getSearchUrl = function(query) {
    var projectUri = this.databroker.projectController.currentProject.uri;

    return this.databroker.syncService.restUrl(projectUri, sc.data.SyncService.RESTYPE.search, null, {'q': query});
};
