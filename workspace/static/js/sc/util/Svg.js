goog.provide('sc.util.svg');

goog.require('sc.util.Namespaces');

/**
 * Extracted from https://github.com/ElbertF/Raphael.Export
 */
sc.util.svg.raphaelElementToSVG = function(node) {
    var escapeXML = sc.util.Namespaces.escapeForXml;
    
    var map = function(iterable, callback) {
		var mapped = new Array;
        
		for ( var i in iterable ) {
			if ( iterable.hasOwnProperty(i) ) {
				var value = callback.call(this, iterable[i], i);
                
				if ( value !== null ) mapped.push(value);
			}
		}
        
		return mapped;
	};
    
    var reduce = function(iterable, callback, initial) {
		for ( var i in iterable ) {
			if ( iterable.hasOwnProperty(i) ) {
				initial = callback.call(this, initial, iterable[i], i);
			}
		}
        
		return initial;
	};
    
    var tag = function(name, attrs, matrix, content) {
		if ( typeof content === 'undefined' || content === null ) {
			content = '';
		}
        
		if ( typeof attrs === 'object' ) {
			attrs = map(attrs, function(element, name) {
                        if ( name === 'transform') return;
                        
                        return name + '="' + escapeXML(element) + '"';
                        }).join(' ');
		}
        
		return '<' + name + ( matrix ? ' transform="matrix(' + matrix.toString().replace(/^matrix\(|\)$/g, '') + ')" ' : ' ' ) + attrs + '>' +  content + '</' + name + '>';
	};
    
    var serializer = {
		'text': function(node) {
			style = extractStyle(node);
            
			var tags = new Array;
            
			map(node.attrs['text'].split('\n'), function(text, iterable, line) {
                line = line || 0;
				tags.push(tag(
                              'text',
                              reduce(
                                     node.attrs,
                                     function(initial, value, name) {
                                     if ( name !== 'text' && name !== 'w' && name !== 'h' ) {
                                     if ( name === 'font-size') value = value + 'px';
                                     
                                     initial[name] = escapeXML(value.toString());
                                     }
                                     
                                     return initial;
                                     },
                                     { style: 'text-anchor: middle; ' + styleToString(style) + ';' }
                                     ),
                              node.matrix,
                              tag('tspan', { dy: computeTSpanDy(style.font.size, line + 1, node.attrs['text'].split('\n').length) }, null, text)
                              ));
                });
            
			return tags;
		},
		'path' : function(node) {
			var initial = ( node.matrix.a === 1 && node.matrix.d === 1 ) ? {} : { 'transform' : node.matrix.toString() };
            
			return tag(
                       'path',
                       reduce(
                              node.attrs,
                              function(initial, value, name) {
                              if ( name === 'path' ) name = 'd';
                              
                              initial[name] = value.toString();
                              
                              return initial;
                              },
                              {}
                              ),
                       node.matrix
                       );
		}
		// Other serializers should go here
	};
    
    var svg = '';
    
    if ( node.node.style.display === 'none' )
        return '';
    
    var attrs = '';
    
    // Use serializer
    if ( typeof serializer[node.type] === 'function' ) {
        svg += serializer[node.type](node);
        
        return svg;
    }
    
    switch ( node.type ) {
        case 'image':
            attrs += ' preserveAspectRatio="none"';
            break;
    }
    
    for ( i in node.attrs ) {
        var name = i;
        
        switch ( i ) {
            case 'src':
                name = 'xlink:href';
                
                break;
            case 'transform':
                name = '';
                
                break;
        }
        
        if ( name ) {
            attrs += ' ' + name + '="' + escapeXML(node.attrs[i].toString()) + '"';
        }
    }
    
    svg += '<' + node.type + ' transform="matrix(' + node.matrix.toString().replace(/^matrix\(|\)$/g, '') + ')"' + attrs + '></' + node.type + '>';
    
    return svg;
};

/**
 * Takes a string representing an svg feature tag, and returns an object with
 * the tag's attributes.
 *
 * @param {string} str An svg tag string.
 * @return {Object} An object/dictionary of attributes and their values.
 */
sc.util.svg.parseAttrsFromString = function(str) {
    str = sc.util.Namespaces.unescapeFromXml(str);
    
    /**
     * Note: These Regular Expressions will not recognize escaped quotes, but it
     * shouldn't encounter them for these attributes
     */
    var cxMatch = /\s+cx\s*=\s*['"](\d+(?:\.\d+)?%?)["']/i.exec(str);
    var cyMatch = /\s+cy\s*=\s*['"](\d+(?:\.\d+)?%?)["']/i.exec(str);
    var rMatch = /\s+r\s*=\s*['"](\d+(?:\.\d+)?%?)["']/i.exec(str);
    var xMatch = /\s+x\s*=\s*['"](\-?\d+(?:\.\d+)?%?)["']/i.exec(str);
    var yMatch = /\s+y\s*=\s*['"](\-?\d+(?:\.\d+)?%?)["']/i.exec(str);
    var x1Match = /\s+x1\s*=\s*['"](\-?\d+(?:\.\d+)?%?)["']/i.exec(str);
    var x2Match = /\s+x2\s*=\s*['"](\-?\d+(?:\.\d+)?%?)["']/i.exec(str);
    var y1Match = /\s+y1\s*=\s*['"](\-?\d+(?:\.\d+)?%?)["']/i.exec(str);
    var y2Match = /\s+y2\s*=\s*['"](\-?\d+(?:\.\d+)?%?)["']/i.exec(str);
    var widthMatch = /\s+width\s*=\s*['"](\d+(?:\.\d+)?%?)["']/i.exec(str);
    var heightMatch = /\s+height\s*=\s*['"](\d+(?:\.\d+)?%?)["']/i.exec(str);
    var rxMatch = /\s+rx\s*=\s*['"](\d+(?:\.\d+)?%?)["']/i.exec(str);
    var ryMatch = /\s+ry\s*=\s*['"](\d+(?:\.\d+)?%?)["']/i.exec(str);
    var dMatch = /\s+d\s*=\s*['"]([\w\d,\.\s]+)["']/i.exec(str);
    var styleMatch = /\s+style\s*=\s*['"]([^'"]+)["']/i.exec(str);
    var transformMatch = /\s+transform\s*=\s*['"]([^'"]+)["']/i.exec(str);
    var pointsMatch = /\s+points\s*=\s*['"]([^'"]+)["']/i.exec(str);

    var attrs = {};

    if (cxMatch) {
        attrs.cx = Number(cxMatch[1]);
    }
    if (cyMatch) {
        attrs.cy = Number(cyMatch[1]);
    }
    if (rMatch) {
        attrs.r = Number(rMatch[1]);
    }
    if (xMatch) {
        attrs.x = Number(xMatch[1]);
    }
    if (yMatch) {
        attrs.y = Number(yMatch[1]);
    }
    if (x1Match) {
        attrs.x1 = Number(x1Match[1]);
    }
    if (x2Match) {
        attrs.x2 = Number(x2Match[1]);
    }
    if (y1Match) {
        attrs.y1 = Number(y1Match[1]);
    }
    if (y2Match) {
        attrs.y2 = Number(y2Match[1]);
    }
    if (widthMatch) {
        attrs.width = Number(widthMatch[1]);
    }
    if (heightMatch) {
        attrs.height = Number(heightMatch[1]);
    }
    if (rxMatch) {
        attrs.rx = Number(rxMatch[1]);
    }
    if (ryMatch) {
        attrs.ry = Number(ryMatch[1]);
    }
    if (dMatch) {
        attrs.d = dMatch[1];
    }
    if (styleMatch) {
        attrs.style = styleMatch[1];
    }
    if (transformMatch) {
        attrs.transform = transformMatch[1];
    }
    if (pointsMatch) {
        attrs.points = pointsMatch[1];
    }

    return attrs;
};