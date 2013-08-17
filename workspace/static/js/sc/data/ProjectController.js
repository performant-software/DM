goog.provide('sc.data.ProjectController');

goog.require('goog.events.EventTarget');
goog.require('goog.structs');

sc.data.ProjectController = function(databroker) {
    goog.events.EventTarget.call(this);

    this.databroker = databroker;
};
goog.inherits(sc.data.ProjectController, goog.events.EventTarget);

sc.data.ProjectController.PERMISSIONS = {
    'permission': '<http://vocab.ox.ac.uk/perm#hasPermissionOver>',
    'update': '<http://vocab.ox.ac.uk/perm#mayUpdate>',
    'read': '<http://vocab.ox.ac.uk/perm#mayRead>',
    'delete': '<http://vocab.ox.ac.uk/perm#mayDelete>',
    'augment': '<http://vocab.ox.ac.uk/perm#mayAugment>',
    'administer': '<http://vocab.ox.ac.uk/perm#mayAdminister>',
    'createChildren': '<http://vocab.ox.ac.uk/perm#mayCreateChildrenOf>'
};

sc.data.ProjectController.prototype.findProjects = function(user) {
    if (user == null) {
        user = this.databroker.user;
    }
    else {
        user = this.databroker.getResource(user);
    }

    return user.getProperties(sc.data.ProjectController.PERMISSIONS.permission);
};

sc.data.ProjectController.prototype.findUsersInProject = function(project) {
    if (project == null) {
        project = this.currentProject;
    }
    else {
        project = this.databroker.getResource(project);
    }

    var userUris = [];

    goog.structs.forEach(project.getReferencingResources(sc.data.ProjectController.PERMISSIONS.permission), function(user) {
        userUris.push(user.uri);
    }, this);

    return userUris;
};

sc.data.ProjectController.prototype.grantPermissionsToUser = function(user, project, permissions) {
    user = this.databroker.getResource(user || this.databroker.user);
    project = this.databroker.getResource(project || this.currentProject);

    goog.structs.forEach(permissions, function(permission) {
        user.addProperty(permission, project);
    }, this);

    if (!user.hasProperty(sc.data.ProjectController.PERMISSIONS.permission, project)) {
        user.addProperty(sc.data.ProjectController.PERMISSIONS.permission, project);
    }
};

sc.data.ProjectController.prototype.grantAllPermissionsToUser = function(user, project) {
    return this.grantPermissionsToUser(user, project, goog.structs.getValues(sc.data.ProjectController.PERMISSIONS));
};

sc.data.ProjectController.prototype.revokePermissionsFromUser = function(user, project, permissions) {
    user = this.databroker.getResource(user || this.databroker.user);
    project = this.databroker.getResource(project || this.currentProject);

    goog.structs.forEach(permissions, function(permission) {
        user.deleteProperty(permission, project);
    }, this);

    if (!(
        user.hasProperty(sc.data.ProjectController.PERMISSIONS.update, project) &&
        user.hasProperty(sc.data.ProjectController.PERMISSIONS.read, project) &&
        user.hasProperty(sc.data.ProjectController.PERMISSIONS.delete, project) &&
        user.hasProperty(sc.data.ProjectController.PERMISSIONS.augment, project) &&
        user.hasProperty(sc.data.ProjectController.PERMISSIONS.administer, project) &&
        user.hasProperty(sc.data.ProjectController.PERMISSIONS.createChildren, project)
    )) {
        user.deleteProperty(sc.data.ProjectController.PERMISSIONS.permission, project);
    }
};

sc.data.ProjectController.prototype.revokeAllPermissionsFromUser = function(user, project) {
    user = this.databroker.getResource(user || this.databroker.user);
    project = this.databroker.getResource(project || this.currentProject);

    goog.structs.forEach(sc.data.ProjectController.PERMISSIONS, function(permission) {
        user.deleteProperty(permission, project);
    }, this);
};

sc.data.ProjectController.prototype.userHasPermissionOverProject = function(user, project, opt_permission) {
    user = this.databroker.getResource(user || this.databroker.user);
    project = this.databroker.getResource(project || this.currentProject);

    var permission = opt_permission || sc.data.ProjectController.PERMISSIONS.permission;

    return user.hasProperty(permission, project);
};

sc.data.ProjectController.prototype.findProjectContents = function(project) {
    project = this.databroker.getResource(project || this.currentProject);

    var contentsInOrder = this.databroker.getListUrisInOrder(project);

    if (contentsInOrder.length > 0) {
        return contentsInOrder;
    }
    else {
        contentsInOrder = project.getProperties('ore:aggregates');
        this.databroker.sortUrisByTitle(contentsInOrder);
        return contentsInOrder;
    }
};

sc.data.ProjectController.prototype.selectProject = function(project) {
    project = this.databroker.getResource(project);

    if (!project.equals(this.currentProject)) {
        this.currentProject = project;
        this.databroker.user.setProperty('dm:lastOpenProject', this.currentProject.bracketedUri);
        this.fireProjectSelected();
        return true;
    }
    else {
        return false;
    }
};

sc.data.ProjectController.prototype.autoSelectProject = function(user) {
    user = this.databroker.getResource(user || this.databroker.user);

    var lastOpened = user.getOneProperty('dm:lastOpenProject');
    if (lastOpened) {
        this.selectProject(lastOpened);
        return true;
    }
    else {
        return false;
    }
};

sc.data.ProjectController.prototype.fireProjectSelected = function() {
    var event = new goog.events.Event('projectSelected', this);
    event.project = this.currentProject;
    this.dispatchEvent(event);
};

sc.data.ProjectController.prototype.addResourceToProject = function(resource, project) {
    project = this.databroker.getResource(project || this.currentProject);
    resource = this.databroker.getResource(resource);

    project.addProperty('ore:aggregates', resource.bracketedUri);
};

sc.data.ProjectController.prototype.createProject = function(uri) {
    var project = this.databroker.createResource(uri);

    goog.structs.forEach(sc.data.DataModel.VOCABULARY.projectTypes, function(type) {
        project.addType(type);
    }, this);

    this.grantAllPermissionsToUser(this.databroker.user, project);

    return project;
};
