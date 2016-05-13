[#ftl]
[#macro page title="DM" pageHeader=""]
<!DOCTYPE html>
<html>
<head>
    <title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/png" href="${cp}/static/img/favicon.png">

    <link rel="stylesheet" href="${cp}/static/bootstrap/css/bootstrap.min.css" type="text/css"/>
    [#-- <link rel="stylesheet" href="${cp}/static/bootstrap/css/bootstrap-responsive.min.css" type="text/css" media="screen" /> --]
    <link rel="stylesheet" href="${cp}/static/fineuploader/css/fineuploader.css" type="text/css" />
    <link rel="stylesheet" href="${cp}/static/css/base.css" type="text/css" />
    <link rel="stylesheet" href="${cp}/static/css/dev-libraries.css" type="text/css" />
    <link rel="stylesheet" href="${cp}/static/css/dev-atb.css" type="text/css" />
    <link rel="stylesheet" href="${cp}/static/css/themes/dark/theme.css" type="text/css" />

    <link rel="stylesheet" href="${cp}/static/css/dm/workspace.css" type="text/css" />

    <script type="text/javascript">STATIC_URL = '${cp}/static/';</script>
    <script src="${cp}/static/js/closure-library/closure/goog/base.js" type="text/javascript"></script>
    <script src="${cp}/static/js/atb-deps.js" type="text/javascript"></script>
    <script src="${cp}/static/js/jquery/jquery-1.10.1.js" type="text/javascript"></script>
    <script src="${cp}/static/js/jquery/jquery-ui-1.10.3.custom.js" type="text/javascript"></script>
    <script src="${cp}/static/js/jquery/plugins/jquery.cookie.js" type="text/javascript"></script>
    <script src="${cp}/static/bootstrap/js/bootstrap.min.js" type="text/javascript"></script>
    <script src="${cp}/static/fineuploader/js/fineuploader-3.1.1.js"></script>

[#if useCompiledJs]
    <script src="${cp}/static/js/all-js-code.js" type="text/javascript"></script>
[#else]
    <script src="${cp}/static/js/closure-library/closure/goog/base.js" type="text/javascript"></script>
    <script src="${cp}/static/js/atb-deps.js" type="text/javascript"></script>
[/#if]
<script src="${cp}/static/js/dm/fluid_workspace.js" type="text/javascript"></script>
</head>
<body>
<div id="main-nav" class="navbar navbar-inverse navbar-fixed-top">
    <div class="navbar-inner top-level-nav">
        <a class="btn btn-navbar" data-toggle="collapse"
           data-target=".top-level-nav-collapse">
            <span class="icon-bar"></span>
            <span class="icon-bar"></span>
            <span class="icon-bar"></span>
        </a>
        <span class="brand" >DM</span>
        <div class="nav-collapse collapse top-level-nav-collapse">
            <!-- <form class="navbar-search pull-left">
              <input type="text" class="search-query" placeholder="Search">
            </form> -->
            <ul class="nav pull-left">
                <li id="js_save_button"></li>
            </ul>
            <ul class="nav pull-right">
                <li id="projectViewerButtons"></li>
                <li id="searchButton" title="Search text documents in the current project">
                    <a href="#" role="button">
                        <span class="icon-search"></span>
                        Search
                    </a>
                </li>
                <li id="repositories_button" title="Show resources available on the internet">
                    <a href="#repoBrowserModal" role="button" data-toggle="modal">
                        <span class="icon-globe"></span>
                        External Repositories
                    </a>
                </li>
                <li class="dropdown" title="Change how many viewers are shown at a time">
                    <a href="#" class="dropdown-toggle" data-toggle="dropdown">
                        <span class="icon-th"></span>
                        Layout
                        <b class="caret"></b>
                    </a>
                    <ul class="dropdown-menu" style="min-width: 0;">
                        <li id="1x1_layout_button"><a href="#" title="Show one viewer per screen"><div class="atb-layout-picker-button-1x1"></div></a></li>
                        <li id="1x2_layout_button"><a href="#" title="Show 1 row and 2 columns of viewers per screen"><div class="atb-layout-picker-button-2x1"></div></a></li>
                        <li id="1x3_layout_button"><a href="#" title="Show 1 row and 3 columns of viewers per screen"><div class="atb-layout-picker-button-3x1"></div></a></li>
                        <li id="2x2_layout_button"><a href="#" title="Show 2 rows and 2 columns of viewers per screen"><div class="atb-layout-picker-button-2x2"></div></a></li>
                        <li id="2x3_layout_button"><a href="#" title="Show 3 rows and 2 columns of viewers per screen"><div class="atb-layout-picker-button-2x3"></div></a></li>
                        <li id="3x3_layout_button"><a href="#" title="Show 3 rows and 3 columns of viewers per screen"><div class="atb-layout-picker-button-3x3"></div></a></li>
                        <!-- <li id="3x4_layout_button"><a href="#">3x4</a></li> -->
                        <!-- <li id="4x4_layout_button"><a href="#">4x4</a></li> -->
                    </ul>
                </li>
                <li class="divider-vertical"></li>
                [#if user?has_content]
                    <li id="user-dropdown" class="dropdown">
                        <a href="#" class="dropdown-toggle" data-toggle="dropdown">
                            <span class="icon-user"></span>
                            <span id="logged-in-user" title="${user.firstName?html} ${user.lastName?html}, ${user.email?html}">${user.account?html}</span>
                            <span id="logged-in-email" style="display:none">${user.email?html}</span>
                            <b class="caret"></b>
                        </a>
                        <ul class="dropdown-menu">
                            [#if user.superuser]
                                <li><a id="create-user">Create User</a></li>
                                <li class="divider"></li>
                            [/#if]
                            <li><a href="${cp}/accounts/logout" onclick="document.execCommand && document.execCommand('ClearAuthenticationCache')">Logout</a></li>
                        </ul>
                    </li>
                [#else]
                    <li><a href="${cp}/accounts/login">login</a></li>
                [/#if]
            </ul>
        </div>
    </div>
</div>

[#nested]

<div class="modal hide fade create-user-modal" role="dialog" aria-labelledby="create-user-modal" aria-hidden="true" style="display: none;">
    <div class="modal-header">
        <button class="close" data-dismiss="modal" aria-hidden="true">×</button>
        <h4 class="modal-title">Create User</h4>
    </div>
    <div class="modal-body">
        <p id="new-user-error"></p>
        <form id="new-user" class="new-user" name="user" role="form" method="POST" action="${cp}/accounts/create/">
            ${csrfToken!''}
            <label for="name">Username:</label>
            <input type="text" id="name" name="name" class="form-control">
            <label for="email">Email address:</label>
            <input type="text" id="email" name="email" class="form-control">
            <label for="email">Password:</label>
            <input type="password" id="password" name="password" class="form-control">
            <label for="email">Password confirmation:</label>
            <input type="password" id="password-confirmation" name="password-confirmation" class="form-control">
            <div class="checkbox">
                <label><input id="admin-checkbox" name="admin" type="checkbox"> Administrator</label>
            </div>
        </form>
    </div>
    <div class="modal-footer">
        <button class="btn btn-primary" data-dismiss="modal" aria-hidden="true">Cancel</button>
        <input class="btn btn-primary" type="submit" value="Create" id="submit-new-user">
    </div>
</div>
</body>
</html>
[/#macro]

