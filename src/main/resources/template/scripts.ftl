[#ftl]
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
