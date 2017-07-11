package edu.drew.dm.rdf;

import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.util.iterator.ExtendedIterator;

import java.util.Collections;
import java.util.HashSet;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.Queue;
import java.util.Set;

public abstract class Traversal implements Iterable<Resource> {

    protected final Resource start;

    protected Traversal(Resource start) {
        this.start = start;
    }

    protected abstract ExtendedIterator<Resource> nextOf(Resource resource);

    @Override
    public Iterator<Resource> iterator() {
        return new Iterator<Resource>() {
            private final Queue<Resource> frontier = new LinkedList<>(Collections.singleton(start));
            private final Set<Resource> visited = new HashSet<>();

            private Resource next;

            @Override
            public boolean hasNext() {
                while (next == null && !frontier.isEmpty()) {
                    next = frontier.remove();
                    if (visited.contains(next)) {
                        next = null;
                        continue;
                    }
                    visited.add(next);
                    nextOf(next).filterDrop(visited::contains).forEachRemaining(frontier::add);
                }
                return (next != null);
            }

            @Override
            public Resource next() {
                final Resource next = this.next;
                this.next = null;
                return next;
            }
        };
    }

    public Model into(Model target) {
        forEach(resource -> target.add(resource.listProperties()));
        return target;
    }

}
