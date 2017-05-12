[#ftl]
[#-- @ftlvariable name="cp" type="java.lang.String" --]
[#-- @ftlvariable name="local" type="java.lang.Boolean" --]
[#macro page title="DM"]
<!DOCTYPE html>
<html>
<head>
    <title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/png" href="${cp}/static/img/favicon.png">

    <link rel="stylesheet" href="${cp}/static/css/dm.css" type="text/css" />

    <script type="text/javascript">STATIC_URL = '${cp}/static/';</script>
    <script src="${cp}/static/js/dm.js" type="text/javascript"></script>
    <script src="${cp}/static/js/closure-library/closure/goog/base.js" type="text/javascript"></script>
    <script src="${cp}/static/js/dm-goog-deps.js" type="text/javascript"></script>
    <script src="${cp}/static/js/jquery/jquery-1.10.1.js" type="text/javascript"></script>
    <script src="${cp}/static/js/jquery/jquery-ui-1.10.3.custom.js" type="text/javascript"></script>
    <script src="${cp}/static/js/bootstrap.min.js" type="text/javascript"></script>
    <script src="${cp}/static/js/fineuploader-3.1.1.js"></script>
    [#if local]
        <script src="${cp}/static/js/dm/ClientApp.js" type="text/javascript"></script>
    [#else]
        <script src="${cp}/static/js/dm-goog.js" type="text/javascript"></script>
    [/#if]
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
        <span class="brand" >${title?html}</span>
        <div class="nav-collapse collapse top-level-nav-collapse">
            <ul class="nav pull-right">
                <li id="projectViewerButtons"></li>
                <li id="searchButton" title="Search text documents in the current project">
                    <a href="#" role="button">
                        <span class="icon-search"></span>
                        Search
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
                [#if user.guest]
                    <li><a href="${cp}/accounts/login">login</a></li>
                [#else]
                    <li id="user-dropdown" class="dropdown">
                        <a href="#" class="dropdown-toggle" data-toggle="dropdown">
                            <span class="icon-user"></span>
                            <span id="logged-in-user" title="${user.firstName?html} ${user.lastName?html}, ${user.email?html}">${user.account?html}</span>
                            <span id="logged-in-email" style="display:none">${user.email?html}</span>
                            <b class="caret"></b>
                        </a>
                        <ul class="dropdown-menu">
                            <li><a href="${cp}/accounts/logout" onclick="document.execCommand && document.execCommand('ClearAuthenticationCache')">Logout</a></li>
                        </ul>
                    </li>
                [/#if]
            </ul>
        </div>
    </div>
</div>

[#nested]

</body>
</html>
[/#macro]

