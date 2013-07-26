goog.provide('sc.data.SyncService');

goog.require('goog.net.Cookies');

sc.data.SyncService = function(databroker, options) {
    this.databroker = databroker;

    this.options = {};
    goog.object.extend(this.options, sc.data.SyncService.DEFAULT_OPTIONS, options || {});

    this.cookies = new goog.net.Cookies(window.document);
};

sc.data.SyncService.DEFAULT_OPTIONS = {
    dmBaseUri: "http://dm.drew.edu/store/",
    restHost: location.host,
    restBasePath: 'store',
    restProtocol: 'http',
    restTextPath: 'texts',
    restProjectPath: 'projects',
    restResourcePath: 'resources',
    restAnnotationPath: 'annotations',
    restUserPath: 'users'
};

sc.data.SyncService.RESTYPE = {
    'text': 0, 
    'project': 1, 
    'annotation': 2, 
    'user': 3, 
    'resource': 4
};

sc.data.SyncService.prototype.requestSync = function() {
    this.postNewResources();

    this.putModifiedResources();
};

sc.data.SyncService.prototype.createTextHttpUri = function() {
    var uuid = this.databroker.createUuid().replace("/urn\:uuid\:/", "");
    var uri = this.textBaseUri.replace(/\/+$/, "") // that property doesn't exist in this class or the databroker... ?
        + "/"
        + uuid;
    return uri;
};


sc.data.SyncService.prototype._restUri = function(baseUri, projectUri, resType, resUri, params) {
    var url = baseUri.replace(/\/+$/, "");
    url += "/";

    if (projectUri != null) {
        url += this.options.restProjectPath.replace(/^\/+|\/+$/g, "");
        url += "/";
        url += projectUri;
        url += "/";
    }

    if (resType == sc.data.SyncService.RESTYPE.text) {
        url += this.options.restTextPath.replace(/^\/+|\/+$/g, "");
        url += "/";
    } else if (resType == sc.data.SyncService.RESTYPE.resource) {
        url += this.options.restResourcePath.replace(/^\/+|\/+$/g, "");
        url += "/";
    } else if (resType == sc.data.SyncService.RESTYPE.annotation) {
        url += this.options.restAnnotationPath.replace(/^\/+|\/+$/g, "");
        url += "/";
    } else if (resType == sc.data.SyncService.RESTYPE.user) {
        url += this.options.restUserPath.replace(/^\/+|\/+$/g, "");
        url += "/";
    }
    else if (resType == sc.data.SyncService.RESTYPE.project) {
        // url += this.options.restUserPath.replace(/^\/+|\/+$/g, "");
        // url += "/";
    }
    if (resUri != null) {
        url += resUri;
    } 
    if (params != null) {
        url += "?" + jQuery.param(params);
    }

    return url;
};


sc.data.SyncService.prototype.restUrl = function(projectUri,resType, resUri, params) {
    var baseUrl = this.options.restProtocol
        + "://"
        + this.options.restHost.replace(/\/+$/, "")
        + "/"
        + this.options.restBasePath.replace(/^\/+|\/+$/g, "")
        + "/";
    return this._restUri(baseUrl, projectUri, resType, resUri, params);
};


sc.data.SyncService.prototype.restUri = function(projectUri, resType, resUri, params) {
    return this._restUri(this.options.dmBaseUri, projectUri, resType, resUri, params);
};

sc.data.SyncService.prototype.getModifiedResourceUris = function() {
    var subjectsOfNewQuads = this.databroker.newQuadStore.subjectsSetMatchingQuery(null, null, null, null);
    subjectsOfNewQuads.addAll(this.databroker.deletedQuadsStore.subjectsSetMatchingQuery(null, null, null, null));

    return subjectsOfNewQuads.difference(this.databroker.newResourceUris);
};

sc.data.SyncService.prototype.postNewResources = function() {
    goog.structs.forEach(this.databroker.newResourceUris, function(uri) {
        this.sendResource(uri, 'POST', function() {
            this.databroker.newResourceUris.remove(uri);
        }.bind(this));
    }, this);
};

sc.data.SyncService.prototype.putModifiedResources = function() {
    goog.structs.forEach(this.getModifiedResourceUris(), function(uri) {
        this.sendResource(uri, 'PUT');
    }, this);
};

sc.data.SyncService.prototype.sendResource = function(uri, method, successHandler) {
    var resource = this.databroker.getResource(uri);
    var dataModel = this.databroker.dataModel;

    var resType;
    var quadsToPost = [];
    var quadsToRemove = [];
    var url;

    if (resource.hasType('dctypes:Text')) {
        resType = sc.data.SyncService.RESTYPE.text;

        quadsToPost = this.databroker.dataModel.findQuadsToSyncForText(resource);
        // The back end just overwrites with new data for texts, so we can just ignore quad deletion
        this.databroker.newQuadStore.removeQuads(this.databroker.dataModel.findQuadsToSyncForText(resource, this.databroker.newQuadStore));
        this.databroker.deletedQuadsStore.removeQuads(this.databroker.dataModel.findQuadsToSyncForText(resource, this.databroker.deletedQuadsStore));

        url = this.restUrl(this.databroker.currentProject, resType,
                           sc.util.Namespaces.angleBracketStrip(uri), null);
    }
    else if (resource.hasType('oa:Annotation')) {
        resType = sc.data.SyncService.RESTYPE.annotation;

        quadsToPost = dataModel.findQuadsToSyncForAnno(resource.bracketedUri);
        // The back end just overwrites with new data for texts, so we can just ignore quad deletion
        this.databroker.deletedQuadsStore.removeQuadsMatchingQuery(resource.bracketedUri, null, null, null);

        url = this.restUrl(this.databroker.currentProject, resType, null, null);
    }
    else if (resource.hasType('ore:Aggregation')) {
        if (goog.array.contains(this.databroker.allProjects, resource.uri)) {
            var resType = sc.data.SyncService.RESTYPE.project;

            quadsToPost = dataModel.findQuadsToSyncForProject(resource);
            quadsToRemove = dataModel.findQuadsToSyncForProject(resource, this.databroker.deletedQuadsStore);

            url = this.restUrl(this.databroker.currentProject, resType, null, null);
        }
    }
    else if (resource.hasType('foaf:Agent')){
        resType = sc.data.SyncService.RESTYPE.user;
        quadsToPost = dataModel.findQuadsToSyncForUser(resource)
        quadsToRemove = dataModel.findQuadsToSyncForUser(resource, this.databroker.deletedQuadsStore)

        var username = resource.uri.split("/").pop()
        url = this.restUrl(null, resType, username, null) + "/";
    }
    else if (resource.hasAnyType('oa:SpecificResource', 'oa:TextQuoteSelector', 'oa:SvgSelector')) {
        //pass, these should be synced with either texts or annotations
    }
    else {
        console.error("Don't know how to sync resource " + resource);
        return;
    }

    if (quadsToRemove.length > 0)  {
        this.sendQuads(quadsToRemove, url + 'remove_triples', 'PUT', null, function() {
            // Success
            this.databroker.deletedQuadsStore.removeQuads(quadsToRemove);
        }.bind(this), function() {
            // Error
        }.bind(this));
    }

    if (quadsToPost.length > 0) {
        this.sendQuads(quadsToPost, url, method, null, function() {
            // Success
            if (method == 'PUT' || method == 'POST') {
                this.databroker.newQuadStore.removeQuads(quadsToPost);
            }
            if (goog.isFunction(successHandler)) {
                successHandler();
            }
        }.bind(this), function() {
            // Error handling here
        }.bind(this));
    }
};

sc.data.SyncService.prototype.sendQuads = function(quads, url, method, format, successHandler, errorHandler) {
    successHandler = successHandler || jQuery.noop;
    errorHandler = errorHandler || jQuery.noop;
    format = format || 'text/turtle';
    this.databroker.serializeQuads(quads, format, function(data, error, format) {
        if (data != null) {
            jQuery.ajax({
                type: method,
                url: url,
                success: function() {
                    successHandler.apply(this, arguments);
                }.bind(this),
                error: function() {
                    console.error('unsuccessful sync', arguments);
                    errorHandler.apply(this, arguments);
                },
                data: data,
                processData: !jQuery.isXMLDoc(data),
                headers: {
                    'X-CSRFToken': this.getCsrfToken()
                },
                contentType: format + '; charset=UTF-8'
            });
        }
        else if (error) {
            errorHandler(error);
        }
    }.bind(this));
};

sc.data.SyncService.prototype.getCsrfToken = function() {
    return this.cookies.get('csrftoken');
};