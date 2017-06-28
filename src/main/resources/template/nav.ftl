[#ftl]
<div id="main-nav" class="navbar navbar-inverse navbar-fixed-top">
    <div class="navbar-inner top-level-nav">
        <a class="btn btn-navbar" data-toggle="collapse"
           data-target=".top-level-nav-collapse">
            <span class="icon-bar"></span>
            <span class="icon-bar"></span>
            <span class="icon-bar"></span>
        </a>
        <span class="brand">DM</span>
        <div class="nav-collapse collapse top-level-nav-collapse">
            <ul class="nav pull-right">
                <li id="projectViewerButtons">
                    <div class="btn-group sc-ProjectViewer-button">
                        <div class="btn btn-inverse sc-ProjectViewer-titleButton"
                             title="View and edit this project">
                            <div class="sc-ProjectViewer-projectLabel">
                                <span class="icon-book"></span>Project:
                            </div>
                            <div class="sc-ProjectViewer-projectButtonTitle">
                                none
                            </div>
                        </div>
                        <button class="btn dropdown-toggle btn-inverse"
                                data-toggle="dropdown"
                                title="Switch projects or create a new one">
                            <span class="caret"></span>
                        </button>
                        <ul class="dropdown-menu">
                            <li class="divider hide"></li>
                            <li class="sc-ProjectViewer-createProjectButton hide">
                                <a href="#" title="Start a new project">
                                    <span class="icon-plus"></span>
                                    New project
                                </a>
                            </li>
                        </ul>
                    </div>
                </li>
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
                    <li class="dropdown" title="Log into DM">
                        <a href="#" class="dropdown-toggle" data-toggle="dropdown">
                            <span class="icon-user"></span>
                            Login
                            <b class="caret"></b>
                        </a>
                        <ul class="dropdown-menu">
                            [#list authenticationProviders?values as ap]
                                <li><a href="${cp}/accounts/login?provider=${ap.key?url}" title="${ap.description?html}">via ${ap.description?html}</a></li>
                            [/#list]
                        </ul>
                    </li>
                [#else]
                    <li id="user-dropdown" class="dropdown">
                        <a href="#" class="dropdown-toggle" data-toggle="dropdown">
                            <span class="icon-user"></span>
                            <span id="logged-in-user" title="${user.name?html}">${user.displayName!user.name?html}</span>
                            <span id="logged-in-email" style="display:none">${user.emailAddress!''?html}</span>
                            <b class="caret"></b>
                        </a>
                        <ul class="dropdown-menu">
                            <li><a href="${cp}/accounts/logout">Logout</a></li>
                        </ul>
                    </li>
                [/#if]
            </ul>
        </div>
    </div>
</div>
