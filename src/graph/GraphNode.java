package graph;

/**
 * Represents a junction, checkpoint, or parking facility node in the Idam Nagar road network.
 */
public class GraphNode {
    private String id;
    private String name;

    public GraphNode(String id, String name) {
        if (id == null || id.trim().isEmpty()) {
            throw new IllegalArgumentException("Node ID cannot be empty.");
        }
        this.id = id.trim().toUpperCase();
        this.name = (name != null) ? name.trim() : id;
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    @Override
    public String toString() {
        return id + " (" + name + ")";
    }
}
