import sys

from django.db import connection, transaction
from django.conf import settings

from rdflib.store import NO_STORE, VALID_STORE
from rdflib_postgresql.PostgreSQL import PostgreSQL as BasePostgreSQL
import rdflib


def default_configuration():
    if len(settings.DATABASES.keys()) == 1:
        dblabel = 'default'
    else:
        dblabel = 'rdfstore'
    cfgstr = "host=%s user=%s password=%s dbname=%s" % (
        settings.DATABASES[dblabel]['HOST'],
        settings.DATABASES[dblabel]['USER'],
        settings.DATABASES[dblabel]['PASSWORD'],
        settings.DATABASES[dblabel]['NAME'],
        )
    return cfgstr


#class PostgreSQL(rdflib_postgresql.PostgreSQL.PostgreSQL):
#class PostgreSQL(rdflib.store.MySQL.PostgreSQL):
class PostgreSQL(BasePostgreSQL):

    def open(self):
        self._db = connection
        self.configuration = default_configuration()
        print "configuration:", self.configuration
        if self._db:
            # if create:
            #     #sys.stderr.write("Calling init_db\n")
            #     self.init_db(configuration=configuration)

            if self.db_exists(configuration=self.configuration):
                #sys.stderr.write("Returning VALID_STORE\n")
                return VALID_STORE
            else:
                rt = super(PostgreSQL, self).open(self.configuration, create=False)
                if rt == NO_STORE:
                    print "intializing rdflib store tables"
                    super(PostgreSQL, self).open(self.configuration, create=True)
                else:
                    assert rt == VALID_STORE,"The underlying store is corrupted"
                return VALID_STORE
#                self._db = None
                #sys.stderr.write("Returning NO_STORE\n")
#                return NO_STORE
        else:
            #sys.stderr.write("Returning NO_STORE\n")
            return NO_STORE
        #sys.stderr.write("'open' returning\n")
    
    def EscapeQuotes(self, qstr):
        if qstr is None:
            return ''
        return qstr.replace('%', '\%')
