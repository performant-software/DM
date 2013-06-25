goog.provide('sc.data.N3Parser');

goog.require('sc.data.Parser');
goog.require('n3.parser');
goog.require('sc.util.Namespaces')

sc.data.N3Parser = function(databroker) {
    sc.data.Parser.call(this, databroker);

    this.parser = new N3Parser();

    if (Worker != null && Blob != null) {
        try {
            // Apologies for the inline code, but it's necessary due to cross-site restrictions
            this.workerBlob = new Blob([
                "var staticUrl = '" + goog.global.STATIC_URL.replace(/'/g, "\\'") + "';\n\
                goog = {\n\
                    provide: function() {},\n\
                    require: function() {}\n\
                };\n\
                importScripts(staticUrl + 'js/n3/n3lexer.js');\n\
                importScripts(staticUrl + 'js/n3/n3store.js');\n\
                importScripts(staticUrl + 'js/n3/n3parser.js');\n\
                \n\
                var parser = new N3Parser();\n\
                \n\
                this.addEventListener('message', function(e) {\n\
                    parser.parse(e.data, function(error, triple) {\n\
                        this.postMessage({\n\
                            'error': error,\n\
                            'triple': triple\n\
                        });\n\
                    }.bind(this));\n\
                }.bind(this));\n"
            ], {'type': 'text/javascript'});
            this.workerBlobUrl = window.URL.createObjectURL(this.workerBlob);

            this.webWorkerEnabled = true;
        }
        catch (e) {
            console.error('Web worker blob failed', e);
            this.webWorkerEnabled = false;
        }
    }
    else {
        this.webWorkerEnabled = false;
    }
};
goog.inherits(sc.data.N3Parser, sc.data.Parser);

sc.data.N3Parser.prototype.parseableTypes = new goog.structs.Set([
    'text/turtle',
    'text/n3'
]);

sc.data.N3Parser.prototype.parse = function(data, context, handler) {
    if (this.webWorkerEnabled) {
        try {
            this.parseThreaded(data, context, handler);
        }
        catch (e) {
            console.warn('Web worker parsing failed', e, 'reverting to standard implementation');
            this.parseStandard(data, context, handler);
        }
    }
    else {
        this.parseStandard(data, context, handler);
    }
};

sc.data.N3Parser.prototype.parseStandard = function(data, context, handler) {
    this.parser.parse(data, function(error, triple) {
        this._n3ParserHandler(error, triple, handler);
    }.bind(this));
};

sc.data.N3Parser.prototype._n3ParserHandler = function(error, triple, handler) {
    if (triple) {
        handler([this._tripleToQuad(triple)], false);
    }
    else if (error) {
        handler([], false, error);
    }
    else {
        handler([], true);
    }
};

sc.data.N3Parser.prototype.parseThreaded = function(data, context, handler) {
    var worker = new Worker(this.workerBlobUrl);

    worker.addEventListener('message', function(e) {
        var o = e.data;
        var error = o.error;
        var triple = o.triple;

        this._n3ParserHandler(error, triple, handler);

        if (!triple && !error) {
            worker.terminate();
        }
    }.bind(this));

    worker.postMessage(data);
};

sc.data.N3Parser._termWrapper = function(str) {
    if (!sc.util.Namespaces.isQuoteWrapped(str)) {
        return sc.util.Namespaces.angleBracketWrap(str);
    }
    else {
        return str;
    }
};

sc.data.N3Parser.prototype._tripleToQuad = function(triple, context) {
    var wrap = sc.data.N3Parser._termWrapper;

    var subject = wrap(triple.subject);
    var predicate = wrap(triple.predicate);
    var object = wrap(triple.object);

    return new sc.data.Quad(subject, predicate, object, context);
};