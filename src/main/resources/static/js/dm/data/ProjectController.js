goog.provide('dm.data.ProjectController');

goog.require('goog.History');
goog.require('goog.events.EventTarget');
goog.require('goog.structs');

dm.data.ProjectController = function(databroker) {
    goog.events.EventTarget.call(this);

    this.databroker = databroker;
    this.history = new goog.History();
};

goog.inherits(dm.data.ProjectController, goog.events.EventTarget);

dm.data.ProjectController.PERMISSIONS = {
    'permission': '<http://vocab.ox.ac.uk/perm#hasPermissionOver>',
    'update': '<http://vocab.ox.ac.uk/perm#mayUpdate>',
    'read': '<http://vocab.ox.ac.uk/perm#mayRead>',
    'delete': '<http://vocab.ox.ac.uk/perm#mayDelete>',
    'augment': '<http://vocab.ox.ac.uk/perm#mayAugment>',
    'administer': '<http://vocab.ox.ac.uk/perm#mayAdminister>',
    'createChildren': '<http://vocab.ox.ac.uk/perm#mayCreateChildrenOf>'
};

dm.data.ProjectController.prototype.findProjects = function(user) {
    if (user == null) {
        user = this.databroker.user;
    }
    else {
        user = this.databroker.getResource(user);
    }

    return user.getProperties(dm.data.ProjectController.PERMISSIONS.permission);
};

dm.data.ProjectController.prototype.findUsersInProject = function(project) {
    if (project == null) {
        project = this.currentProject;
    }
    else {
        project = this.databroker.getResource(project);
    }

    var userUris = new goog.structs.Set();

    goog.structs.forEach(project.getReferencingResources(dm.data.ProjectController.PERMISSIONS.permission), function(user) {
        userUris.add(user.uri);
    }, this);

    return userUris.getValues();
};

dm.data.ProjectController.prototype.grantPermissionsToUser = function(user, project, permissions) {
    user = this.databroker.getResource(user || this.databroker.user);
    project = this.databroker.getResource(project || this.currentProject);

    goog.structs.forEach(permissions, function(permission) {
        user.addProperty(permission, project);
    }, this);

    if (!user.hasProperty(dm.data.ProjectController.PERMISSIONS.permission, project)) {
        user.addProperty(dm.data.ProjectController.PERMISSIONS.permission, project);
    }
};

dm.data.ProjectController.prototype.grantAllPermissionsToUser = function(user, project) {
    return this.grantPermissionsToUser(user, project, goog.structs.getValues(dm.data.ProjectController.PERMISSIONS));
};

dm.data.ProjectController.prototype.revokePermissionsFromUser = function(user, project, permissions) {
    user = this.databroker.getResource(user || this.databroker.user);
    project = this.databroker.getResource(project || this.currentProject);

    goog.structs.forEach(permissions, function(permission) {
        user.deleteProperty(permission, project);
    }, this);

    if (!(
        user.hasProperty(dm.data.ProjectController.PERMISSIONS.update, project) ||
        user.hasProperty(dm.data.ProjectController.PERMISSIONS.read, project) ||
        user.hasProperty(dm.data.ProjectController.PERMISSIONS.delete, project) ||
        user.hasProperty(dm.data.ProjectController.PERMISSIONS.augment, project) ||
        user.hasProperty(dm.data.ProjectController.PERMISSIONS.administer, project) ||
        user.hasProperty(dm.data.ProjectController.PERMISSIONS.createChildren, project)
    )) {
        user.deleteProperty(dm.data.ProjectController.PERMISSIONS.permission, project);
    }
};

dm.data.ProjectController.prototype.revokeAllPermissionsFromUser = function(user, project) {
    user = this.databroker.getResource(user || this.databroker.user);
    project = this.databroker.getResource(project || this.currentProject);

    goog.structs.forEach(dm.data.ProjectController.PERMISSIONS, function(permission) {
        user.deleteProperty(permission, project);
    }, this);
};

dm.data.ProjectController.prototype.canUserEditProject = function() {
   user = this.databroker.getResource(this.databroker.user);
   var admin = user.hasProperty(dm.data.ProjectController.PERMISSIONS.administer, this.currentProject);
   var update = user.hasProperty(dm.data.ProjectController.PERMISSIONS.update, this.currentProject);
   return (admin || update);
};

dm.data.ProjectController.prototype.userHasPermissionOverProject = function(user, project, opt_permission) {
    user = this.databroker.getResource(user || this.databroker.user);
    project = this.databroker.getResource(project || this.currentProject);

    var permission = opt_permission || dm.data.ProjectController.PERMISSIONS.permission;

    return user.hasProperty(permission, project);
};

dm.data.ProjectController.prototype.findProjectContents = function(project) {
    project = this.databroker.getResource(project || this.currentProject);

    var contentOrder = goog.array.map(
        project.asList(),
        function(node) { return node[0].uri; }
    );


    var databroker = this.databroker;
    var dataModel = databroker.dataModel;
    var contents = project.getProperties('ore:aggregates');

    goog.array.sort(contents, function(a, b) {
        var ai = contentOrder.indexOf(a);
        var bi = contentOrder.indexOf(b);

        if (ai < 0 && bi < 0) {
            return goog.array.defaultCompare(
                dataModel.getTitle(databroker.getResource(a)),
                dataModel.getTitle(databroker.getResource(b))
            );
        }

        return (ai - bi);
    });

    return contents;
};

dm.data.ProjectController.prototype.reorderProjectContents = function(project, uris) {
    project = this.databroker.getResource(project || this.currentProject);

    goog.array.forEach(
        project.asList(),
        function(node) {
            node = node[1];
            node.deleteProperty("rdf:type", "rdf:List");
            node.deleteProperty("rdf:first");
            node.deleteProperty("rdf:rest");
        }
    );

    for (var i = 0, node = project; node ; i++) {
        node.addType("rdf:List");
        node.addProperty("rdf:first", this.databroker.getResource(uris[i]));

        var rest = (i == uris.length - 1)
                ? undefined
                : this.databroker.createResource(null);

        node.addProperty("rdf:rest", rest || "rdf:nil");
        node = rest;
    }

    this.databroker.sync();
};

dm.data.ProjectController.prototype.selectProject = function(project) {
    if (project == null) {
        if (!this.databroker.clientApp.isGuest) {
          this.databroker.user.deleteProperty('dm:lastOpenProject');
          this.databroker.sync();
        }
        this.currentProject = null;
        this.history.setToken("");
        this.fireProjectSelected();
        return true;
    }

    project = this.databroker.getResource(project);

    if (!project.equals(this.currentProject)) {
        this.currentProject = project;

        if (!this.databroker.user.getOneUnescapedProperty('dm:lastOpenProject') !=
            this.currentProject.bracketedUri) {

            if (!this.databroker.clientApp.isGuest) {
                this.databroker.user.setProperty(
                    'dm:lastOpenProject',
                    this.currentProject.bracketedUri
                );
            }
        }

        this.history.setToken(dm.data.ProjectController.projectShortcut(this.currentProject.uri));
        this.fireProjectSelected();
        return true;
    }
    else {
        return false;
    }
};

dm.data.ProjectController.prototype.linkedProject = function() {
    var linkedProject = this.history.getToken();
    if (!linkedProject) {
        return undefined;
    }
    return this.findProjects()
        .filter(function(project) { return dm.data.ProjectController.projectShortcut(project) == linkedProject; })
        .shift();
}

dm.data.ProjectController.prototype.autoSelectProject = function() {
    var user = this.databroker.user;

    var linkedProject = this.linkedProject();
    if (linkedProject) {
        this.selectProject(linkedProject);
        return true;
    }

    var lastOpened = user.getOneProperty('dm:lastOpenProject');
    if (lastOpened) {
        this.selectProject(lastOpened);
        return true;
    }

    return false;
};

dm.data.ProjectController.projectShortcut = function(uri) {
    var start = uri.lastIndexOf(":") + 1;
    return uri.substring(start, Math.min(start + 8, uri.length));
};

dm.data.ProjectController.prototype.currentProjectShortcut = function() {
    var currentProject = this.getCurrentProject();
    return currentProject ? dm.data.ProjectController.projectShortcut(currentProject.uri) : undefined;
}

dm.data.ProjectController.prototype.getCurrentProject = function() {
   return this.currentProject;
};

dm.data.ProjectController.prototype.fireProjectSelected = function() {
    var event = new goog.events.Event('projectSelected', this);
    event.project = this.currentProject;
    this.dispatchEvent(event);
    if (this.currentProject)
      DM.projectSelected(this.currentProject.uri);
};

dm.data.ProjectController.prototype.addResourceToProject = function(resource, project) {
    project = this.databroker.getResource(project || this.currentProject);
    resource = this.databroker.getResource(resource);

    project.addProperty('ore:aggregates', resource.bracketedUri);
};

dm.data.ProjectController.prototype.createProject = function(uri) {
    var project = this.databroker.createResource(uri);

    goog.structs.forEach(dm.data.DataModel.VOCABULARY.projectTypes, function(type) {
        project.addType(type);
    }, this);

    this.grantAllPermissionsToUser(this.databroker.user, project);

    return project;
};
