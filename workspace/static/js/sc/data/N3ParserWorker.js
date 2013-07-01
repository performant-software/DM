var goog = {
    provide: function() {},
    require: function() {}
};

importScripts(STATIC_URL + 'js/n3/n3lexer.js');
importScripts(STATIC_URL + 'js/n3/n3store.js');
importScripts(STATIC_URL + 'js/n3/n3parser.js');

var parser = new N3Parser();

addEventListener('message', function(e) {
    parser.parse(e.data, function(error, triple) {
        postMessage({
            'error': error,
            'triple': triple
        });
    });
});