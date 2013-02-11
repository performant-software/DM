goog.provide('sc.data.QuadStore');

goog.require('goog.array');
goog.require('goog.structs.Set');
goog.require('sc.util.DefaultDict');
goog.require('sc.util.Namespaces');


sc.data.QuadStore = function(opt_quads) {
    this.quads = new goog.structs.Set();

    this.indexedQuads = new sc.util.DefaultDict(function() {
        return new goog.structs.Set();
    });

    if (opt_quads) {
        this.addQuads(opt_quads);
    }
};

sc.data.QuadStore.prototype.query = function(subject, object, predicate, context) {
    var key = sc.data.QuadStore.getIndexKeyForQuery(subject, object, predicate, context);

    var set = this.indexedQuads.get(key, true);

    return set.getValues();
};

sc.data.QuadStore.prototype.addQuad = function(quad) {
    var keys = sc.data.QuadStore.generateIndexKeys(quad);

    for (var i=0, len=keys.length; i<len; i++) {
        var key = keys[i];

        this.indexedQuads.get(key).add(quad);
    }

    return this;
};

sc.data.QuadStore.prototype.addQuads = function(quads) {
    for (var i=0, len=quads.length; i<len; i++) {
        this.addQuad(quads[i]);
    }

    return this;
};

sc.data.QuadStore.prototype.getQuads = function() {
    return this.quads.getValues();
};

sc.data.QuadStore.generateIndexKeys = function(quad) {
    var keys = [
        sc.data.QuadStore.getIndexKeyForQuery(
            quad.subject,
            quad.object,
            quad.predicate,
            quad.context
        ),
        sc.data.QuadStore.getIndexKeyForQuery(
            null,
            quad.object,
            quad.predicate,
            quad.context
        ),
        sc.data.QuadStore.getIndexKeyForQuery(
            quad.subject,
            null,
            quad.predicate,
            quad.context
        ),
        sc.data.QuadStore.getIndexKeyForQuery(
            quad.subject,
            quad.object,
            null,
            quad.context
        ),
        sc.data.QuadStore.getIndexKeyForQuery(
            quad.subject,
            quad.object,
            quad.predicate,
            null
        ),
        sc.data.QuadStore.getIndexKeyForQuery(
            null,
            null,
            quad.predicate,
            quad.context
        ),
        sc.data.QuadStore.getIndexKeyForQuery(
            quad.subject,
            null,
            null,
            quad.context
        ),
        sc.data.QuadStore.getIndexKeyForQuery(
            quad.subject,
            quad.object,
            null,
            null
        ),
        sc.data.QuadStore.getIndexKeyForQuery(
            quad.subject,
            quad.object,
            quad.predicate,
            null
        )
    ];

    return keys;
};

sc.data.QuadStore.getIndexKeyForQuery = function(subject, object, predicate, context) {
    var key = [];

    for (var i=0, len=arguments.length; i<len; i++) {
        if (arguments[i] == null) {
            arguments[i] = '*';
        }
    }

    key.push('__s:' + subject);
    key.push('__o:' + object);
    key.push('__p:' + predicate);
    key.push('__c:' + context);

    return key.join(';');
};