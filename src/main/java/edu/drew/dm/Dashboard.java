package edu.drew.dm;

import com.typesafe.config.Config;
import edu.drew.dm.user.User;
import net.jodah.expiringmap.ExpiringMap;

import java.net.URI;
import java.util.Collections;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import javax.inject.Singleton;

@Singleton
public class Dashboard {

    private final Map<String, OpenProject> currentProjects;

    public Dashboard(Config config) {
        currentProjects = ExpiringMap.builder()
                .expiration(config.getDuration("http.session-timeout").toMillis(), TimeUnit.MILLISECONDS)
                .build();

    }

    public void registerCurrentProject(String id, User user, String projectUri) {
        if (!user.isGuest()) {
            currentProjects.put(id, new OpenProject(user.uri, projectUri));
        }
    }

    public void removeCurrentProjects(String id) {
        currentProjects.remove(id);
    }
    
    public Map<String, OpenProject> currentProjects() {
        return Collections.unmodifiableMap(currentProjects);
    }

    public static class OpenProject {
        public final URI user;
        public final String project;

        public OpenProject(URI user, String project) {
            this.user = user;
            this.project = project;
        }
    }
}
