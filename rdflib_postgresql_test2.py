import rdflib
from rdflib.graph import ConjunctiveGraph as Graph
from rdflib import plugin
from rdflib.store import Store
from rdflib.store import NO_STORE
from rdflib.store import VALID_STORE
from rdflib import Literal
from rdflib import Namespace
from rdflib import URIRef

ns = dict(
    dms=Namespace("http://dms.stanford.edu/ns/"),
    sc=Namespace("http://www.shared-canvas.org/ns/"),
    ore=Namespace("http://www.openarchives.org/ore/terms/"),
    dc=Namespace("http://purl.org/dc/elements/1.1/"),
    dcmitype=Namespace("http://purl.org/dc/dcmitype/"),
    exif=Namespace("http://www.w3.org/2003/12/exif/ns#"),
    tei=Namespace("http://www.tei-c.org/ns/1.0/"),
    oac=Namespace("http://www.openannotation.org/ns/"))

default_graph_uri = "http://rdflib.net/rdfstore"
#dsn = "user=dm_user password=dm_user_password host=localhost dbname=dm"
configString = "host=localhost user=dm_user password=dm_user_password dbname=dm"

# Get the mysql plugin. You may have to install the python mysql libraries
store = plugin.get('PostgreSQL', Store)(identifier='rdfstore')

# Open previously created store, or create it if it doesn't exist yet
rt = store.open(configString,create=False)
if rt == NO_STORE:
    # There is no underlying MySQL infrastructure, create it
    store.open(configString,create=True)
else:
    assert rt == VALID_STORE,"There underlying store is corrupted"

# There is a store, use it
graph = Graph(store, identifier = URIRef(default_graph_uri))

query = """SELECT DISTINCT ?resource_url
           WHERE {
               <%s> ore:aggregates ?resource_uri .
               ?resource_uri ore:isDescribedBy ?resource_url
           }""" % 'http://dms-data.stanford.edu/Parker/bc854fy5899/Manifest'
qres = graph.query(query, initNs=ns)
print qres.serialize()


print("Triples in graph before add: %s" % len(graph))

# Now we'll add some triples to the graph & commit the changes
rdflib = Namespace('http://rdflib.net/test/')
#graph.add((rdflib['pic:1'], rdflib['name'], Literal('Jane & Bob')))
#graph.add((rdflib['pic:2'], rdflib['name'], Literal('Squirrel in Tree')))
# g = Graph()
# g.parse('http://dms-data.stanford.edu/Parker/bc854fy5899/Manifest.xml')
# print dir(g.namespace_manager)
# for prefix, uri in g.namespace_manager.namespaces():
#     graph.bind(prefix, uri)
# for s,p,o in g:
#     graph.add((s, p, o))
graph.commit()

print("Triples in graph after add: %s" % len(graph))

# display the graph in RDF/XML
#print(graph.serialize())
