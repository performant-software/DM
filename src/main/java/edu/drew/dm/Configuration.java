package edu.drew.dm;

import com.typesafe.config.Config;
import com.typesafe.config.ConfigFactory;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.Date;
import java.util.logging.LogManager;
import java.util.logging.LogRecord;
import java.util.logging.Logger;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class Configuration {

    public static void logging() throws IOException {
        if (System.getProperty("java.util.logging.config.file", "").isEmpty()) {
            try (InputStream logConfig = Server.class.getResourceAsStream("/logging.properties")) {
                LogManager.getLogManager().readConfiguration(logConfig);
            }
        }
    }

    public static Config application() {
        final Logger log = logger(Configuration.class);

        final File localConfigFile = new File("local.conf");
        if (localConfigFile.isFile()) {
            final String localConfigPath = localConfigFile.getAbsolutePath();
            log.info(String.format("Configuring application via %s", localConfigPath));
            System.setProperty("config.file", localConfigPath);
        }

        final Config config = ConfigFactory.load();
        log.finer(() -> String.format(
                "Configuration: %s",
                config.root().render()
        ));
        return config;
    }

    public static Logger logger(String name) {
        return Logger.getLogger(name);
    }

    public static Logger logger(Package pkg) {
        return logger(pkg.getName());
    }

    public static Logger logger(Class<?> clz) {
        return logger(clz.getName());
    }

    public static class LogFormatter extends java.util.logging.Formatter {

        private final Date date = new Date();

        @Override
        public synchronized String format(LogRecord record) {
            date.setTime(record.getMillis());

            final String loggerName = record.getLoggerName();
            final String source = record.getSourceClassName() != null ? record.getSourceClassName() : loggerName;
            final String message = formatMessage(record);

            String throwable = "";
            if (record.getThrown() != null) {
                StringWriter sw = new StringWriter();
                PrintWriter pw = new PrintWriter(sw);
                pw.println();
                record.getThrown().printStackTrace(pw);
                pw.close();
                throwable = sw.toString();
            }

            return String.format("%1$tY-%1$tm-%1$td %1$tH:%1$tM:%1$tS %4$10s [%2$-50s] <%6$-50s> %5$s%7$s%n",
                    date,
                    suffix(source, 50),
                    loggerName,
                    record.getLevel().getName(),
                    message,
                    suffix(Thread.currentThread().toString(), 50),
                    throwable
            );
        }

        protected static String suffix(String str, int length) {
            return (str.length() <= length ? str : str.substring(str.length() - length));
        }
    }
}
