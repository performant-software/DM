[#ftl]
[#import "base.ftl" as base]
[@base.page title="DM Workspace"]
<div>
    <div id="grid">

    </div>
</div>

<!-- Repo Browser Modal -->
<div id="repoBrowserModal" class="modal hide fade" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">
    <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>
        <h3 id="myModalLabel">Repositories</h3>
    </div>
    <div class="modal-body">

    </div>
    <div class="modal-footer">
        <button class="btn btn-primary" data-dismiss="modal" aria-hidden="true">Done</button>
    </div>
</div>

<!-- Working Resources Modal -->
<div id="workingResourcesModal" class="modal hide fade" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">
    <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>
        <h3 id="myModalLabel">My Resources</h3>
    </div>
    <div class="modal-body">

    </div>
    <div class="modal-footer">
        <button class="btn btn-primary" data-dismiss="modal" aria-hidden="true">Done</button>
    </div>
</div>
<script type="text/javascript" >
    // Workspace setup code
    var staticUrl = "${cp}/static/";
    var styleRoot = "${cp}/static/css/";
    var wsURI = "${cp}";
    var mediawsURI = "${cp}/media/";
    var wsSameOriginURI = "/";

    var restBasePath = "${cp}/store";

    initWorkspace(wsURI, mediawsURI, wsSameOriginURI, [#if user?has_content]"${user.name}"[#else]null[/#if],
            styleRoot, staticUrl, restBasePath);


    $("#new_text_button").click(function(e) {
        openBlankTextDocument();
    });


    // Begin script for layout selection
    $("#1x1_layout_button").click(function(){
        viewerGrid.setDimensions(1,1);
    })

    $("#1x2_layout_button").click(function(){
        viewerGrid.setDimensions(1,2);
    })

    $("#1x3_layout_button").click(function(){
        viewerGrid.setDimensions(1,3);
    })

    $("#2x2_layout_button").click(function(){
        viewerGrid.setDimensions(2,2);
    })

    $("#2x3_layout_button").click(function(){
        viewerGrid.setDimensions(2,3);
    })

    $("#3x3_layout_button").click(function(){
        viewerGrid.setDimensions(3,3);
    })

    $("#3x4_layout_button").click(function(){
        viewerGrid.setDimensions(3,4);
    })

    $("#4x4_layout_button").click(function(){
        viewerGrid.setDimensions(4,4);
    })
    // End script for layout selection

</script>

[/@base.page]