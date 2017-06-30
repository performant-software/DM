package edu.drew.dm;

import com.typesafe.config.Config;
import com.typesafe.config.ConfigFactory;
import edu.drew.dm.data.FileSystem;
import edu.drew.dm.data.Images;
import edu.drew.dm.data.SemanticDatabase;
import org.junit.After;
import org.junit.Before;
import org.junit.BeforeClass;

import java.io.File;
import java.io.IOException;
import java.util.logging.Logger;

public abstract class BaseIT {

    protected Config config;
    protected Logger log;
    protected FileSystem fs;
    protected SemanticDatabase db;
    protected Images images;

    @BeforeClass
    public static void setupLogging() throws IOException {
        Configuration.logging();
    }

    @Before
    public void setup() {
        log = Configuration.logger(getClass().getPackage());
        config = Configuration.application();
        fs = new FileSystem(config);
        db = new SemanticDatabase(fs);
        images = new Images(fs);
    }

    @After
    public void tearDown() {
        if (db != null) {
            db.close();
        }
    }
}
