goog.provide('sc.data.ProjectModel');

goog.require('goog.structs');

sc.data.ProjectModel = function(databroker) {
    this.databroker = databroker;
};

sc.data.ProjectModel.PERMISSIONS = {
    'permission': '<http://vocab.ox.ac.uk/perm#hasPermissionOver>',
    'update': '<http://vocab.ox.ac.uk/perm#mayUpdate>',
    'read': '<http://vocab.ox.ac.uk/perm#mayRead>',
    'delete': '<http://vocab.ox.ac.uk/perm#mayDelete>',
    'augment': '<http://vocab.ox.ac.uk/perm#mayAugment>',
    'administer': '<http://vocab.ox.ac.uk/perm#mayAdminister>',
    'createChildren': '<http://vocab.ox.ac.uk/perm#mayCreateChildrenOf>'
};

sc.data.ProjectModel.prototype.findProjects = function(user) {
    if (user == null) {
        user = this.databroker.user;
    }
    else {
        user = this.databroker.getResource(user);
    }

    return user.getProperties(sc.data.ProjectModel.PERMISSIONS.permission);
};

sc.data.ProjectModel.prototype.findUsersInProject = function(project) {
    if (project == null) {
        project = this.databroker.getResource(this.databroker.currentProject);
    }
    else {
        project = this.databroker.getResource(project);
    }

    var userUris = [];

    goog.structs.forEach(project.getReferencingResources(sc.data.ProjectModel.PERMISSIONS.permission), function(user) {
        userUris.push(user.uri);
    }, this);

    return userUris;
};

sc.data.ProjectModel.prototype.grantPermissionsToUser = function(user, project, permissions) {
    user = this.databroker.getResource(user || this.databroker.user);
    project = this.databroker.getResource(project || this.databroker.currentProject);

    goog.structs.forEach(permissions, function(permission) {
        user.addProperty(permission, project);
    }, this);

    if (!user.hasProperty(sc.data.ProjectModel.PERMISSIONS.permission, project)) {
        user.addProperty(sc.data.ProjectModel.PERMISSIONS.permission, project);
    }
};

sc.data.ProjectModel.prototype.grantAllPermissionsToUser = function(user, project) {
    return this.grantPermissionsToUser(user, project, goog.structs.getValues(sc.data.ProjectModel.PERMISSIONS));
};

sc.data.ProjectModel.prototype.revokePermissionsFromUser = function(user, project, permissions) {
    user = this.databroker.getResource(user || this.databroker.user);
    project = this.databroker.getResource(project || this.databroker.currentProject);

    goog.structs.forEach(permissions, function(permission) {
        user.deleteProperty(permission, project);
    }, this);

    if (!(
        user.hasProperty(sc.data.ProjectModel.PERMISSIONS.update, project) &&
        user.hasProperty(sc.data.ProjectModel.PERMISSIONS.read, project) &&
        user.hasProperty(sc.data.ProjectModel.PERMISSIONS.delete, project) &&
        user.hasProperty(sc.data.ProjectModel.PERMISSIONS.augment, project) &&
        user.hasProperty(sc.data.ProjectModel.PERMISSIONS.administer, project) &&
        user.hasProperty(sc.data.ProjectModel.PERMISSIONS.createChildren, project)
    )) {
        user.deleteProperty(sc.data.ProjectModel.PERMISSIONS.permission, project);
    }
};

sc.data.ProjectModel.prototype.revokeAllPermissionsFromUser = function(user, project) {
    user = this.databroker.getResource(user || this.databroker.user);
    project = this.databroker.getResource(project || this.databroker.currentProject);

    goog.structs.forEach(sc.data.ProjectModel.PERMISSIONS, function(permission) {
        user.deleteProperty(permission, project);
    }, this);
};

sc.data.ProjectModel.prototype.userHasPermissionOverProject = function(user, project, opt_permission) {
    user = this.databroker.getResource(user || this.databroker.user);
    project = this.databroker.getResource(project || this.databroker.currentProject);

    var permission = opt_permission || sc.data.ProjectModel.PERMISSIONS.permission;

    return user.hasProperty(permission, project);
};