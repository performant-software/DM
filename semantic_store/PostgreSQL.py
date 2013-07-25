from django.db import connection
from django.conf import settings

from rdflib.store import NO_STORE, VALID_STORE
from rdflib_postgresql.PostgreSQL import PostgreSQL as BasePostgreSQL

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


class PostgreSQL(BasePostgreSQL):

    def open(self):
        self._db = connection
        self.configuration = default_configuration()
        if self._db:

            if self.db_exists(configuration=self.configuration):
                return VALID_STORE
            else:
                rt = super(PostgreSQL, self).open(self.configuration, create=False)
                if rt == NO_STORE:
                    print "intializing rdflib store tables"
                    super(PostgreSQL, self).open(self.configuration, create=True)
                else:
                    assert rt == VALID_STORE,"The underlying store is corrupted"
                return VALID_STORE
        else:
            return NO_STORE
    
    def EscapeQuotes(self, qstr):
        if qstr is None:
            return ''
        return qstr.replace('%', '%%')
