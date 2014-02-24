from rdflib import plugin, URIRef, Literal, Graph, BNode, Variable
from rdflib.store import Store
from rdflib.query import Result
from rdflib.plugins.stores.sparqlstore import SPARQLUpdateStore, TraverseSPARQLResultDOM
from django.conf import settings
import re
import urllib

import sys
if getattr(sys, 'pypy_version_info', None) is not None \
    or sys.platform.startswith('java') \
        or sys.version_info[:2] < (2, 6):
    # import elementtree as etree
    from elementtree import ElementTree
    assert ElementTree
else:
    try:
        from xml.etree import ElementTree
        assert ElementTree
    except ImportError:
        from elementtree import ElementTree

from SPARQLWrapper import SPARQLWrapper

class FourStore(SPARQLUpdateStore):
    """
    An RDFLib store based around the rdflib 4.0.0 implementation of a SPARQLUpdateStore
    to deal with issues with named graphs
    """
    def inject_sparql_bindings(self, query, initBindings):
        binds = ['BIND (%s AS ?%s)' % (value.n3(), var) for var, value in initBindings.items()]

        i2 = query.rindex("}")
        query = query[:i2] + '\n'.join(binds) + '\n' + query[i2:]

        return query

    def query(self, query,
              initNs={},
              initBindings={},
              queryGraph=None,
              DEBUG=False):
        self.debug = DEBUG
        assert isinstance(query, basestring), 'Query is not a string'
        self.setNamespaceBindings(initNs)
        if initBindings:
            query = self.inject_sparql_bindings(query, initBindings)

        self.resetQuery()

        if self.context_aware and queryGraph and queryGraph != '__UNION__':
            # we care about context

            if not re.search('[\s{]GRAPH[{\s]', query, flags=re.I):
                # if a GRAPH clause was already specified, move on...

                # insert GRAPH clause after/before first/last { }
                # not 100% sure how rock-steady this is
                i1 = query.index("{") + 1
                i2 = query.rindex("}")
                query = query[:i1] + ' GRAPH %s { ' % queryGraph.n3() + \
                    query[i1:i2] + ' } ' + query[i2:]

        self.setQuery(query)

        return Result.parse(SPARQLWrapper.query(self).response)

    def triples(self, (s, p, o), context=None):
        if ( isinstance(s, BNode) or
             isinstance(p, BNode) or 
             isinstance(o, BNode) ): 
            raise Exception("SPARQLStore does not support Bnodes! See http://www.w3.org/TR/sparql11-query/#BGPsparqlBNodes")

        vars = []
        if not s:
            s = Variable('s')
            vars.append(s)

        if not p:
            p = Variable('p')
            vars.append(p)
        if not o:
            o = Variable('o')
            vars.append(o)

        if vars:
            v = ' '.join([term.n3() for term in vars])
        else:
            v = '*'

        if self.context_aware and context is not None:
            query = "SELECT %s WHERE { GRAPH %s { %s %s %s } }" % \
                (v, context.identifier.n3(),
                 s.n3(), p.n3(), o.n3())
        else:
            query = "SELECT %s WHERE { %s %s %s }" % \
                (v, s.n3(), p.n3(), o.n3())

        self.setQuery(query)
        doc = ElementTree.parse(SPARQLWrapper.query(self).response)
        # ElementTree.dump(doc)
        for rt, vars in TraverseSPARQLResultDOM(doc, asDictionary=True):
            yield (rt.get(s, s),
                   rt.get(p, p),
                   rt.get(o, o)), None

    def triples_choices(self, (s, p, o), context=None):
        if ( isinstance(s, BNode) or
             isinstance(p, BNode) or 
             isinstance(o, BNode) ): 
            raise Exception("SPARQLStore does not support Bnodes! See http://www.w3.org/TR/sparql11-query/#BGPsparqlBNodes")

        vars = []
        filter_bodies = []
        if not s:
            s = Variable('s')
            vars.append(s)
        elif isinstance(s, list):
            filter_bodies.append(' || '.join('?s = %s' % s_choice.n3() for s_choice in s))
            s = Variable('s')
            vars.append(s)

        if not p:
            p = Variable('p')
            vars.append(p)
        elif isinstance(p, list):
            filter_bodies.append(' || '.join('?p = %s' % p_choice.n3() for p_choice in p))
            p = Variable('p')
            vars.append(p)

        if not o:
            o = Variable('o')
            vars.append(o)
        elif isinstance(o, list):
            filter_bodies.append(' || '.join('?o = %s' % o_choice.n3() for o_choice in o))
            o = Variable('o')
            vars.append(o)

        if vars:
            v = ' '.join([term.n3() for term in vars])
        else:
            v = '*'

        query = "SELECT ?s ?p ?o WHERE { GRAPH %s { %s %s %s . %s} }" % \
            (context.identifier.n3() if context else Variable('context').n3(),
             s.n3(), p.n3(), o.n3(),
             ''.join('FILTER(%s) .' % f for f in filter_bodies))

        self.setQuery(query)
        doc = ElementTree.parse(SPARQLWrapper.query(self).response)
        for rt, vars in TraverseSPARQLResultDOM(doc, asDictionary=True):
            yield (rt.get(s, s),
                   rt.get(p, p),
                   rt.get(o, o)), None

    def __len__(self, context=None):
        if not self.sparql11:
            raise NotImplementedError(
                "For performance reasons, this is not" +
                "supported for sparql1.0 endpoints")
        else:
            if self.context_aware and context is not None:
                q = "SELECT (count(*) as ?c) WHERE { GRAPH %s {?s ?p ?o .}}" % (
                    context.identifier.n3())
            else:
                q = "SELECT (count(*) as ?c) WHERE { GRAPH ?anygraph {?s ?p ?o .}}"
            self.setQuery(q)
            doc = ElementTree.parse(SPARQLWrapper.query(self).response)
            rt, vars = iter(
                TraverseSPARQLResultDOM(doc, asDictionary=True)).next()
            return int(rt.get(Variable("c")))

    def contexts(self, triple=None):
        if triple:
            s, p, o = triple
        else:
            s = p = o = None

        params = ((s if s else Variable('s')).n3(),
                  (p if p else Variable('p')).n3(),
                  (o if o else Variable('o')).n3())

        self.setQuery(
            'SELECT DISTINCT ?name WHERE { GRAPH ?name { %s %s %s }}' % params)
        doc = ElementTree.parse(SPARQLWrapper.query(self).response)

        return (rt.get(Variable("name"))
                for rt, vars in TraverseSPARQLResultDOM(doc, asDictionary=True))

    def _do_update(self, update):
        update = urllib.urlencode({'update': unicode(update).encode('utf-8')})
        self.connection.request('POST', self.path, update, self.headers)
        return self.connection.getresponse()

    def update(self, query,
               initNs={},
               initBindings={},
               queryGraph=None,
               DEBUG=False):
        self.debug = DEBUG
        assert isinstance(query, basestring)
        self.setNamespaceBindings(initNs)
        query = self.injectPrefixes(query)

        if initBindings:
            query = self.inject_sparql_bindings(query, initBindings)
            print query

        r = self._do_update(query)
        if r.status not in (200, 204):
            raise Exception("Could not update: %d %s\n%s" % (r.status, r.reason, r.read()))

    def addN(self, quads):
        """ Add a list of quads to the store. """
        if not self.connection:
            raise Exception("UpdateEndpoint is not set - call 'open'")

        data = list()
        for subject, predicate, obj, context in quads:
            if ( isinstance(subject, BNode) or
                 isinstance(predicate, BNode) or
                 isinstance(obj, BNode) ):
                raise Exception("SPARQLStore does not support Bnodes! "
                                "See http://www.w3.org/TR/sparql11-query/#BGPsparqlBNodes")

            triple = "%s %s %s ." % (subject.n3(), predicate.n3(), obj.n3())
            data.append("INSERT DATA { GRAPH <%s> { %s } };\n" % (context.identifier, triple))
        r = self._do_update(''.join(data))
        if r.status not in (200, 204):
            raise Exception("Could not update: %d %s\n%s" % (
                r.status, r.reason, r.read()))


plugin.register('SQLAlchemy', Store, 'rdflib_sqlalchemy.SQLAlchemy', 'SQLAlchemy')

default_identifier = URIRef(settings.RDFLIB_STORE_GRAPH_URI)

if not (hasattr(settings, 'FOUR_STORE_URIS') and 'SPARQL' in settings.FOUR_STORE_URIS and 'UPDATE' in settings.FOUR_STORE_URIS):
    store = plugin.get('SQLAlchemy', Store)(identifier=default_identifier)
    store.open(Literal(settings.RDFLIB_DB_URI))
else:
    store = FourStore(settings.FOUR_STORE_URIS['SPARQL'], settings.FOUR_STORE_URIS['UPDATE'])

    sqlalchemy_store = plugin.get('SQLAlchemy', Store)(identifier=default_identifier)
    sqlalchemy_store.open(URIRef(settings.RDFLIB_DB_URI))

def rdfstore():
    return store

def copy_to_store(old_store, new_store):
    for context in old_store.contexts():
        old_graph = Graph(old_store, context)
        new_graph = Graph(new_store, context)
        for t in old_graph:
            new_graph.add(t)
