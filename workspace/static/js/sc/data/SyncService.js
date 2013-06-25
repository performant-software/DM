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

    return subjectsOfNewQuads.difference(this.databroker.newResourceUris);
};

sc.data.SyncService.prototype.postNewResources = function() {
    var xhrs = [];

    goog.structs.forEach(this.databroker.newResourceUris, function(uri) {
        var xhr = this.sendResource(uri, 'POST');

        if (xhr) {
            xhr.done(function() {
                this.databroker.newResourceUris.remove(uri);
            }.bind(this));
            xhrs.push(xhr);
        }
        else {
            this.databroker.newResourceUris.remove(uri);
        }
    }, this);

    return xhrs;
};

sc.data.SyncService.prototype.sendResource = function(uri, method) {
    var resource = this.databroker.getResource(uri);

    var resType;
    var quadsToPost = [];
    var url;

    if (resource.hasType('dctypes:Text')) {
        resType = sc.data.SyncService.RESTYPE.text;

        quadsToPost = this.databroker.quadStore.query(resource.bracketedUri, null, null, null);

        url = this.restUrl(this.databroker.currentProject, resType,
                           sc.util.Namespaces.angleBracketStrip(uri), null);
    }
    else if (resource.hasType('oac:Annotation')) {
        resType = sc.data.SyncService.RESTYPE.annotation;

        quadsToPost = this.databroker.dataModel.findQuadsToSyncForAnno(resource.bracketedUri);

        url = this.restUrl(this.databroker.currentProject, resType, null, null);
    }
    else if (resource.hasType('ore:Aggregation')) {
        console.log('trying to sync ' + resource);
        if (goog.array.contains(this.databroker.allProjects, resource.uri)) {
            console.log('identified ' + resource.uri + 'as project')
            var resType = sc.data.SyncService.RESTYPE.project;

            quadsToPost = this.databroker.dataModel.findQuadsToSyncForProject(resource);

            url = this.restUrl(this.databroker.currentProject, resType, null, null);
        }
    }
    else {
        // console.error("Don't know how to sync resource " + resource);
        return;
    }

    var format = 'application/rdf+xml';

    this.databroker.serializeQuads(quadsToPost, format, function(data, error) {
        if (data != null) {
            console.log('about to send resource', uri, data);

            var xhr = jQuery.ajax({
                type: method,
                url: url,
                success: function() {
                    console.log('successful sync', arguments);
                    this.databroker.newQuadStore.removeQuads(quadsToPost);
                }.bind(this),
                error: function() {
                    console.error('unsuccessful sync', arguments);
                },
                data: data,
                processData: !jQuery.isXMLDoc(data),
                headers: {
                    'X-CSRFToken': this.getCsrfToken()
                }
            });
        }
    }.bind(this));
};

sc.data.SyncService.prototype.putModifiedResources = function() {
    var modifiedUris = this.getModifiedResourceUris();

    var xhrs = [];

    goog.structs.forEach(modifiedUris, function(uri) {
        var xhr = this.sendResource(uri, 'PUT');

        xhrs.push(xhr);
    }, this);

    return xhrs;
};

sc.data.SyncService.prototype.getCsrfToken = function() {
    return this.cookies.get('csrftoken');
};