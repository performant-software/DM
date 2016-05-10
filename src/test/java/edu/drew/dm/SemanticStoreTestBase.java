package edu.drew.dm;

import org.apache.jena.arq.querybuilder.SelectBuilder;
import org.apache.jena.graph.NodeFactory;
import org.apache.jena.sparql.vocabulary.FOAF;
import org.apache.jena.vocabulary.RDF;
import org.apache.jena.vocabulary.RDFS;
import org.junit.After;
import org.junit.Before;
import org.junit.BeforeClass;
import org.junit.Test;

import java.io.File;
import java.io.IOException;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public abstract class SemanticStoreTestBase {

    private static final String TEST_STORE_DIR_SYSTEM_PROPERTY = String.join(".", SemanticStoreTestBase.class.getPackage().getName(), "test-store-dir");
    private static final String TEST_DATA_SYSTEM_PROPERTY = String.join(".", SemanticStoreTestBase.class.getPackage().getName(), "test-data");

    private File configuredStoreDirectory;

    protected SemanticStore semanticStore;

    @BeforeClass
    public static void initLogging() throws IOException {
        Logging.configure();
    }

    @Before
    public void createStore() {
        semanticStore = new SemanticStore(storeDirectory());

        final String testData = System.getProperty(TEST_DATA_SYSTEM_PROPERTY);
        if (testData != null) {
            semanticStore.withInitialData(Stream.of(new File(testData).listFiles((dir, name) -> {
                return name.toLowerCase().endsWith(".ttl");
            })).map(File::getPath).sorted().collect(Collectors.toList()));
        }
    }

    @After
    public void closeStore() throws IOException {
        if (semanticStore != null) {
            semanticStore.close();
        }
        if (configuredStoreDirectory == null) {
            Files.walkFileTree(semanticStore.getBase().toPath(), new SimpleFileVisitor<Path>() {
                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                    Files.delete(file);
                    return super.visitFile(file, attrs);
                }

                @Override
                public FileVisitResult postVisitDirectory(Path dir, IOException e) throws IOException {
                    if (e == null) {
                        Files.delete(dir);
                    }
                    return super.postVisitDirectory(dir, e);
                }
            });
        }
    }

    protected File storeDirectory() {
        configuredStoreDirectory = Optional.ofNullable(System.getProperty(TEST_STORE_DIR_SYSTEM_PROPERTY)).map(File::new).orElse(null);
        return configuredStoreDirectory == null
                ? new File(System.getProperty("java.io.tmpdir", "."), String.join("-", "dm", UUID.randomUUID().toString()))
                : configuredStoreDirectory;
    }
}
