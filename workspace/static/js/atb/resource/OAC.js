goog.provide('atb.resource.OAC');

goog.require('jquery.jQuery');
goog.require('atb.resource.OAC.rdfQuery');

// Simple wrapper on fetchTriples
atb.resource.OAC.fetch_annotations = function (uri) {
    var qry = jQuery.rdf(atb.resource.OAC.opts);
    atb.resource.OAC.fetchTriples(uri, qry, atb.resource.OAC.cb_process_annoList);
};

//Pull rdf/xml file and parse to triples
atb.resource.OAC.fetchTriples = function (uri, qry, fn) {
    // Check we've not already pulled this uri
    if (atb.resource.OAC.topinfo.done.indexOf(uri) > -1) {
        fn(qry,uri);
    } else {
        atb.resource.OAC.topinfo.done.push(uri);
    }
    
    jQuery.ajax({ 
           url: uri,
           accepts: "application/rdf+xml",
           success: function(data, status, xhr) {
               try {
                   var resp = qry.databank.load(data);
               } catch(e) {
                   console.log('Broken RDF/XML: ' + e);
               }
               if (qry != null) {
                   fn(qry, uri);
               }
               return;
           },
           error:  function(XMLHttpRequest, status, errorThrown) {
               console.log('Can not fetch data from ' + uri);
           }
           });
};

atb.resource.OAC.cb_process_annoList = function (qry, uri) {
    var externalFiles = {};
    var annos = atb.resource.OAC.buildAllAnnos(qry);
    var allAnnos = atb.resource.OAC.topinfo.annotations;
    
    try {
        
        for (var a=0,anno;anno=annos[a];a++) {
            
            var tgts = [];
            for (var t=0,target;target=anno.targets[t];t++) {
                
                if (target.partOf != null) {
                    var tid = target.partOf.id;
                } else {
                    var tid = target.id;
                }       
                tgts.push(tid);
                
                if (allAnnos[tid] == undefined) {
                    allAnnos[tid] = [];
                }
                allAnnos[tid].push(anno);
                
                if (target.fragmentType == 'xml') {
                    var pid = target.partOf.id;
                    if (externalFiles[pid]== undefined) {
                        externalFiles[pid] = [];
                    }
                    externalFiles[pid].push([anno, target]);
                    anno.finished -= 1;
                }
                if (target.constraint != null && !target.constraint.value) {
                    var pid = target.constraint.id;
                    if (externalFiles[pid]== undefined) {
                        externalFiles[pid] = [];
                    }
                    externalFiles[pid].push([anno, target.constraint]);
                    anno.finished -= 1;                     
                }
            }
            
            // And maybe load resources for the Body
            if (anno.body.fragmentType == 'xml') {
                var pid = anno.body.partOf.id;
                if (externalFiles[pid]== undefined) {
                    externalFiles[pid] = [];
                }
                externalFiles[pid].push([anno, anno.body]);
                anno.finished -= 1;
            }
            if (anno.body.constraint != null && !anno.body.constraint.value) {
                var pid = anno.body.constraint.id;
                if (externalFiles[pid]== undefined) {
                    externalFiles[pid] = [];
                }
                externalFiles[pid].push([anno, anno.body.constraint]);
                anno.finished -= 1;                     
            }
        }
        
        
    } catch(e) {console.log('error: ' + e) }
    
    
    atb.resource.OAC.topinfo.annotations = allAnnos;
    
    // Try to force GC on the query
    delete qry.databank;
    qry = null;
    
    // Do something with the annotations here
    atb.resource.OAC.process_annotations();
    
    // And launch AJAX queries for any external XML docs
    for (var uri in externalFiles) {
        jQuery.ajax(
               {url: uri, dataType: "xml",
               success: function(data, status, xhr) {
                   try {                                                   
                       // We have the XML now, so walk through all annos for it
                       var remotes = externalFiles[uri];                                                       
                       for (var i=0,inf; inf=remotes[i]; i++) {
                           var anno = inf[0];
                           var what = inf[1];
                           if (what.fragmentType == 'xml') {
                               var sel = what.fragmentInfo[0];
                               var txtsel = what.fragmentInfo[1];
                               var btxt = jQuery(data).find(sel).text().substring(txtsel[0], txtsel[1]);
                           } else {
                               var btxt = data;
                           }
                           what.value = btxt;
                           anno.finished += 1;
                       }
                       // Do something with the annos here
                       atb.resource.OAC.process_annotations();
                       
                   } catch(e) {
                       console.log('Broken data in ' + anno.id +  ':' + e)
                   }
               },
               error: function(XMLHttpRequest, status, errorThrown) {
                   console.log('Can not fetch data from ' + uri);
               }
               }       
               );
    }
};


atb.resource.OAC.process_annotations = function () {
    // Do something with Annotations here
    
};

atb.resource.OAC.buildAllAnnos = function (query, type) {
    query.reset();
    if (type != undefined) {
        var typres = query.where('?anno a ' + type);
    } 
    var annos = {};
    var result = query.where('?anno oac:hasBody ?body')
    .each(function() {annos[this.anno.value.toString()]=1;});
    query.reset();
    
    // This is inane, but faster than anything involving queries    
    return atb.resource.OAC.rdfToJson(annos, query.databank.dump());
};


// Sometimes the dump syntax has multiple copies
// if there are circular refs. Probably a bug in RDFQuery
atb.resource.OAC.uniqueValueList = function (list) {
    var hash = {};
    for (var i=0,item;item=list[i];i++) {
        hash[item.value] = 1;
    }
    var res = [];
    for (j in hash) {
        res.push(j);
    }
    return res;
};

atb.resource.OAC.rdfToJson = function (annos, dump) {
    var nss = atb.resource.OAC.opts.namespaces;
    var annoObjs = [];
    
    for (var id in annos) {
        if (atb.resource.OAC.topinfo.builtAnnos.indexOf(id) > -1) {
            continue;
        } else {
            atb.resource.OAC.topinfo.builtAnnos.push(id);
        }
        
        var anno = new atb.resource.OAC.jAnno(id);
        anno.extractInfo(dump);
        // Must be exactly one body. Ignore past first
        var bodid = dump[id][nss.oac +'hasBody'][0].value;
        var bod = new atb.resource.OAC.jBodyTarget(bodid);
        bod.extractInfo(dump);
        anno.body = bod;
        var tgts = dump[id][nss.oac+'hasTarget'];
        var uniqtgts = atb.resource.OAC.uniqueValueList(tgts);
        for (t in uniqtgts) {
            var tid = uniqtgts[t];
            var tgt = new atb.resource.OAC.jBodyTarget(tid);
            tgt.extractInfo(dump);
            anno.targets.push(tgt)
        }
        annoObjs.push(anno);
    }
    return annoObjs;
};

goog.provide('atb.resource.OAC.jAnno');

atb.resource.OAC.jAnno = function (id) {
    this.id = id;
    this.types = [];
    this.creator = null;
    this.title = "";
    this.body = null;
    this.targets = [];      
    this.zOrder = 0;
    this.finished = 1;
    this.painted = 0;
};


atb.resource.OAC.jAnno.prototype.extractInfo = function (info) {
    var nss = atb.resource.OAC.opts.namespaces;
    var me = info[this.id]
    var typs = me[nss.rdf+'type'];       
    this.types = atb.resource.OAC.uniqueValueList(typs);
    if (me[nss.dc+'title'] != undefined) {
        this.title = me[nss.dc+'title'][0].value;
    }
    
};

atb.resource.OAC.extractSimple = function (info) {
    
    var me = info[this.id];
    if (me == undefined) {
        // No info about resource at all
        return;
    }
    var nss = atb.resource.OAC.opts.namespaces;
    
    if (me[nss.rdf+'type'] != undefined) {
        var typs = me[nss.rdf+'type'];       
        this.types= atb.resource.OAC.uniqueValueList(typs);
    } 
    if (me[nss.dc+'title'] != undefined) {
        this.title = me[nss.dc+'title'][0].value;
    }
    if (me[nss.cnt+'chars'] != undefined) {
        this.value = me[nss.cnt+'chars'][0].value;
    }
    if (me[nss.dc+'format'] != undefined) {
        this.format = me[nss.dc+'format'][0].value;
    }
    if (me[nss.exif+'height'] != undefined) {
        this.height = parseInt(me[nss.exif+'height'][0].value);
    }
    if (me[nss.exif+'width'] != undefined) {
        this.width = parseInt(me[nss.exif+'width'][0].value);
    }
    if (me[nss.dc+'extent'] != undefined) {
        this.extent = parseInt(me[nss.dc+'extent'][0].value);
    }
    
};


atb.resource.OAC.jBodyTarget = function (id) {
    this.id = id;
    this.fragmentInfo = null;
    this.fragmentType = "";
    
    var hidx = id.indexOf('#');
    if (hidx > -1) {
        // Check for fragment and try to parse
        var frag = id.substring(hidx+1, 1000);
        if (frag.substring(0,2) == 'xy') {
            // xywh=  (x,y,w,h)
            var info = atb.resource.OAC.mfRectRe.exec(frag)
            this.fragmentInfo = [parseInt(info[1]), parseInt(info[2]), parseInt(info[3]), parseInt(info[4])];
            this.fragmentType = 'rect';
        } else if (frag.substring(0,2) == 'xp') {
            // xpointer => (jquerySelect, textInfo)
            var info = atb.resource.OAC.xptrToJQuery(frag);
            this.fragmentType = 'xml';
            this.fragmentInfo = info
        } else if (frag.substring(0,2) == 't=') {
            // t= (start, end)
            var info = atb.resource.OAC.mfNptRe.exec(frag);
            this.fragmentInfo = [atb.resource.OAC.parseNptItem(info[2]), atb.resource.OAC.parseNptItem(info[3])]      ;
            this.fragmentType = 'audio';            
        }
    }
    
    this.types = [];
    this.title = "";
    this.creator = null;
    this.value = "";
    this.constraint = null;
    this.partOf = null;
    
};

atb.resource.OAC.jBodyTarget.prototype.extractSimple = atb.resource.OAC.extractSimple;

atb.resource.OAC.jBodyTarget.prototype.extractInfo = function (info) {
    var nss = atb.resource.OAC.opts.namespaces;
    var me = info[this.id];
    if (me == undefined) {
        // No info about resource at all :(
        return;
    }
    
    this.extractSimple(info);
    
    if (me[nss.dcterms+'isPartOf'] != undefined) {
        var pid = me[nss.dcterms+'isPartOf'][0].value;
        var partOf = new atb.resource.OAC.jResource(pid);
        this.partOf = partOf;
        partOf.extractInfo(info);
        
    } 
    
    // Check for constraint
    if (this.partOf == null) {
        if (me[nss.oac+'constrains'] != undefined) {
            var pid = me[nss.oac+'constrains'][0].value;
            var partOf = new atb.resource.OAC.jResource(pid);
            partOf.extractInfo(info);
            this.partOf = partOf;
            
            var cid = me[nss.oac+'constrainedBy'][0].value;
            var constraint = new atb.resource.OAC.jConstraint(cid);
            constraint.extractInfo(info);
            this.constraint = constraint;                                                             
        }
    }
    
};

goog.provide('atb.resource.OAC.jConstraint');

atb.resource.OAC.jConstraint = function (id) {
    this.id = id;
    this.format = '';
    this.value = "";
    this.creator = null;
    this.title = "";
    this.types = [];
};

atb.resource.OAC.jConstraint.prototype.extractSimple = atb.resource.OAC.extractSimple;

atb.resource.OAC.jConstraint.prototype.extractInfo = function(info) {
    var nss = atb.resource.OAC.opts.namespaces;
    var me = info[this.id];
    this.extractSimple(info);
    
    if (me[nss.aos+'offset'] != undefined) {
        this.offset = me[nss.aos+'offset'][0].value;
    }
    if (me[nss.aos+'range'] != undefined) {
        this.range = me[nss.aos+'range'][0].value;
    }
    if (me[nss.aos+'prefix'] != undefined) {
        this.prefix = me[nss.aos+'prefix'][0].value;
    }
    if (me[nss.aos+'postfix'] != undefined) {
        this.postfix = me[nss.aos+'postfix'][0].value;
    }
    if (me[nss.aos+'exact'] != undefined) {
        this.exact = me[nss.aos+'exact'][0].value;
    }
};

goog.provide('atb.resource.OAC.jResource');

atb.resource.OAC.jResource = function (id) {
    this.id = id;
    this.types = [];
    this.title = "";
    this.creator = null;
    this.value = "";
    
    this.format = "";
    this.height = 0;
    this.width = 0;
    this.extent = 0;
    
};

atb.resource.OAC.jResource.prototype.extractInfo = atb.resource.OAC.extractSimple;

goog.provide('atb.resource.OAC.jAgent');

atb.resource.OAC.jAgent = function (id) {
    this.name = "";
    this.email = "";
    this.web = "";
};


atb.resource.OAC.SVG_NS = "http://www.w3.org/2000/svg";
atb.resource.OAC.XLINK_NS = "http://www.w3.org/1999/xlink";

atb.resource.OAC.opts = {
    base:'http://your-server-here.com/path/to/stuff/',
    namespaces: {
        rdf:'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        rdfs:'http://www.w3.org/2001/01/rdf-schema#',
        dc:'http://purl.org/dc/elements/1.1/',
        dcterms:'http://purl.org/dc/terms/',
        dctype:'http://purl.org/dc/dcmitype/',
        oac:'http://www.openannotation.org/ns/',
        cnt:'http://www.w3.org/2008/content#',
        aos:'http://purl.org/ao/selectors/',
        foaf:'  http://xmlns.com/foaf/0.1/',
            
        ore:'http://www.openarchives.org/ore/terms/',
        dms:'http://dms.stanford.edu/ns/',
        exif:'http://www.w3.org/2003/12/exif/ns#'
        
    }
};

atb.resource.OAC.topinfo = {'annotations' : {}, 'done':[], 'builtAnnos':[]}

// mfre.exec(frag) --> [full, x, y, w, h]
atb.resource.OAC.mfRectRe = new RegExp('xywh=([0-9]+),([0-9]+),([0-9]+),([0-9]+)');
// mfNptRe.exect(frag) --> [full, npt, start, end]
atb.resource.OAC.mfNptRe = new RegExp('t=(npt:)?([0-9.:]+)?,([0-9.:]+)?');


atb.resource.OAC.textre = new RegExp('/text\\(\\)$');          
atb.resource.OAC.slashs = new RegExp('^[/]+');
atb.resource.OAC.xptr = new RegExp('^#?xpointer\\((.+)\\)$');
atb.resource.OAC.attrq = new RegExp('\\[([^\\]]+)=([^\\]"]+)\\]', 'g')
atb.resource.OAC.strrng = new RegExp('^string-range\\((.+),([0-9]+),([0-9]+)\\)')

atb.resource.OAC.xptrToJQuery = function (xp) {
    // Strip xpointer(...)
    var xp = xp.replace(/^\s+|\s+$/g, '');
    var m = xp.match(atb.resource.OAC.xptr);
    if (m) {
        xp = m[1];
    }       
    // We want to support string-range(xp, start, end)
    xp = xp.replace(/^\s+|\s+$/g, '');
    m = xp.match(atb.resource.OAC.strrng);
    if (m) {
        xp = m[1];
        var start = parseInt(m[2]);
        var end = parseInt(m[3]);
        var wantsText = [start, end]
    } else {
        // /text() --> return that we want .text()
        var wantsText = false;
        m = xp.match(atb.resource.OAC.textre)
        if (m) {
            xp = xp.replace(atb.resource.OAC.textre, '');
            wantsText = true;
        }
    }
    //strip initial slashes
    xp = xp.replace(atb.resource.OAC.slashs, '');
    // Parent and Descendant axes
    xp = xp.replace(new RegExp('//', 'g'), ' ');
    xp = xp.replace(new RegExp('/', 'g'), ' > ');
    // Ensure quotes in attribute values
    xp = xp.replace(atb.resource.OAC.attrq, '[$1="$2"]');
    // id(bla) --> #bla
    xp = xp.replace(/id\((.+)\)/g, '#$1')
    // Final trim
    xp = xp.replace(/^\s+|\s+$/g, '');      
    return [xp, wantsText]; 
}


atb.resource.OAC.parseNptItem = function (npt) {
    if (npt.indexOf(':') > -1) {
        // [hh:]mm:ss[.xx]
        var arr = npt.split(':');
        var secs = parseFloat(arr.pop());
        var mins = parseInt(arr.pop());
        if (arr.length > 0) {
            var hrs = parseInt(arr.pop());
        } else { var hrs = 0 };
        return secs + (mins * 60) + (hrs * 3600);                                       
    } else {
        return parseFloat(npt)
    }
}


atb.resource.OAC.rdf_to_list = function (qry, uri) {
    var l = [];
    var firsts = {};
    var rests = {};
    qry.where('?what rdf:first ?frst')
    .where('?what rdf:rest ?rst')
    .each(function() {firsts[this.what.value] = this.frst.value; rests[this.what.value] = this.rst.value});
    
    // Start list from first                                
    l.push(firsts[uri]);
    var nxt = rests[uri];
    
    // And now iterate through linked list
    while (nxt) {                   
        if (firsts[nxt] != undefined) {
            l.push(firsts[nxt]);            
        }
        nxt = rests[nxt];
    }
    return l;       
}

atb.resource.OAC.isodate = function (d) {
    var dt = '' + d.getUTCFullYear();
    var m = '' + (d.getUTCMonth() + 1);
    m = m.length == 1 ? '0' + m : m;
    var dy = '' + d.getUTCDate();
    dy = dy.length == 1 ? '0' + dy : dy;
    var hr = '' + d.getUTCHours();
    hr = hr.length == 1 ? '0' + hr : hr;
    var mn = '' + d.getUTCMinutes();
    mn = mn.length == 1 ? '0' + mn : mn;
    var sc = '' + d.getUTCSeconds();
    sc = sc.length == 1 ? '0' + sc : sc;
    return dt + '-' + m + '-' + dy + ' ' + hr + ':' + mn + ':' + sc + ' UTC';
}
