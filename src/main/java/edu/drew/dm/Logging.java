package edu.drew.dm;

import java.io.IOException;
import java.io.InputStream;
import java.util.logging.LogManager;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class Logging {

    public static void configure() throws IOException {
        if (System.getProperty("java.util.logging.config.file", "").isEmpty()) {
            try (InputStream logConfig = Server.class.getResourceAsStream("/logging.properties")) {
                LogManager.getLogManager().readConfiguration(logConfig);
            }
        }
    }
}
