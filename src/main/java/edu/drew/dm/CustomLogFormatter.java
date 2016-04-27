package edu.drew.dm;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.Date;
import java.util.logging.Formatter;
import java.util.logging.LogRecord;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class CustomLogFormatter extends Formatter {

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
