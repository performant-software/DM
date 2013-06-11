goog.provide('sc.data.TurtleSerializer');

goog.require('sc.data.Serializer');
goog.require('sc.data.QuadStore');

sc.data.TurtleSerializer = function(databroker) {
    sc.data.Serializer.call(this, databroker);

    this.compact = false;
};
goog.inherits(sc.data.TurtleSerializer, sc.data.Serializer);

sc.data.TurtleSerializer.prototype.serializableTypes = new goog.structs.Set([
    'text/turtle',
    'text/n3'
]);

sc.data.TurtleSerializer.prototype.serialize = function(quads, opt_format) {
    var lines = [];

    lines.push(this.getPrefixesString(this.databroker.namespaces));

    lines.push(this.getTriplesString(quads));

    if (this.compact) {
        return lines.join('\n');
    }
    else {
        return lines.join('\n\n');
    }
};

sc.data.TurtleSerializer.prototype.getTriplesString = function(quads) {
    var quadStore = new sc.data.QuadStore(quads);

    var lines = [];

    var subjects = quadStore.subjectsSetMatchingQuery(null, null, null, null);
    goog.structs.forEach(subjects, function(subject) {
        var entry = [this.formatValue(subject)];

        var predicates = quadStore.predicatesSetMatchingQuery(subject, null, null, null);
        var predicateEntries = [];
        goog.structs.forEach(predicates, function(predicate) {
            var objects = quadStore.objectsSetMatchingQuery(subject, predicate, null, null);
            var objectsString;
            if (objects.getCount() == 1) {
                objectsString = [(this.compact ? ' ' : '\n\t\t'), this.formatValue(objects.getValues()[0])].join('');
            }
            else {
                objectEntries = [];
                goog.structs.forEach(objects, function(object) {
                    objectEntries.push([(this.compact ? ' ' : '\n\t\t'), object].join(''));
                }, this);
                objectsString = objectEntries.join(',');
            }

            predicateEntries.push([(this.compact ? ' ' : '\n\t'), this.formatValue(predicate), objectsString].join(''));
        }, this);

        lines.push([subject, predicateEntries.join(' ;'), ' .'].join(''));
    }, this);

    if (this.compact) {
        return lines.join('\n');
    }
    else {
        return lines.join('\n\n');
    }
};

sc.data.TurtleSerializer.prototype.getPrefixesString = function(namespaces) {
    var lines = [];

    goog.structs.forEach(namespaces.uriByPrefix, function(uri, prefix) {
        lines.push('@prefix ' + prefix + ': ' + sc.util.Namespaces.angleBracketWrap(uri) + ' .');
    }, this);

    if (this.compact) {
        return lines.join(' ');
    }
    else {
        return lines.join('\n');
    }
};

sc.data.TurtleSerializer.prototype.formatValue = function(value) {
    if (sc.util.Namespaces.isAngleBracketWrapped(value)) {
        return this.databroker.namespaces.prefix(value);
    }
    else {
        return value;
    }
};