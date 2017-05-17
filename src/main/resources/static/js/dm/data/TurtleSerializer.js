goog.provide('dm.data.TurtleSerializer');

goog.require('dm.data.Serializer');
goog.require('dm.data.QuadStore');

dm.data.TurtleSerializer = function(databroker) {
    dm.data.Serializer.call(this, databroker);

    this.compact = true;
    this.indentString = '  ';
};
goog.inherits(dm.data.TurtleSerializer, dm.data.Serializer);

dm.data.TurtleSerializer.prototype.serializableTypes = new goog.structs.Set([
    'text/turtle',
    'text/n3'
]);


dm.data.TurtleSerializer.prototype.serialize = function(quads, opt_format, handler) {
   var format = opt_format || 'text/turtle';

   var lines = [];

   lines.push(this.getPrefixesString(this.databroker.namespaces));
   lines.push(this.getTriplesString(quads));

   if (this.compact) {
      var data = lines.join('\n');
   } else {
      var data = lines.join('\n\n');
   }

   handler(data, null, format);
}; 


dm.data.TurtleSerializer.prototype.getTriplesString = function(quads) {
    var quadStore = new dm.data.QuadStore(quads);

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
                objectsString = ' ' + this.formatValue(objects.getValues()[0]);
            }
            else {
                objectEntries = [];
                goog.structs.forEach(objects, function(object) {
                    objectEntries.push((this.compact ? ' ' : '\n' + this.getIndent(2)) + object);
                }, this);
                objectsString = objectEntries.join(',');
            }

            predicateEntries.push([(this.compact ? ' ' : '\n' + this.getIndent(1)), this.formatValue(predicate), objectsString].join(''));
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

dm.data.TurtleSerializer.prototype.getPrefixesString = function(namespaces) {
    var lines = [];

    goog.structs.forEach(namespaces.uriByPrefix, function(uri, prefix) {
        lines.push(['@prefix ', prefix, ': ', dm.data.Term.wrapUri(uri), ' .'].join(''));
    }, this);

    return lines.join('\n');
};

dm.data.TurtleSerializer.prototype.formatValue = function(value) {
    if (dm.data.Term.isWrappedUri(value)) {
        if (value instanceof dm.data.Uri && value.equals('<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>')) {
            return 'a';
        }
        else if (value == '<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>') {
            return 'a';
        }
        else {
            return this.databroker.namespaces.prefix(value);
        }
    }
    else if (dm.data.Term.isLiteral(value)) {
        var lastIndexOfQuote = value.lastIndexOf('"')
        var literalSegment = value.substring(1, lastIndexOfQuote);
        var typeSegment =  lastIndexOfQuote != value.length - 1 ? value.substring(lastIndexOfQuote + 1, value.length) : '';

        if (value.indexOf('\n') != -1) {
            var parts = ['"""', literalSegment, '"""', typeSegment];

            value = parts.join('');
        }
        else {
            var parts = ['"', literalSegment, '"', typeSegment];

            value = parts.join('');
        }

        return value;
    }
    else {
        return value;
    }
};

dm.data.TurtleSerializer.prototype.getIndent = function(level) {
    var arr = [];

    for (var i=0; i<level; i++) {
        arr.push(this.indentString);
    }

    return arr.join('');
};