[#ftl]
[#macro page title="DM" headCss="" headScripts="" initScripts="" pageHeader="" headerButtons=""]
<!DOCTYPE html>
<html>
<head>
    <title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="${cp}/static/bootstrap/css/bootstrap.min.css"
          type="text/css"
    />
    <!--
      <link rel="stylesheet"
            href="${cp}/static/bootstrap/css/bootstrap-responsive.min.css"
            type="text/css"
            media="screen" />
    -->
    <link rel="stylesheet"
          href="${cp}/static/fineuploader/css/fineuploader.css"
          type="text/css" />

    <link rel="stylesheet" href="${cp}/static/css/base.css" type="text/css" />
    <link rel="icon" type="image/png" href="${cp}/static/img/favicon.png">

    <link rel="stylesheet"
          href="${cp}/static/css/dev-libraries.css"
          type="text/css" />
    <link rel="stylesheet"
          href="${cp}/static/css/dev-atb.css"
          type="text/css" />
    <link rel="stylesheet"
          href="${cp}/static/css/themes/dark/theme.css"
          type="text/css" />

    ${headCss}
    <script type="text/javascript">
        STATIC_URL = '${cp}/static/';
    </script>
    <script src="${cp}/static/js/closure-library/closure/goog/base.js"
            type="text/javascript"></script>
    <script src="${cp}/static/js/atb-deps.js"
            type="text/javascript"></script>
    <script src="${cp}/static/js/jquery/jquery-1.10.1.js"
            type="text/javascript"></script>
    <script src="${cp}/static/js/jquery/jquery-ui-1.10.3.custom.js"
            type="text/javascript"></script>
    <script src="${cp}/static/js/jquery/plugins/jquery.cookie.js"></script>
    <script src="${cp}/static/bootstrap/js/bootstrap.min.js"
            type="text/javascript"></script>
    <script src="${cp}/static/fineuploader/js/fineuploader-3.1.1.js"></script>

    ${headScripts}
</head>
<body>
[#if pageHeader?has_content]${pageHeader}[#else]
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
                ${headerButtons}
                <li class="divider-vertical"></li>
                [#if user?has_content]
                    <li id="user-dropdown" class="dropdown">
                        <a href="#" class="dropdown-toggle" data-toggle="dropdown">
                            <span class="icon-user"></span>
                            <span id="logged-in-user" title="${user.first_name?html} ${user.last_name?html}, ${user.email?html}">${user.username?html}</span>
                            <span id="logged-in-email" style="display:none">${user.email?html}</span>
                            <b class="caret"></b>
                        </a>
                        <ul class="dropdown-menu">
                            [#if user.superuser]
                                <li><a id="create-user">Create User</a></li>
                                <li class="divider"></li>
                            [/#if]
                            <li><a href="${cp}/accounts/logout">Logout</a></li>
                        </ul>
                    </li>
                [#else]
                    <li><a href="${cp}/accounts/login">login</a></li>
                [/#if]
            </ul>
        </div>
    </div>
</div>
[/#if]
[#nested]
${initScripts}
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

