from django.db import transaction, IntegrityError
from django.http import HttpResponse, HttpResponseNotFound, HttpResponseForbidden
from django.contrib.auth.models import User

from rdflib.graph import Graph
from rdflib.exceptions import ParserError
from rdflib import URIRef, Literal

from semantic_store.rdfstore import rdfstore
from semantic_store.namespaces import NS, ns, bind_namespaces
from semantic_store import uris
from semantic_store.utils import NegotiatedGraphResponse, parse_request_into_graph, metadata_triples, print_triples
from semantic_store.users import PERMISSION_PREDICATES, user_graph, user_metadata_graph
from semantic_store.project_texts import sanitized_content, text_graph_from_model
from semantic_store import project_texts, canvases, permissions, manuscripts
from semantic_store.models import ProjectPermission

from semantic_store.annotations import resource_annotation_subgraph
from semantic_store.specific_resources import specific_resources_subgraph

from datetime import datetime
import itertools

import logging
logger = logging.getLogger(__name__)

PROJECT_TYPES = (NS.dcmitype.Collection, NS.ore.Aggregation, NS.foaf.Project, NS.dm.Project)

def get_project_graph(project_uri):
    """Returns the database graph used to store general information about the project with the given uri"""
    return Graph(store=rdfstore(), identifier=uris.uri('semantic_store_projects', uri=project_uri))

def get_project_metadata_graph(project_uri):
    """
    Returns the database graph used as a cache to be returned when just the project contents overview is requested
    This should essentially contain the project title and description, what it aggregates, and just enough information
    for a GUI to render those contents (titles for texts, titles and image annos for canvases, etc.)
    """
    return Graph(store=rdfstore(), identifier=uris.project_metadata_graph_identifier(project_uri))

def create_project_from_request(request):
    """Takes a graph via an http request, and creates a project in the database (and the metadata cache) from an input graph"""
    try:
        g = parse_request_into_graph(request)
    except (ParserError, SyntaxError) as e:
        return HttpResponse(status=400, content="Unable to parse serialization.\n%s" % e)

    create_project(g)
    return HttpResponse("Successfully created the project.")

def create_project(g):
    """Creates a project in the database (and the metadata cache) from an input graph"""
    print "CREATE PROJECT"
    query = g.query("""SELECT ?uri ?user
                    WHERE {
                        ?user perm:hasPermissionOver ?uri .
                        ?user rdf:type foaf:Agent .
                    }""", initNs=ns)

    seen_uri = []
    for uri in g.subjects(NS.rdf.type, NS.dm.Project):
        try:
            seen_uri.index(uri)
            continue
        except ValueError as e:
            seen_uri.append( uri )
          
        print "URI %s" % uri      
        user = g.value(None, NS.perm.hasPermissionOver, uri)
        if user:
            user_obj = User.objects.get(username=user.split('/')[-1])
        else:
            print "NO USER.... DEFAULT TO mfoy@drew.edu"
            user_obj = User.objects.get(username='mfoys@drew.edu')
            
        project_identifier = uris.uri('semantic_store_projects', uri=uri)
        project_g = Graph(store=rdfstore(), identifier=project_identifier)

        seen_turi=[]
        for text_uri in g.subjects(NS.rdf.type, NS.dcmitype.Text):
            try:
                seen_turi.index(text_uri)
                continue
            except ValueError as e:
                print "TEXT URI #1: %s" % text_uri      
                seen_turi.append( text_uri )
                
            text_graph = Graph()
            text_graph += g.triples((text_uri, None, None))
            if user_obj:
                project_texts.update_project_text(text_graph, uri, text_uri, user_obj)

        seen_t = []
        for t in g:
            try:
                seen_t.index(t)
                continue
            except ValueError as e:
                seen_t.append( t )
                project_g.add(t)

        seen_turi2=[]
        for text_uri in g.subjects(NS.rdf.type, NS.dcmitype.Text):
            try:
                seen_turi2.index(text_uri)
                continue
            except ValueError as e:
                seen_turi2.append( text_uri )
                project_g.remove((text_uri, NS.cnt.chars, None))

        url = uris.url('semantic_store_projects', uri=uri)
        project_g.set((uri, NS.dcterms['created'], Literal(datetime.utcnow())))

        if user:
            project_g.remove((user, None, None))
            username = user.split("/")[-1]
            permissions.grant_full_project_permissions(username, uri)

        add_project_types(project_g, uri)
        build_project_metadata_graph(uri)

def add_is_described_bys(request, project_uri, graph):
    for text in graph.subjects(NS.rdf.type, NS.dcmitype.Text):
        text_url = uris.url("semantic_store_project_texts", project_uri=project_uri, text_uri=text)
        graph.add((text, NS.ore.isDescribedBy, text_url))

    for canvas in graph.subjects(NS.rdf.type, NS.sc.Canvas):
        canvas_url = uris.url("semantic_store_project_canvases", project_uri=project_uri, canvas_uri=canvas)
        graph.add((canvas, NS.ore.isDescribedBy, canvas_url))

    for manuscript in graph.subjects(NS.rdf.type, NS.sc.Manifest):
        manuscript_url = uris.url("semantic_store_project_manuscripts", project_uri=project_uri, manuscript_uri=manuscript)
        graph.add((manuscript, NS.ore.isDescribedBy, manuscript_url))

def build_project_metadata_graph(project_uri):
    """
    Takes an entire project graph (with every triple in the project in it), and builds out the metadata cache graph with just
    enough information to render the project in a GUI.
    This should really only be called when importing a full project from a file, or to rebuild the cache. The cache should otherwise
    be maintained with each update, as it is very expensive to rebuild this cache.
    """
    print " - build metatdata"
    metadata_graph = get_project_metadata_graph(project_uri)
    project_graph = get_project_graph(project_uri)

    metadata_graph += metadata_triples(project_graph, project_uri)

    seen = []
    for aggregate_uri in project_graph.objects(project_uri, NS.ore.aggregates):
        try:
            seen.index(aggregate_uri)
            continue
        except ValueError as e:
            seen.append( aggregate_uri )
                
        metadata_graph.add((project_uri, NS.ore.aggregates, aggregate_uri))

        if ((aggregate_uri, NS.rdf.type, NS.sc.Canvas) in project_graph or
            (aggregate_uri, NS.rdf.type, NS.dms.Canvas) in project_graph):
            for t in canvases.canvas_and_images_graph(project_graph, aggregate_uri):
                metadata_graph.add(t)
        elif (aggregate_uri, NS.rdf.type, NS.dcmitype.Text) in project_graph:
            for t in metadata_triples(project_graph, aggregate_uri):
                metadata_graph.add(t)
        else:
            for t in metadata_triples(project_graph, aggregate_uri):
                metadata_graph.add(t)

    return metadata_graph

def read_project(request, project_uri):
    """Returns a HttpResponse of the cached project metadata graph"""
    print "READ PROJECT %s" % project_uri
    project_uri = URIRef(project_uri)

    if request.user.is_authenticated():
        if permissions.has_permission_over(project_uri, user=request.user, permission=NS.perm.mayRead):
            identifier = uris.uri('semantic_store_projects', uri=project_uri)
            store_metadata_graph = get_project_metadata_graph(project_uri)
            ret_graph = Graph()
            ret_graph += store_metadata_graph

            add_is_described_bys(request, project_uri, ret_graph)

            for permission in ProjectPermission.objects.filter(identifier=project_uri):
                user = permission.user
                user_uri = uris.uri('semantic_store_users', username=user.username)
                perm_uri = permissions.PERMISSION_URIS_BY_MODEL_VALUE[permission.permission]

                ret_graph += user_metadata_graph(user=user)
                ret_graph.add((user_uri, NS.perm.hasPermissionOver, project_uri))
                ret_graph.add((user_uri, perm_uri, project_uri))
            
            if len(ret_graph) > 0:
                return NegotiatedGraphResponse(request, ret_graph)
            else:
                return HttpResponseNotFound()
        else:
            return HttpResponseForbidden('User "%s" does not have read permissions over project "%s"' % (request.user.username, project_uri))
    else:
        return HttpResponse(status=401)


def update_project(request, uri):
    """Updates the project and metadata graph from a put or post request"""
    if request.user.is_authenticated():
        if (permissions.has_permission_over(uri, user=request.user, permission=NS.perm.mayUpdate) or
            permissions.is_abandoned_project(uri)):
            
            try:
                input_graph = parse_request_into_graph(request)
            except (ParserError, SyntaxError) as e:
                logger.error("Unable to parse serialization.\n%s" % e)
                return HttpResponse(status=400, content="Unable to parse serialization.\n%s" % e)

            update_project_graph(input_graph, URIRef(uri))

            return HttpResponse(status=204)
        else:
            return HttpResponseForbidden('User "%s" does not have update permissions over project "%s"' % (request.user.username, uri))
    else:
        return HttpResponse('Unauthorized', status=401)
    
def update_project_graph(g, identifier):
    """Updates the main project graph and the metadata graph from an input graph"""

    uri = uris.uri('semantic_store_projects', uri=identifier)

    project_g = get_project_graph(identifier)
    project_metadata_g = get_project_metadata_graph(identifier)
    
    #Prevent duplicate metadata
    if (URIRef(identifier), NS.dc.title, None) in g:
        project_g.remove((URIRef(identifier), NS.dc.title, None))
        project_metadata_g.remove((URIRef(identifier), NS.dc.title, None))
    if (URIRef(identifier), NS.rdfs.label, None) in g:
        project_g.remove((URIRef(identifier), NS.rdfs.label, None))
        project_metadata_g.remove((URIRef(identifier), NS.rdfs.label, None))
    if (URIRef(identifier), NS.dcterms.description, None) in g:
        project_g.remove((URIRef(identifier), NS.dcterms.description, None))
        project_metadata_g.remove((URIRef(identifier), NS.dcterms.description, None))

    for triple in g:
        
        # Annotation tags are never used. Don't let them get added to the graph
        if "http://www.w3.org/ns/oa#Annotation" in triple[2]:
            continue
        
        # contentChars data causes duplicates in text resources.. skip them
        if "http://www.w3.org/2011/content#chars" in triple[1] and is_image_anno(triple[2]) == False:
            continue
        
        # Not used
        if "http://purl.org/dc/elements/1.1/created" in triple[1]:
            continue
        
        #print "GRAPH %s | %s | %s" % ( triple[0], triple[1],triple[2])
        project_g.add( triple )

    for triple in metadata_triples(g, identifier):
        #print "META %s | %s | %s" % ( triple[0], triple[1],triple[2])
        project_metadata_g.add(triple)

    for triple in g.triples((identifier, NS.ore.aggregates, None)):
        #print "META2 %s | %s | %s" % ( triple[0], triple[1],triple[2])
        project_metadata_g.add(triple)

        aggregate_uri = triple[2]

        project_metadata_g += metadata_triples(project_g, aggregate_uri)
        project_metadata_g += metadata_triples(g, aggregate_uri)
        
def is_image_anno(content):
    """ Helper to check of this triple content is actually an image annotation """
    if "<ellipse" in content or "<polyline" in content or "<rect" in content or "<polygon" in content:
        return True
    return False


def delete_project(uri):
    """Deletes a project with the given URI. (Cascades project permissions as well)"""
    project_graph = get_project_graph(uri)
    metadata_graph = get_project_metadata_graph(uri)
    
    with transaction.commit_on_success():
        project_graph.remove((None, None, None))
        metadata_graph.remove((None, None, None))
        ProjectPermission.objects.filter(identifier=uri).delete()

def cleanup_orphans(request, uri):
    print "==== CLEANUP ORPHANS FROM PROJECT"
    project_g = get_project_graph(uri)
    project_metadata_g = get_project_metadata_graph(uri)
    
    orphans = []
    o = NS.dctypes.Text
    seen = []
    # Get all TEXT objects in the graph....
    for s, p in project_g.subject_predicates(o):
        try:
            seen.index(s)
            continue
        except ValueError as e:
            seen.append(s)
        print "Project TEXT %s | %s | %s" % (s, p, o)
 
        # The UUID of the text is the SUBJECT portion of the 
        # above triple
        #
        # Now, find all instances where this UUID is used
        # by something else (The UUID is the Object of a triple)
        no_references = True
        for ts, tp in project_g.subject_predicates(s):
            no_references = False
            
            # If this text was involved with a link, it will have a creator
            # with at least a 'hasBody' tag. Look for the hasBody...
            print "  Usage of %s --- %s | %s" % (s, ts, tp)
            if "http://www.w3.org/ns/oa#hasBody" in tp:
                
                # Found the body. It must hav a hasTarget to be in use.
                # If this is not one of the triples, it is an orphan. As is the creator
                del_me = True
                for ctp, cto in project_g.predicate_objects(ts):
                    print "     Creator %s contains --- %s | %s" % (ts, ctp, cto)
                    if "http://www.w3.org/ns/oa#hasTarget" in ctp:
                        del_me = False
                if del_me == True:
                    #print "%s is orphaned text" % s 
                    if s not in orphans:
                        orphans.append( s ) 
                    if ts not in orphans:
                        orphans.append( ts )
        if no_references == True:
             orphans.append( s ) 
             #print "%s is orphaned text path 2" % s 
                    
    for orphan in orphans:
        print "REMOVE ORPHAN %s" % orphan
        project_g.remove( (orphan, None, None) )
        project_metadata_g.remove( (orphan, None, None) )
                    
    return HttpResponse(status=200)

def delete_triples_from_project(request, uri):
    """Deletes the triples in a graph provided by a request object from the project graph.
    Returns an HttpResponse of all the triples which were successfully removed from the graph."""
    if request.user.is_authenticated():
        if permissions.has_permission_over(uri, user=request.user, permission=NS.perm.mayUpdate):
            removed = Graph()
            bind_namespaces(removed)

            try:
                g = parse_request_into_graph(request)
            except (ParserError, SyntaxError) as e:
                logger.error("Unable to parse serialization.\n%s" % e)
                return HttpResponse(status=400, content="Unable to parse serialization.\n%s" % e)

            project_g = get_project_graph(uri)
            project_metadata_g = get_project_metadata_graph(uri)

            for triple in g:
                # if this is a removal of an aggregate, also remove the TEXT itself
                # FIXME this will probably orphan other stuff
                if "http://www.openarchives.org/ore/terms/aggregates" in triple[1]:
                    project_g.remove( (triple[2],None,None) )
                    project_metadata_g.remove( (triple[2],None,None) )
#                     g2 = resource_annotation_subgraph(project_g, triple[2] )
#                     for ds,do in g2.subject_objects(None):
#                         print "%s %s" % (ds,do)
#                         g2.remove((ds,None,None))
#                     g3 = specific_resources_subgraph(project_g, triple[2], uri)
#                     for ds,do in g3.subject_objects(None):
#                         print "%s %s" % (ds,do)
#                         g3.remove((ds,None,None))
                    
                    
                project_g.remove(triple)
                removed.add(triple)
                project_metadata_g.remove(triple)

            return NegotiatedGraphResponse(request, removed)
        else:
            return HttpResponseForbidden('User "%s" does not have update permissions over project "%s"' % (request.user.username, uri))
    else:
        return HttpResponse(status=401)

# Create the project graph, with all of the required data, and sends it to be saved
# Used for the the create project management command and some part of ProjectView
# # Have we made ProjectView obsolete since we now export data in RDF?
def create_project_graph(host, user, title, project):
    if not project:
        project = uris.uuid()
    elif not (type(project) == URIRef):
        project = URIRef(project)
    g = Graph()
    bind_namespaces(g)
    if not title:
        title = "Default Project"
    g.add((project, NS.rdf.type, NS.foaf.Project))
    g.add((project, NS.rdf.type, NS.dm.Project))
    g.add((project, NS.rdf['type'], NS.dcmitype['Collection']))
    g.add((project, NS.rdf['type'], NS.ore['Aggregation']))
    g.add((project, NS.dc['title'], Literal(title)))
    g.add((project, NS.dcterms['created'], Literal(datetime.utcnow())))

    return g

def add_project_types(graph, project_uri):
    project_uri = URIRef(project_uri)

    for t in PROJECT_TYPES:
        graph.add((project_uri, NS.rdf.type, t))

def project_export_graph(project_uri):
    db_project_graph = get_project_graph(project_uri)
    db_metadata_graph = get_project_metadata_graph(project_uri)
    export_graph = Graph()
    export_graph += db_project_graph
    export_graph += db_metadata_graph

    for text_uri in export_graph.subjects(NS.rdf.type, NS.dcmitype.Text):
        export_graph += text_graph_from_model(text_uri, project_uri)

    return export_graph

def is_top_level_project_resource(project_uri, uri):
    db_project_graph = get_project_graph(project_uri)
    return (URIRef(project_uri), NS.ore.aggregates, uri) in db_project_graph

def clean_project_graph(graph, project_uri):
    """
    Returns a set of all non-orphaned resource uris in a project (i.e., resources which are top level or linked by an annotation).
    (Does a complete graph traversal)
    """
    clean_graph = Graph()
    clean_graph += graph.triples((project_uri, None, None))

    visited = set()
    frontier = set(graph.objects(project_uri, NS.ore.aggregates))

    def enqueue(o):
        if isinstance(o, URIRef):
            if o not in visited:
                frontier.add(o)
        else:
            for i in o:
                enqueue(i)

    while len(frontier) > 0:
        visited_resource = frontier.pop()
        visited.add(visited_resource)

        if (visited_resource, NS.rdf.type, NS.sc.Canvas) in graph:
            # Visiting a Canvas
            clean_graph += canvases.canvas_and_images_graph(graph, visited_resource)
            enqueue(graph.subjects(NS.oa.hasSource, visited_resource))

        elif (visited_resource, NS.rdf.type, NS.dctypes.Text) in graph:
            # Visiting a Text
            clean_graph += graph.triples((visited_resource, None, None))
            content = graph.value(visited_resource, NS.cnt.chars)
            if content:
                for selector in project_texts.selector_uris_in_text_content(unicode(content)):
                    specific_resource = graph.value(None, NS.oa.hasSelector, selector)
                    if specific_resource:
                        enqueue(specific_resource)

        elif (visited_resource, NS.rdf.type, NS.oa.SpecificResource) in graph:
            # Visiting a Specific Resource
            clean_graph += graph.triples((visited_resource, None, None))
            selector = graph.value(visited_resource, NS.oa.hasSelector)
            if selector:
                clean_graph += graph.triples((selector, None, None))


        for anno in itertools.chain(
                graph.subjects(NS.oa.hasTarget, visited_resource),
                graph.subjects(NS.oa.hasBody, visited_resource)
            ):
            clean_graph += graph.triples((anno, None, None))
            for s, p, linked_resource in graph.triples_choices((anno, [NS.oa.hasBody, NS.oa.hasTarget], None)):
                enqueue(linked_resource)

    return clean_graph
