from rdflib.term import URIRef, Literalfrom rdflib.namespace import Namespacefrom rdflib.graph import Graph
from annotation_store.webservice.models import *
from django.conf import settingsfrom django.core.exceptions import ObjectDoesNotExist, MultipleObjectsReturnedfrom django.contrib.auth.models import User
from uuid import uuid4

from re import findallIMG_SRC = settings.BASE_URL + settings.MEDIA_URL + 'user_images/'
# URI of each type we are using in the project linked to simple string of typeTYPE_URI = {    'text':'http://purl.org/dc/dcmitype/Text',    'canvas':'http://www.shared-canvas.org/ns/Canvas',    'anno':'http://www.openannotation.org/ns/Annotation',    'image':'http://purl.org/dc/dcmitype/Image',    'SpecificResource':'http://www.openannotation.org/ns/SpecificResource',    'highlight':'http://www.openannotation.org/extension/Highlight',
    'collection':'http://purl.org/dc/dcmitype/Collection',
    'aggregation':'http://www.openarchives.org/ore/terms/Aggregation',
    'agent':'http://xmlns.com/foaf/0.1/Agent',
    'svg':"http://www.openannotation.org/ns/SvgSelector",
    'contentastext':'http://www.w3.org/2011/content#ContentAsText',}
# Namespaces we will be using, declared globally for easy referenceOA    = Namespace("http://www.w3.org/ns/oa#")RDF   = Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#")ORE   = Namespace("http://www.openarchives.org/ore/terms/")DC    = Namespace("http://purl.org/dc/elements/1.1/")EXIF  = Namespace("http://www.w3.org/2003/12/exif/ns#")CNT   = Namespace("http://www.w3.org/2011/content#")
PERM  = Namespace("http://vocab.ox.ac.uk/perm#")
FOAF  = Namespace("http://xmlns.com/foaf/0.1/")IMGS  = Namespace(IMG_SRC)
# Integer type for the height/width declarationsINT     = "http://www.w3.org/2001/XMLSchema#integer"
# SVG strings with string formatting operators (%s) for each data valueSVG     = {'polygon':"<polygon xmlns=\'http://www.w3.org/2000/svg\' fill=\'rgba(15, 108, 214, 0.6)\' stroke=\'rgba(3, 75, 158, 0.7)\' stroke-width=\'%s\' points=\'%s\' />",           'circle':"<circle xmlns=\'http://www.w3.org/2000/svg\' fill=\'rgba(15, 108, 214, 0.6)\'  stroke=\'rgba(3, 75, 158, 0.7)\' stroke-width=\'%s\' cx=\'%s\' cy=\'%s\' r=\'%s\' />",           'polyline':"<polyline xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' stroke=\'rgba(3, 75, 158, 0.7)\' stroke-width=\'%s\' points=\'%s\' />",           }
# URL for the base of user URIs
# Hard-coded to be understood properly in the new version
USER_URL_BASE = 'http://dm.drew.edu/store/users/'
# Dictionary for mapping User object to a custom uuid, which is the uuid of the
#  user's default projectuser_mapping = {}

# Dictionary for mapping each r_id of an item to a custom uuid so as to be
#  understood by the new versionr_id_mapping = {}

# These are r_ids which should be annos, except that no triples
#  about them exist
# Used by get_mapped_uri
bad_r_ids = ["95470", "235609", "275822", "275857", "275860", "275865", "279188", "279205", "279228", "280257", "281629", "284706", "284718", "284721", "284912", "285385", "286279", "286284", "263621"]def print_me():
    #return just_one_user("lisafdavis@yahoo.com")
    return all_users()
    #return just_one_user("alex.fleck3@gmail.com")

def just_one_user(name):
    # Create a graph in which to hold all the data
    everything_graph = instantiate_graph()

    # Map all users to a custom uri (for their project)    map_users()

    # For testing purposes, just look at one of the users
    user = User.objects.get(username=name)

    # Add all the data to everything_graph
    # Each of these methods returns a Graph object, which is implemented so
    #  that the += syntax is a valid operation
    everything_graph += handle_canvases(user)
    everything_graph += handle_circles(user)
    everything_graph += handle_polygons(user)
    everything_graph += handle_polylines(user)
    everything_graph += handle_constraints(user)
    everything_graph += handle_images(user)
    everything_graph += handle_texts(user)
    everything_graph += handle_user(user)

    # Annos are special because we need to check that there is information
    #  about them in the larger graph as well
    everything_graph += handle_annos(user, everything_graph)
    everything_graph.serialize("0.xml",format="xml")    return everything_graph

def all_users():
    everything_graph = instantiate_graph()
    i = 0;

    for user in User.objects.filter():
        name = user.username
        print name
        user_graph = just_one_user(name)
        user_graph.serialize("output/%s.xml"%(i), format="xml")
        i += 1


# Canvases, although gotten by username, are structured as global data
# ((only gotten by username to shorten query time for testing purposes))
def handle_canvases(user):    graph = instantiate_graph()    canvases = Canvas.objects.filter(user=user, valid=True, most_recent=True)    for i in range(len(canvases)):        canvas = canvases[i]
        graph += add_canvas(canvas, get_mapped_user(user))
    
    return graph

def add_canvas(canvas, project):
    graph = instantiate_graph()

    # Get uri
    uri = get_mapped_uri(canvas.r_id)

    # Add data to graph
    graph.add((uri, RDF['type'],TYPE_URI['canvas']))
    title = canvas.name.replace('"', '&quot;')
    graph.add((uri, DC['title'],Literal(title)))
    graph.add((uri, EXIF['height'], Literal(canvas.height, datatype=INT)))
    graph.add((uri, EXIF['width'], Literal(canvas.width, datatype=INT)))
    graph.add((project, ORE['aggregates'], uri))
    graph.add((project, PERM['hasPermissionOver'], uri))
    graph.add((project, PERM['mayRead'], uri))

    return graph


# Circles, polygons, and polylines are similar -- only the SVG syntax differs
# Basic method: Cycle through all valid, most recent circles, call method to
#  get height & width of canvas out of the constraints, transform this for
#  the SVG syntax, supplement all required elements of SVG element
# Returns data in a graph
def handle_circles(user):
    graph = instantiate_graph()
    circles = Circle.objects.filter(user=user, valid=True, most_recent=True)

    for i in range(len(circles)):
        # Get r_id; make a uri out of it
        # We need the unchanged r_id to ask the annotations for where this circle belongs
        circle = circles[i]
        r_id = circle.r_id
        uri = get_mapped_uri(r_id)

        height, width = get_height_width_from_constraint(r_id)
        
        # Check that the height and width are valid data
        if height != 0 and width != 0:
            # Add data about circle to graph
            graph.add((uri, RDF['type'], TYPE_URI['svg']))
            graph.add((uri, RDF['type'], TYPE_URI['contentastext']))


            graph.add((uri, CNT['chars'], Literal(SVG['circle']%(circle.stroke_width, width * circle.cx, height * circle.cy, circle.radius))))

    return graph


# Circles, polygons, and polylines are similar -- only the SVG syntax differs
# Basic method: Cycle through all valid, most recent polygons, call method to
#  get height & width of canvas out of the constraints, transform this for
#  the SVG syntax, supplement all required elements of SVG element
# Returns data in a graph
def handle_polygons(user):
    graph = instantiate_graph()
    polygons = Polygon.objects.filter(user=user, valid=True, most_recent=True)

    for i in range(len(polygons)):
        # Get r_id; make a uri out of it
        # We need the unchanged r_id to ask the annotations for where this polygon belongs
        polygon = polygons[i]
        r_id = polygon.r_id
        uri = get_mapped_uri(r_id)

        height, width = get_height_width_from_constraint(r_id)

        # Check that the height and width are valid data
        if height != 0 and width != 0:        
        # Add data about polygon to graph
            graph.add((uri, RDF['type'], TYPE_URI['svg']))
            graph.add((uri, RDF['type'], TYPE_URI['contentastext']))

            graph.add((uri, CNT['chars'], Literal(SVG['polygon']%(polygon.stroke_width, transform_poly_points(polygon.points, height, width)))))

    return graph


# Circles, polygons, and polylines are similar -- only the SVG syntax differs
# Basic method: Cycle through all valid, most recent polylines, call method to get height &
#  width of canvas out of the constraints, transform this for the SVG syntax, supplement all
#  required elements of SVG element
# Returns data in a graph
def handle_polylines(user):
    graph = instantiate_graph()
    polylines = Polyline.objects.filter(user=user, valid=True, most_recent=True)

    for i in range(len(polylines)):
        # Get r_id; make a uri out of it
        # We need the unchanged r_id to ask the annotations for where this polyline belongs
        polyline = polylines[i]
        r_id = polyline.r_id
        uri = get_mapped_uri(r_id)

        height, width = get_height_width_from_constraint(r_id)
        
        # Check that the height and width are valid data
        if height != 0 and width != 0:
            # Add data about polyline to graph
            graph.add((uri, RDF['type'], TYPE_URI['svg']))
            graph.add((uri, RDF['type'], TYPE_URI['contentastext']))

            graph.add((uri, CNT['chars'], Literal(SVG['polyline']%(polyline.stroke_width, transform_poly_points(polyline.points, height, width)))))

    return graph

# Gets all constraints owned by <user> and adds them to a Graph
def handle_constraints(user):
    graph = instantiate_graph()
    constraints = Constraint.objects.filter(user=user, valid=True, most_recent=True)

    for i in range(len(constraints)):
        # We need the r_id in order to look up Triples about the constraint
        constraint = constraints[i]
        r_id = constraint.r_id
        uri = get_mapped_uri(r_id)

        # Find the objects linked with this constraints
        source = get_correct_constrained_item(r_id)
        selector = get_correct_constraining_item(r_id)

        # Make sure this data is valid before adding it
        if (source and selector):
            # Add all the information about this constraint to the graph
            graph.add((uri, OA['hasSource'], get_mapped_uri(source)))
            graph.add((uri, OA['hasSelector'], get_mapped_uri(selector)))
            graph.add((uri, RDF['type'], TYPE_URI['SpecificResource']))

    return graph

# Gets all images owned by <user> and collects the data in a Graph
def handle_images(user):
    graph = instantiate_graph()
    images = Image.objects.filter(user=user, valid=True, most_recent=True)

    for i in range(len(images)):
        # For images, the uri is the url at which the image exists
        image = images[i]

        # If src_url is defined, use that; otherwise create one
        if (image.src_url):
            uri = image.src_url
        else:
            uri = IMG_SRC + image.r_id + ".jpg"

        # Map this r_id to this uri
        r_id_mapping[image.r_id] = uri

        # This has to be a URIRef in order for the graph to accept it
        uri = URIRef(uri)

        # Thumbnails are being dynamically generated in the new version, so
        #  we don't need to work about thumbnails saved in the old version
        title = image.name.replace('"','&quot;')
        if not (("thumb of" in title) or ("(thumb)" in title)):
            # If not a thumbnail, add all relevant data to graph
            graph.add((uri, DC['title'], Literal(title)))
            graph.add((uri, EXIF['height'], Literal(image.height, datatype=INT)))
            graph.add((uri, EXIF['width'], Literal(image.width, datatype=INT)))
            graph.add((uri, RDF['type'], TYPE_URI['image']))

    return graph

# Collects all texts belonging to <user> in a Graph
# Annotations are sent with <oa:motivatedBy> <oa:commenting> 
# Each content will be parsed for possible highlights
def handle_texts(user):
    graph = instantiate_graph()
    texts = Text.objects.filter(user=user, valid=True, most_recent=True)

    for i in range(len(texts)):
        # Generate and/or find uri
        text = texts[i]
        uri = get_mapped_uri(text.r_id)

        # Add relevant data to graph
        title = text.title.replace('"', '&quot;')
        graph.add((uri, DC['title'], Literal(title)))
        content = text.content.replace('"','&quot;')
        graph.add((uri, CNT['chars'], Literal(content)))
        graph.add((uri, RDF['type'], TYPE_URI['text']))

        # Mark annotations as such
        # The new version will know to look for the annotation discussing this
        #  text and correctly link the text to the annotatiom
        if text.purpose == 'anno':
            graph.add((uri, OA['motivatedBy'], OA['commenting']))
        # Non-annotating texts become personal resources for the user, so they must be 
        #  individually connected to the project
        # (All objects handled previously which depend on user are linked to the user through 
        #  annotations, which are directly connected to their default project
        else:
            project = get_mapped_user(user)
            graph.add((project, ORE['aggregates'], uri))

        #Parse for highlights
        graph += parse_for_highlights(text.content, uri)

    return graph

# Finds highlights within text which is wrapped with span tags, then adds the data to a graph
def parse_for_highlights(content, content_uri):
    graph = instantiate_graph()

    # Regex string for extract r_id and content from text
    regex = r'<span class="[a-z\-\s]*ID\-(\d*?)">(.*?)</span>'
    split_content = findall(regex,content)

    for r_id, text in split_content:
        # Get uri of highlight
        uri = get_mapped_uri(r_id)

        # Create uri for highlight selector
        selector_uri = URIRef(uuid4().urn)
                
        # Add information about highlight
        graph.add((uri, OA['hasSource'], content_uri))
        graph.add((uri, OA['hasSelector'], selector_uri))
        graph.add((uri, RDF['type'], OA['SpecificResource']))

        # Add information about selector
        graph.add((selector_uri, OA['exact'], Literal(text)))
        graph.add((selector_uri, RDF['type'], OA['TextQuoteSelector']))


    return graph
        

# Get all annotations belonging to <user> and link them to that user's project
# Still need to consider what happens when there is a most recent, valid annotation that points to resource(s) that are not most recent/valid
def handle_annos(user, parent_graph):
    graph = instantiate_graph()
    annos = Anno.objects.filter(user = user, most_recent = True, valid = True)

    for i in range(len(annos)):
        # We need the r_id to ask the triples for information about the anno
        anno = annos[i]
        r_id = anno.r_id
        uri = get_mapped_uri(r_id)

        try:
            target = Triple.objects.get(subj=r_id, pred='oac:hasTarget', most_recent=True, valid=True).obj
        except ObjectDoesNotExist:
            pass
        except MultipleObjectsReturned:
            target = Triple.objects.filter(subj=r_id, pred='oac:hasTarget', most_recent=True, valid=True)[0].obj

        try:
            body = Triple.objects.get(subj=r_id, pred='oac:hasBody', most_recent=True, valid=True).obj
        except ObjectDoesNotExist:
            pass
        except MultipleObjectsReturned:
            target = Triple.objects.filter(subj=r_id, pred='oac:hasBody', most_recent=True, valid=True)[0].obj

        if (target and body):
            target_uri = get_mapped_uri(target)
            body_uri = get_mapped_uri(body)

            # Add information about anno
            graph.add((uri, OA['hasTarget'], get_mapped_uri(target)))
            graph.add((uri, OA['hasBody'], get_mapped_uri(body)))
            graph.add((uri, RDF['type'], TYPE_URI['anno']))

            # Link anno to project
            graph.add((get_mapped_user(user), ORE['aggregates'], uri))

    return graph


# Create the graph with data about a user and their default project
def handle_user(user):
    graph = instantiate_graph()

    uri = get_mapped_user(user)

    # Add data about project
    graph.add((uri, RDF['type'], TYPE_URI['collection']))
    graph.add((uri, RDF['type'], TYPE_URI['aggregation']))
    graph.add((uri, DC['title'], Literal("Default Title")))

    user_uri = get_user_uri(user)
    
    # Add data about user
    graph.add((user_uri, ORE['aggregates'], uri))
    graph.add((user_uri, PERM['hasPermissionOver'], uri))
    graph.add((user_uri, RDF['type'], TYPE_URI['agent']))
    graph.add((user_uri, FOAF['mbox'], URIRef("mailto:"+user.email)))

    return graph

# Create uris for the users which will be valid in the new dm
def get_user_uri(user):
    return URIRef(USER_URL_BASE + user.username)

# Gets the height and width of a canvas that constrains a given r_id
# Used to get height and width in absolute to transform a string of points into absolute and
#  not relative data
def get_height_width_from_constraint(r_id):
    # Get constraint which points to this r_id
    constraint = Triple.objects.get(subj_type='constraint', pred='oac:constrainedBy', obj=r_id, most_recent=True, valid=True).subj

    # Find out what canvas that constrains
    canvas_r_id = get_correct_constrained_canvas(constraint)

    # Get that canvas
    canvas = get_correct_canvas(canvas_r_id)

    try:
        h = canvas.height
    except AttributeError:
        h = 0
        w = 0
    else:
        w = canvas.width

    return (h,w)

def get_correct_canvas(r_id):
    try:
        c = Canvas.objects.get(r_id=r_id, valid=True, most_recent=True)
    except ObjectDoesNotExist:
        c = None
    except MultipleObjectsReturned:
        c = Canvas.objects.filter(r_id=r_id, valid=True, most_recent=True)[0]
    return c

def get_correct_constrained_canvas(subj):
    try:
        c = Triple.objects.get(subj=subj, pred='oac:constrains', most_recent=True, valid=True).obj
    except ObjectDoesNotExist:
        c = None
    except MultipleObjectsReturned:
        c = Triple.objects.filter(subj=subj, pred='oac:constrains', valid=True, most_recent=True)[0].obj

    return c

def get_correct_constraining_item(r_id):
    try:
        a = Triple.objects.get(subj = r_id, pred='oac:constrainedBy', most_recent=True, valid=True).obj
    except ObjectDoesNotExist:
        a = None        
    
    return a

def get_correct_constrained_item(r_id):
    try:
        a = Triple.objects.get(subj = r_id, pred='oac:constrains', most_recent=True, valid=True).obj
    except ObjectDoesNotExist:
        a = None
    
    return a


# Transforms a string of points formatted as x1,y1,x2,y2,x3,y3,... that are stored relative to
#  the height/width of the canvas on which they are located into a string of points 
#  x1,y1 x2,y2 x3,y3,... in absolute terms
# List of points and height & width of canvas are parameters, not generated
def transform_poly_points(points, height, width):
    points_list = points.split(',')
    transformed_points = ""

    for i in range(len(points_list)):
        if (i%2 == 0):
            transformed_points += str(int(float(points_list[i]) * width)) + ","
        else:
            y = 1 - float(points_list[i])
            transformed_points += str(int(y * height)) + " "

    return transformed_points[:-1]

# Quick function to either create a uri for a user, or return the one that has already been
#  mapped to that user
def get_mapped_user(user):
    try:
        uri = user_mapping[user]
    except KeyError:
        uri = uuid4().urn
        user_mapping[user] = uri

    return URIRef(uri)        

# Quick function to either create a uri for a given r_id, or return the one that has already
#  been mapped to that r_id
def get_mapped_uri(r_id):
    # Look for the r_id in the r_id mapping
    # If it's a new r_id, create custom uri and map it to r_id

    if r_id not in bad_r_ids:
        try:
            uri = r_id_mapping[r_id]
        except KeyError:
            # Create custom uri and map it to the r_id
            uri = uuid4().urn            r_id_mapping[r_id]=uri

        return URIRef(uri)

    return None

# Maps each user to a custom uri
# This may be better thought of as mapping a user to the uri of their project
def map_users():
    users = User.objects.filter()
    for i in range(len(users)):
        get_mapped_user(users[i])

# Create a new Graph object and bind all of the namespaces we will be using
def instantiate_graph():
    g = Graph()

    g.bind('rdf',  "http://www.w3.org/1999/02/22-rdf-syntax-ns#")
    g.bind('ore',  "http://www.openarchives.org/ore/terms/")
    g.bind('dc',   "http://purl.org/dc/elements/1.1/")
    g.bind('exif', "http://www.w3.org/2003/12/exif/ns#")
    g.bind('cnt',  "http://www.w3.org/2008/content#")
    g.bind('perm', "http://vocab.ox.ac.uk/perm#")
    g.bind('oa',   "http://www.openannotation.org/ns/")
    g.bind('foaf', "http://xmlns.com/foaf/0.1/")

    return g
