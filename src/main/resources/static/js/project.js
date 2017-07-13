/* global require, module, jQuery */

class ProjectChangeListener {

    subscribeTo(store) {
        this.store = store;
        this.project = this.currentProject();
        this.store.subscribe(this.stateChanged.bind(this));
    }

    stateChanged() {
        if (this.projectChanged()) {
            const { project } = this;
            jQuery.ajax({
                url: "/store/projects/dashboard",
                method: "POST",
                data: { project }
            });
        }
    }

    currentProject() {
        const { project } = this.store.getState();
        return project;
    }

    projectChanged() {
        const project = this.currentProject();
        if (this.project == project) {
            return false;
        }
        this.project = project;
        return true;
    }
}

module.exports = { ProjectChangeListener };
