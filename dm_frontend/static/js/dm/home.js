goog.require('jquery.jQuery');

var preloadATBScripts = function (scriptURIs) {
    for (var i=0, len=scriptURIs.length; i<len; i++) {
        var scriptURI = scriptURIs[i];
        
        var script = document.createElement('script');
        script.src = scriptURI;
        script.type = 'text/javascript';
        
        document.head.appendChild(script);
    }
};