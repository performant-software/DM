goog.require("atb.ClientApp");
goog.require("atb.WebService");
goog.require("atb.DataStore");
goog.require('atb.viewer.PanelManager');
goog.require('atb.viewer.PanelContainer');
goog.require('atb.PassThroughLoginWebService');
goog.require('atb.viewer.Finder');
goog.require('atb.viewer.StandardSimpleMarkerEditor');
goog.require('atb.viewer.Editor');
goog.require('atb.ui.Preferences');
goog.require('atb.widgets.MenuUtil');
goog.require('atb.ClientApp');
goog.require('goog.events');
goog.require('goog.dom');
goog.require('atb.ui.search.AutoComplete');
goog.require('atb.ui.WindowScaler'); // We may be able to remove this in the future
goog.require('atb.viewer.RepoBrowser');
goog.require('atb.widgets.WorkingResources');
goog.require('atb.widgets.RepoBrowser');
goog.require('goog.ui.Dialog');

var panelManager = null;
var clientApp = null;
var windowScaler = null;
var glasspane = null;
var workingResourcesViewer = null;
var repoBrowser = null;

var setupControls = function(clientApp, workingResourcesViewer) {
    // var controlsDiv = goog.dom.createDom('div', {'class': 'atb-clientapp-controls'});
    var footerControlsDiv = goog.dom.getElement('atb-footer-controls');

    var wrButton = new goog.ui.CustomButton(
        goog.dom.createDom('div', {'class': 'atb-working-resources-button'})
    );
    wrButton.setTooltip('Show the resources in my workspace');
    goog.events.listen(wrButton, 'action', showWorkingResources);
    wrButton.render(footerControlsDiv);

    var repoBrowserButton = new goog.ui.CustomButton(
        goog.dom.createDom('div', {'class': 'atb-repo-browser-button'})
    );
    repoBrowserButton.setTooltip('Browse Resource Repositories');
    goog.events.listen(repoBrowserButton, 'action', showRepoBrowser);
    repoBrowserButton.render(footerControlsDiv);

    var timelineButton = new goog.ui.CustomButton(goog.dom.createDom('div', {'class':'atb-clientapp-controls-timeline'}));
    timelineButton.setTooltip('Show resource desktop (Ctrl + D)');
    goog.events.listen(timelineButton, goog.ui.Component.EventType.ACTION, function (e) {
         clientApp.viewerThumbnailTimeline.toggleVisibility();
     });
    timelineButton.render(footerControlsDiv);

    // goog.dom.getElement('clientAppControls').appendChild(controlsDiv);
};

var handlePanelChoice = function(event) {
    if (event.resource.hasAnyType(atb.viewer.RepoBrowser.RESOURCE_TYPES.canvases)) {
        var viewer = new atb.viewer.CanvasViewer(clientApp);
        
        panelManager.getAllPanels()[event.panelId].setViewer(viewer);
        
        viewer.setCanvasByUri(event.uri, null, null, event.urisInOrder, event.currentIndex);
    }
};

var setupWorkingResources = function (clientApp, username, wrContainerParent) {
    var databroker = clientApp.getDatabroker();

    workingResourcesViewer = new atb.widgets.WorkingResources(clientApp.getDatabroker());

    var wrContainer = goog.dom.createDom('div', {'class': 'working-resources-container'},
        goog.dom.createDom('h3', {}, 'My Working Resources')
    );
    wrContainerParent.appendChild(wrContainer);
    jQuery(wrContainer).hide();

    workingResourcesViewer.render(wrContainer);
    workingResourcesViewer.loadUser(username);

    goog.events.listen(workingResourcesViewer, 'panelChosen', handlePanelChoice);

    //DEMO - REMOVE
    clientApp.getDatabroker().fetchRdf('http://ada.drew.edu/tandres/WRDemoCollection.xml', function() {
        workingResourcesViewer.loadManifest('http://dm.drew.edu/tests/working-resources-collection');
    });
    //END DEMO

    return workingResourcesViewer;
};

var showWorkingResources = function() {
    jQuery('.working-resources-container').show('drop', {'direction': 'down'}, 400);
    jQuery(glasspane).fadeIn(400);

    goog.events.listenOnce(glasspane, 'click', function(event) {
        event.stopPropagation();

        hideWorkingResources();

        jQuery(glasspane).fadeOut(400);
    });
};

var hideWorkingResources = function() {
    jQuery('.working-resources-container').hide('drop', {'direction': 'down'}, 400);
    workingResourcesViewer.hidePanelChooser();
};

var setupRepoBrowser = function(clientApp, wrContainerParent) {
    repoBrowser = new atb.widgets.RepoBrowser(clientApp, {
        repositoryUrlsByName: {
            'Yale University': '/store/manifests/http://manifests.ydc2.yale.edu/Repository',
// 'http://dms-data.stanford.edu/Repository.xml',
//            'Shared Canvas': 'http://ada.drew.edu/tandres/repos/SharedCanvas/Repository.xml'
        }
    });

    repoBrowser.addEventListener('panelChosen', handlePanelChoice);

    repoBrowser.addEventListener('add_request', function(event) {
        var resource = event.resource;
        var manuscriptResource = databroker.getResource(event.manifestUri); // If the added resource was a manuscript, then 
        // this will be the same as resource
        
        var manuscriptUri = manuscriptResource.getUri();

        console.log(resource.getSourceUrls(), manuscriptResource.getSourceUrls);
    });

    var repoBrowserContainer = goog.dom.createDom('div', {'class': 'atb-repo-browser-container'}, 
        goog.dom.createDom('h3', {}, 'Online Resource Repositories')
    );
    jQuery(repoBrowserContainer).hide();
    repoBrowser.render(repoBrowserContainer);

    wrContainerParent.appendChild(repoBrowserContainer);
};

var showRepoBrowser = function() {
    jQuery('.atb-repo-browser-container').show('drop', {'direction': 'down'}, 400);
    jQuery(glasspane).fadeIn(400);

    goog.events.listenOnce(glasspane, 'click', function(event) {
        event.stopPropagation();

        hideRepoBrowser();

        jQuery(glasspane).fadeOut(400);
    });
};

var hideRepoBrowser = function() {
    jQuery('.atb-repo-browser-container').hide('drop', {'direction': 'down'}, 400);
    repoBrowser.hidePanelChooser();
};

//TODO: kill the default content of the left/right panes probably and let the panels add the children of those tags themselves as they see fit, during their
//          tenure of their panelcontainer's tag...
//			maybe wrap them in another child tag that they "keep" owning and stops being a child when it moves...??

function initWorkspace(wsURI, mediawsURI, wsSameOriginURI, username, styleRoot, olImgPath)
{
    if (olImgPath != undefined) {
        OpenLayers.ImgPath = olImgPath;
    }

	//Q: should these dm package methods just take a clientApp...?
    var markerEditor;
    var textEditor;
	clientApp = new atb.ClientApp(
		new atb.PassThroughLoginWebService(wsURI, mediawsURI, wsSameOriginURI, username), 
        username,
        styleRoot
    );

    // activate auto heights for window and widgets
    var scalingRules = {
        screenBottom: 60,
        elements: [
            ['.atb-wrapper', 0],
            ['.atb-wrapper-inner', 0],
            ['.atb-resourceviewer', 5],
            ['.atb-markereditor-pane', 5],
            ['.editable', 5],
            ['.atb-RepoBrowser', 5]
        ],
        truncate: true,
        tabs: [
            ['#leftTab'],
            ['#rightTab']
        ]
    };
    windowScaler = new atb.ui.WindowScaler(scalingRules);
    $(window).bind('resize', function() {
        if (windowScaler.resizeTimer) clearTimeout(windowScaler.resizeTimer);
        windowScaler.resizeTimer = setTimeout('windowScaler.scale();', 100);
    });

	panelManager = clientApp.getPanelManager();
	
    var leftTabId = "left";
    var rightTabId = "right";
    var leftContainer = new atb.viewer.PanelContainer(
        "leftPane", 
        document.getElementById(leftTabId), 
        'leftTab',
        null,
        null,
        windowScaler
    );
    var rightContainer = new atb.viewer.PanelContainer(
        "rightPane", 
        document.getElementById(rightTabId), 
        'rightTab',
        null,
        null,
        windowScaler
    );
	
    panelManager.addPanelSlot(leftContainer);
    panelManager.addPanelSlot(rightContainer);
	
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
	
    var resourceViewer = new atb.viewer.Finder(clientApp);//new atb.viewer.ResourceListViewer(clientApp);
    
    leftContainer.setViewer(resourceViewer);
//    resourceViewer.addSummariesFromUserId(username);
    resourceViewer.loadSummaries([username]);
		
    leftContainer.setToolbarHangingLeft(true);
    leftContainer.autoHideToolbars();
    rightContainer.setToolbarHangingRight(true);
    rightContainer.autoHideToolbars();
	
    //setup keybindings / etc. :
    panelManager.registerGlobalHandlers();
	
    //double-check that the left container has focus to start with:
    panelManager.setActivePanel(leftContainer);//should be redundant, but...

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
    setupControls(clientApp, workingResourcesViewer);
}

/* REMOVE
var search = function(e) {
    var key = e.keyCode;
    
    if (key == goog.events.KeyCodes.ENTER || 
        key == goog.events.KeyCodes.MAC_ENTER
       ) {
        var query = e.target.value
        var ws = clientApp.getWebService();
        var rightPanel = panelManager.getPanelNamed("rightPane");
        ws.withSearchResults(
            query,
            function (resultsJson) {
    	        var finder = new atb.viewer.Finder(clientApp);
                finder.loadSummariesForSearch(resultsJson);
                rightPanel.setViewer(finder);
            }
        );
    }
};*/

var showPreferences = function () {
    
};

window.onbeforeunload = function (e)
{
	if (clientApp != null)
	{
		if (clientApp.numOpenPopups() > 0) {
			
			clientApp.forEachPopup(function (popup) {
				popup.close();
			});
		}
	}
};

//goog.exportSymbol("atb.initWorkspace", atb.initWorkspace);
