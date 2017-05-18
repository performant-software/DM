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
   goog.require("dm.ClientApp");
   goog.global.clientApp = new dm.ClientApp("${cp}", [#if user?has_content]"${user.name}"[#else]null[/#if]);
</script>

[/@base.page]
