goog.require("atb.ClientApp");
goog.require("atb.WebService");
goog.require('atb.viewer.PanelManager');
goog.require('atb.viewer.PanelContainer');
goog.require('atb.PassThroughLoginWebService');
goog.require('atb.viewer.Finder');
goog.require('atb.viewer.Editor');
goog.require('atb.ui.Preferences');
goog.require('atb.widgets.MenuUtil');
goog.require('atb.ClientApp');
goog.require('goog.events');
goog.require('goog.dom');
goog.require('atb.ui.WindowScaler'); // We may be able to remove this in the future
goog.require('atb.ui.PanelScaler'); // We may be able to remove this in the future
goog.require('atb.viewer.RepoBrowser');
goog.require('atb.widgets.WorkingResources');
goog.require('atb.widgets.RepoBrowser');
goog.require('goog.ui.Dialog');
goog.require('sc.canvas.FabricCanvas');

var panelManager = null;
var clientApp = null;
var glasspane = null;
var workingResourcesViewer = null;
var repoBrowser = null;

var setupWorkingResources = function (clientApp, username, wrContainerParent) {
    var databroker = clientApp.getDatabroker();

    workingResourcesViewer = new atb.widgets.WorkingResources(clientApp.getDatabroker());

    var wrContainer = jQuery('#workingResourcesModal .modal-body').get(0);

    workingResourcesViewer.render(wrContainer);
    workingResourcesViewer.loadUser(username);

    workingResourcesViewer.addEventListener('panelChosen', function(event) {
        if (event.resource.hasAnyType(atb.viewer.RepoBrowser.RESOURCE_TYPES.canvases)) {
            openCanvas(event.uri, event.urisInOrder, event.currentIndex);
        }
    });

    return workingResourcesViewer;
};

var setupRepoBrowser = function(clientApp, wrContainerParent) {
    repoBrowser = new sc.RepoBrowser({
        repositories: [
            {
                title: 'Yale University',
                // url: '/store/manifests/http://manifests.ydc2.yale.edu/Repository',
                url: '/store/resources/http://manifests.ydc2.yale.edu/MetaManifest',
                uri: 'http://manifests.ydc2.yale.edu/MetaManifest'
                // uri: 'http://manifests.ydc2.yale.edu/Repository'
            }
        ],
        databroker: clientApp.getDatabroker()
    });

    repoBrowser.addEventListener('click', function(event) {
        var uri = event.uri;
        var resource = event.resource;

        if (resource.hasAnyType('dms:Canvas')) {
            var manifestUri = event.manifestUri;
            var urisInOrder = event.urisInOrder;
            var index = event.currentIndex;
            openCanvas(uri, urisInOrder, index);

            event.preventDefault();
        }
    });

    repoBrowser.addEventListener('add_request', function(event) {
        var resource = event.resource;
        var manuscriptResource = databroker.getResource(event.manifestUri); // If the added resource was a manuscript, then 
        // this will be the same as resource
        
        var manuscriptUri = manuscriptResource.getUri();

        console.log(resource.getSourceUrls(), manuscriptResource.getSourceUrls);
    });

    var repoBrowserContainer = jQuery('#repoBrowserModal .modal-body').get(0);
    repoBrowser.render(repoBrowserContainer);
};

var openCanvas = function(uri, urisInOrder, index) {
    var gridDiv = document.createElement('div');
    var wrapperContainer = goog.dom.createDom('div', {'class': 'atb-wrapper-container'});
    gridDiv.appendChild(wrapperContainer);
    var heading = goog.dom.createDom('div', {'class': 'atb-wrapper-heading'});
    wrapperContainer.appendChild(heading);
    var inner = goog.dom.createDom('div', {'class': 'atb-wrapper-inner'});
    wrapperContainer.appendChild(inner);

    jQuery('#grid.row-fluid').append(gridDiv);

    var panelContainer = new atb.viewer.PanelContainer(
        goog.getUid({}), 
        inner, 
        heading,
        null,
        null,
        windowScaler
    );

    var panelManager = clientApp.getPanelManager();
    panelManager.addPanelSlot(panelContainer);

    var viewer = new atb.viewer.CanvasViewer(clientApp);

    panelContainer.setViewer(viewer);
    panelContainer.toolbar.hide();

    viewer.setCanvasByUri(uri, null, null, urisInOrder, index);
    viewers.push(viewer);

    windowScaler.scale(rows);
    setSpan();
    resizeViewers();
};

var setupCurrentProject = function(clientApp, username) {
    var db = clientApp.databroker;
    var url = db.restUrl(null, db.RESTYPE.user, username, null);
    var uri = db.restUri(null, db.RESTYPE.user, username, null);
    db.fetchRdf(url, function() {
        var uris = db.getAggregationContentsUris(uri);
        for (var i=0; i<uris.length; i++) {
            db.allProjects.push(uris[i]);
        }
        if (uris.length == 1) {
            db.currentProject = uris[0];

            workingResourcesViewer.loadManifest(uris[0]);
        }
    });
}

//TODO: kill the default content of the left/right panes probably and let the panels add the children of those tags themselves as they see fit, during their
//          tenure of their panelcontainer's tag...
//			maybe wrap them in another child tag that they "keep" owning and stops being a child when it moves...??

function initWorkspace(wsURI, mediawsURI, wsSameOriginURI, username, styleRoot)
{
	//Q: should these dm package methods just take a clientApp...?
    var markerEditor;
    var textEditor;
	goog.global.clientApp = new atb.ClientApp(
		new atb.PassThroughLoginWebService(wsURI, mediawsURI, wsSameOriginURI, username), 
        username,
        styleRoot
    );

    goog.global.databroker = clientApp.getDatabroker();

    // activate auto heights for window and widgets
    var scalingRules = {
        screenBottom: 10,
        elements: [
            // ['.atb-wrapper', 0],
            // ['.atb-wrapper-inner', 0],
            // ['.atb-resourceviewer', 5],
            // ['.atb-markereditor-pane', 5],
            // ['.editable', 5],
            // ['.atb-RepoBrowser', 5]
        ],
        truncate: true,
        tabs: [
            // ['#leftTab'],
            // ['#rightTab'] 
        ]
    };
//    windowScaler = new atb.ui.WindowScaler(scalingRules);
    windowScaler = new atb.ui.PanelScaler(scalingRules);
    $(window).bind('resize', function() {
        if (windowScaler.resizeTimer) clearTimeout(windowScaler.resizeTimer);
        windowScaler.resizeTimer = setTimeout('windowScaler.scale();', 100);
    });
    windowScaler.scale(2);

    var createButtonGenerator = atb.widgets.MenuUtil.createDefaultDomGenerator;
	
    var mnuOpenMarkerViewerInOtherPane =
    new atb.widgets.MenuItem(
        "loadMarkerViewerIntoAnotherPane",
        createButtonGenerator("radialButton-newDocument"),
        function(actionEvent)
        {
            var pane = actionEvent.getPane();

            var menu = actionEvent.getMenu();
					
            var panelContainer = pane.getCurrentPanelContainer();
            //currentPanel;
            var panelManager = panelContainer.getPanelManager();
            var otherContainer = panelManager.getAnotherPanel(panelContainer);
					
            if (otherContainer === null) {
                alert("only one panel container!");
                return;
            }
            var viewer = new atb.viewer.Editor(clientApp);
            otherContainer.setViewer( viewer );
            otherContainer.setTabContents('New Annotation');

            pane.dismissContextMenu(menu);
        }
        );
	
    //// Left Pane: ///////////////////////////////////////////////
		
    var augmentedMenuItems = [
    {
        menuName: "testMenu",
				
        items: [
        mnuOpenMarkerViewerInOtherPane
        ]
    }
    ];

    //setup keybindings / etc. :
  	panelManager = clientApp.getPanelManager();
    panelManager.registerGlobalHandlers();
	
    /*
    var searchField = goog.dom.getElement("titleBarSearch");
	goog.events.listen(searchField, goog.events.EventType.KEYUP, search);
    var autoComplete = new atb.ui.search.AutoComplete(clientApp, searchField);
    */
    
    var preferences = new atb.ui.Preferences(clientApp);
    window.preferences = preferences; //TEMPORARY


    glasspane = goog.dom.createDom('div', {'class': 'frosted-glasspane'});
    jQuery(glasspane).hide();
    jQuery(document.body).prepend(glasspane);

    var wrContainerParent = goog.dom.createDom('div', {'class': 'working-resources-container-parent'});
    jQuery('#atb-footer-controls').prepend(wrContainerParent);

    setupWorkingResources(clientApp, username, wrContainerParent);
    setupRepoBrowser(clientApp, wrContainerParent);
    setupCurrentProject(clientApp, username);
    
}


var createCanvasViewer = function(uri) {
    var viewer = new atb.viewer.CanvasViewer(clientApp);
    viewer.setCanvasByUri(uri, null, null, null, null);
    return viewer;
}
