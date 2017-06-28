[#ftl]
<div class="modal fade hide sc-ProjectViewer-modal">
    <div class="modal-header">
        <button class="close" data-dismiss="modal" aria-hidden="true">×</button>
        <h3>Title</h3>
        <ul class="nav nav-pills">
            <li class="dropdown">
                <a href="#" data-toggle="dropdown">
                    <span class="icon-plus"></span>Add Resources<span class="caret"></span>
                </a>
                <ul class="dropdown-menu" role="menu">
                    <li><a href="#" class="project-new-text"><span class="icon-pencil"></span>New Text</a></li>
                    <li><a href="#" class="project-new-image"><span class="icon-picture"></span>Upload Image</a></li>
                </ul>
            </li>
            <li><a href="#" class="project-edit"><span class="icon-cog"></span>Project Info and Sharing</a></li>
            <li><a href="#" class="project-download"><span class="icon-download"></span>Download</a></li>
        </ul>
    </div>
    <div class="modal-body">
        <div class="form-horizontal sc-ProjectViewer-projectEdit hidden">
            <div class="control-group">
                <label class="control-label" for="projectTitleInput">Title</label>
                <div class="controls"><input type="text" id="projectTitleInput" title=""></div>
            </div>
            <div class="control-group">
                <label class="control-label" for="projectDescriptionInput">Description</label>
                <div class="controls"><textarea id="projectDescriptionInput" rows="2" title=""></textarea></div>
            </div>
            <div class="panel panel-default pub-access">
                <div class="panel-body">
                    <div class="checkbox">
                        <label>Publicly Accessible?<input type="checkbox" id="public-access"></label>
                    </div>
                    <div class="control-group pub-url-group">
                        <label>URL:</label>
                        <p id="public-url"></p>
                    </div>
                </div>
            </div>
            <table class="table table-striped table-bordered sc-ProjectViewer-permissions-table">
                <thead>
                    <tr>
                        <th><span class="icon-user"></span>User</th>
                        <th><span class="icon-eye-open"></span>Can See</th>
                        <th><span class="icon-pencil"></span>Can Modify</th>
                        <th><span class="icon-lock"></span>Admin</th>
                    </tr>
                </thead>
                <tbody>
                    <td colspan="4">
                        <div style="position: relative">
                            <input type="text"
                                   placeholder="Add a user ..."
                                   autocomplete="off"
                                   class="add" style="width: 90%">
                        </div>
                    </td>
                </tbody>
            </table>
            <div class="form-actions">
                <button class="btn cancel">Cancel</button>
                <span> </span>
                <button class="btn btn-primary save">Save</button>
            </div>
        </div>
        <div class="form-horizontal sc-ProjectViewer-uploadCanvas hidden">
            <h4>Upload an Image</h4>
            <div class="control-group">
                <label class="control-label" for="canvasFileInput">Image File</label>
                <div class="controls"><input type="file" id="canvasFileInput"></div>
            </div>
            <div class="control-group">
                <label class="control-label" for="canvasTitleInput">Title</label>
                <div class="controls"><input type="text" id="canvasTitleInput" placeholder="Untitled Canvas"></div>
            </div>
            <div class="progress progress-striped active">
                <div class="bar" style="width: 0%;"></div>
            </div>
            <div class="form-actions">
                <button class="btn cancel">Cancel</button>
                <span> </span>
                <button class="btn btn-primary save">Upload</button>
            </div>
        </div>
    </div>
    <div class="modal-footer" id="main-footer">
        <button class="btn btn-primary" id="del-project" >Delete Project</button>
        <button class="btn btn-primary" data-dismiss="modal" aria-hidden="true">Done</button>
    </div>
    <div class="modal-footer" id="create-footer">
        <button class="btn btn-primary" id="cancel-proj" data-dismiss="modal" aria-hidden="true">Cancel</button>
        <button class="btn btn-primary" id="create-proj">Create</button>
    </div>
</div>
