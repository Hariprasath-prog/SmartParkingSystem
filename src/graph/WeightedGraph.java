package graph;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Weighted Graph implementation representing the Idam Nagar road network.
 * Stores road intersections as nodes and road connections with travel times as adjacency lists.
 */
public class WeightedGraph {
    private final Map<String, GraphNode> nodes;
    private final Map<String, List<Edge>> adjacencyList;

    public WeightedGraph() {
        this.nodes = new HashMap<>();
        this.adjacencyList = new HashMap<>();
    }

    public void addNode(String id, String name) {
        String key = id.trim().toUpperCase();
        GraphNode node = new GraphNode(key, name);
        nodes.put(key, node);
        adjacencyList.putIfAbsent(key, new ArrayList<>());
    }

    public void addEdge(String from, String to, int weight, boolean bidirectional) {
        String fromKey = from.trim().toUpperCase();
        String toKey = to.trim().toUpperCase();

        if (!nodes.containsKey(fromKey) || !nodes.containsKey(toKey)) {
            throw new IllegalArgumentException("Both nodes (" + fromKey + ", " + toKey + ") must exist in graph.");
        }

        adjacencyList.get(fromKey).add(new Edge(toKey, weight));
        if (bidirectional) {
            adjacencyList.get(toKey).add(new Edge(fromKey, weight));
        }
    }

    public List<Edge> getNeighbors(String nodeId) {
        String key = nodeId.trim().toUpperCase();
        return adjacencyList.getOrDefault(key, Collections.emptyList());
    }

    public boolean hasNode(String nodeId) {
        return nodes.containsKey(nodeId.trim().toUpperCase());
    }

    public GraphNode getNode(String nodeId) {
        return nodes.get(nodeId.trim().toUpperCase());
    }

    public Map<String, GraphNode> getAllNodes() {
        return Collections.unmodifiableMap(nodes);
    }

    public void printGraph() {
        System.out.println("\n========== IDAM NAGAR ROAD NETWORK GRAPH ==========");
        for (String nodeId : nodes.keySet()) {
            GraphNode node = nodes.get(nodeId);
            System.out.printf("%-4s (%-26s): ", node.getId(), node.getName());
            List<Edge> edges = adjacencyList.get(nodeId);
            if (edges.isEmpty()) {
                System.out.println("[No outgoing connections]");
            } else {
                List<String> formatted = new ArrayList<>();
                for (Edge e : edges) {
                    formatted.add(String.format("-> %s (%d min)", e.getTargetNodeId(), e.getWeight()));
                }
                System.out.println(String.join(", ", formatted));
            }
        }
        System.out.println("===================================================\n");
    }
}
