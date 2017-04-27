goog.provide('sc.data.SearchClient');

goog.require('sc.data.Quad');
goog.require('sc.data.Term');

sc.data.SearchClient = function(databroker) {
    this.databroker = databroker;
};

/**
 * Main search query method. Takes a query string and a function to call back with results.
 * @param {string} query The query string.
 * @param {Function(array, string, string)} callback A callback function which takes a list of results, an optional spelling suggestion, and the original query as parameters.
 * @param {Function?} opt_errorCallback A function to call in case of a network error.
 */
sc.data.SearchClient.prototype.query = function(query, callback, opt_errorCallback) {
    jQuery.ajax({
        'url': this.getSearchUrl(query),
        'type': 'GET',
        'success': function(data, textStatus, jqXHR) {
            for (var i=0, len=data.results.length; i<len; i++) {
                var result = data.results[i];
                this.buildRdfForResult(result);
            }
            // this.databroker.processRdfData(data['n3'], 'n3', function() {
            //    callback(data['results'], data['spelling_suggestion']);
            // });
            callback(data['results'], data['spelling_suggestion'], query);
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

sc.data.SearchClient.prototype.buildRdfForResult = function(result) {
    var ns = this.databroker.namespaces;

    var wrappedUri = sc.data.Term.wrapUri(result.uri);
    var projectUri = this.databroker.projectController.currentProject.bracketedUri;

    var rdfType = result.image
            ? ns.expand("oa", "Canvas")
            : ns.expand('dctypes', 'Text');

    this.databroker.quadStore.addQuads([
        new sc.data.Quad(wrappedUri, ns.expand('rdf', 'type'), rdfType, projectUri),
        new sc.data.Quad(wrappedUri, ns.expand('dc', 'title'), sc.data.Literal(result.title).n3(), projectUri),
        new sc.data.Quad(wrappedUri, ns.expand('ore', 'isDescribedBy'), sc.data.Term.wrapUri(result.url))
    ]);
};

sc.data.SearchClient.prototype.getAutocompleteUrl = function(query) {
    var projectUri = this.databroker.projectController.currentProject.uri;

    return this.databroker.syncService.restUrl(projectUri, sc.data.SyncService.RESTYPE.search_autocomplete, null, {'q': query});
};

sc.data.SearchClient.prototype.autocomplete = function(query, callback) {
    jQuery.ajax({
        'url': this.getAutocompleteUrl(query),
        'type': 'GET',
        'success': function(data, textStatus, jqXHR) {
            callback(data);
        }.bind(this)
    });
};
