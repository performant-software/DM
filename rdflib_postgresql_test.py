from rdflib import plugin, Graph, URIRef, namespace, term
from rdflib.store import Store, VALID_STORE, NO_STORE
from rdflib.parser import Parser

plugin.register('text/xml', Parser, 'rdflib.plugins.parsers.rdfxml', 'RDFXMLParser')

# Set database DSN, follow the format below, see psycopg2
# documentation for details ...
# http://initd.org/psycopg/docs/module.html#psycopg2.connect
dsn = "user=dm_user password=dm_user_password host=localhost dbname=dm"

# Set a store identifier, can also be a URI, if preferred.
store_id = "my_rdf_store_12"

# Set a default graph uri as an identifier for the Graph
graph_uri = "http://bel-epa.com/data"

# Set up the PostgreSQL plugin. You may have to install the python
# psycopg2 library
store = plugin.get('PostgreSQL', Store)(identifier=store_id)

# Open a previously created store or create it if it doesn't yet exist.
rt = store.open(dsn)
if rt == NO_STORE:
    # There is no underlying PostgreSQL infrastructure, create it
    store.open(dsn, create=True)
else:
    print "store created already"
    assert rt == VALID_STORE, "There underlying store is corrupted"

# Create a Graph
g = Graph(store, identifier=URIRef(graph_uri))

g.add((term.URIRef('http://www.google.com/'), namespace.RDFS.label, term.Literal('Google home page')))
g.add((term.URIRef('http://wikipedia.org/'), namespace.RDFS.label,term.Literal('Wikipedia home page')))

# parse_g = Graph(identifier=URIRef(graph_uri))
# parse_g.parse('http://dms-data.stanford.edu/Parker/bc854fy5899/Manifest.xml')
# for s, p, o in parse_g:
#     g.add((s, p, o))

for s, p, o in g:
    print s, p, o

print g.commit()
g.close()


# And now ...
# g
# <Graph identifier=http://bel-epa.com/data (<class 'rdflib.graph.Graph'>)>

# g.store
# <Parititioned PostgreSQL N3 Store>
