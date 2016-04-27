[#ftl]
[#if useCompiledJs]
<script src="${cp}static/js/all-js-code.js" type="text/javascript"></script>
[#else]
<script src="${cp}static/js/closure-library/closure/goog/base.js" type="text/javascript"></script>
<script src="${cp}static/js/atb-deps.js" type="text/javascript"></script>
[/#if]
