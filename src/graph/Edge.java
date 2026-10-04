package graph;

/**
 * Represents a directed or bidirectional road segment with positive travel time/distance.
 */
public class Edge {
    private String targetNodeId;
    private int weight; // Travel time in minutes

    public Edge(String targetNodeId, int weight) {
        if (targetNodeId == null || targetNodeId.trim().isEmpty()) {
            throw new IllegalArgumentException("Target node ID cannot be empty.");
        }
        if (weight <= 0) {
            throw new IllegalArgumentException("Edge weight (travel time) must be strictly positive: " + weight);
        }
        this.targetNodeId = targetNodeId.trim().toUpperCase();
        this.weight = weight;
    }

    public String getTargetNodeId() {
        return targetNodeId;
    }

    public int getWeight() {
        return weight;
    }

    @Override
    public String toString() {
        return "--(" + weight + " min)--> " + targetNodeId;
    }
}
