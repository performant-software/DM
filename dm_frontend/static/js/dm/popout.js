goog.require('openlayers.OpenLayers');

function reloadDmIfOrphaned () {
    if (! window.opener) {
        // Just in case the user opens the popup from their history instead of
        // the workspace, load the dm homepage
        window.location.href = wsSameOriginURI;
    }
}

reloadDmIfOrphaned();

function closeIfOrphaned () {
    if (! window.opener) {
        // In case the DM Workspace crashes with this window still open, close
        // this window too (scripts will fail without the workspace open)
        window.close();
    }
}

window.setTimeout(closeIfOrphaned, 2000);