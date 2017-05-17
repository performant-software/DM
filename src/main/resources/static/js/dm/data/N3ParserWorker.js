var goog = {
    provide: function() {},
    require: function() {}
};

importScripts(STATIC_URL + 'js/n3/n3lexer.js');
importScripts(STATIC_URL + 'js/n3/n3store.js');
importScripts(STATIC_URL + 'js/n3/n3parser.js');

var isBNode = function(str) {
    return str.substring(0, 2) == '_:';
};

var wrap = function(str) {
    if (str[0] != '"' && !isBNode(str)) {
        return ['<', str.replace(/>/g, '\\>'), '>'].join('');
    }
    else {
        return str;
    }
}

var parser = new N3Parser();

addEventListener('message', function(e) {
    parser.parse(e.data, function(error, triple) {
        if (triple) {
            postMessage({
                'error': error,
                'triple': {
                    'subject': wrap(triple.subject),
                    'predicate': wrap(triple.predicate),
                    'object': wrap(triple.object)
                }
            });
        }
        else {
            postMessage({
                'error': error,
                'triple': null
            })
        }
    });
});