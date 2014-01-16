goog.provide('sc.data.SearchController');

goog.require('goog.object');

sc.data.SearchController = function(databroker) {
    this.databroker = databroker;
};

/**
 * Main search query method. Takes a query string and a function to call back with results.
 * @param  {string} query The query string.
 * @param  {Function(object, string, string)} callback A callback function which takes a list of results, an optional spelling suggestion, and the original query as parameters.
 */
sc.data.SearchController.prototype.query = function(query, callback) {
    jQuery.ajax({
        'url': this.getSearchUrl(query),
        'type': 'GET',
        'success': function(data, textStatus, jqXHR) {
            this.databroker.parseRdf(data['n3'], 'n3', function(triples, done) {
                if (done) {
                    callback(data['results'], data['spelling_suggestion']);
                }
            });
        }.bind(this)
    });
};

sc.data.SearchController.prototype.getSearchUrl = function(query) {
    var projectUri = this.databroker.projectController.currentProject.uri;

    return this.databroker.syncService.restUrl(projectUri, sc.data.SyncService.RESTYPE.search, null, {'q': query});
};
