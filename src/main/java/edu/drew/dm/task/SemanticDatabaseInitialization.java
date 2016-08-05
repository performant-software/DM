package edu.drew.dm.task;

import edu.drew.dm.http.ModelReaderWriter;
import edu.drew.dm.data.SemanticDatabase;
import org.apache.jena.tdb.TDBLoader;
import org.apache.jena.tdb.store.GraphTDB;

import java.util.List;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class SemanticDatabaseInitialization {

    public static SemanticDatabase execute(SemanticDatabase db, List<String> sources) {
        if (db.isEmpty()) {
            TDBLoader.load((GraphTDB) db.dataset().getDefaultModel().getGraph(), sources, true);
            db.write(ds -> {
                ModelReaderWriter.internalize(ds.getDefaultModel());
                return db;
            });
        }
        return db;
    }
}
