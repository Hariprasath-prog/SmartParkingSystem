package graph;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.PriorityQueue;
import java.util.Set;

/**
 * Custom implementation of Dijkstra's Single-Source Shortest Path algorithm.
 * Uses a PriorityQueue (Min-Heap) for O((V + E) log V) time efficiency.
 */
public class DijkstraAlgorithm {

    /**
     * Internal container used by the Min-Heap PriorityQueue.
     */
    private static class NodeDistance implements Comparable<NodeDistance> {
        final String nodeId;
        final int distance;

        NodeDistance(String nodeId, int distance) {
            this.nodeId = nodeId;
            this.distance = distance;
        }

        @Override
        public int compareTo(NodeDistance other) {
            return Integer.compare(this.distance, other.distance);
        }
    }

    /**
     * Encapsulates the result of a shortest path query.
     */
    public static class ShortestPathResult {
        private final String sourceNode;
        private final String destinationNode;
        private final int travelTimeMinutes;
        private final List<String> path;
        private final boolean reachable;

        public ShortestPathResult(String sourceNode, String destinationNode, int travelTimeMinutes, List<String> path, boolean reachable) {
            this.sourceNode = sourceNode;
            this.destinationNode = destinationNode;
            this.travelTimeMinutes = travelTimeMinutes;
            this.path = path;
            this.reachable = reachable;
        }

        public String getSourceNode() {
            return sourceNode;
        }

        public String getDestinationNode() {
            return destinationNode;
        }

        public int getTravelTimeMinutes() {
            return travelTimeMinutes;
        }

        public List<String> getPath() {
            return Collections.unmodifiableList(path);
        }

        public boolean isReachable() {
            return reachable;
        }

        public String getPathString() {
            if (!reachable) {
                return "[Unreachable]";
            }
            return String.join(" -> ", path);
        }

        @Override
        public String toString() {
            if (!reachable) {
                return String.format("%s to %s: UNREACHABLE", sourceNode, destinationNode);
            }
            return String.format("%s to %s | Travel Time: %d mins | Route: %s",
                    sourceNode, destinationNode, travelTimeMinutes, getPathString());
        }
    }

    /**
     * Executes Dijkstra's algorithm from a source node to all reachable nodes in the graph.
     *
     * @param graph  the road network
     * @param source the origin road node
     * @return map of destination node -> ShortestPathResult
     */
    public static Map<String, ShortestPathResult> computeAllShortestPaths(WeightedGraph graph, String source) {
        String src = source.trim().toUpperCase();
        if (!graph.hasNode(src)) {
            throw new IllegalArgumentException("Source node " + src + " does not exist in graph.");
        }

        // Distance table initialized to infinity
        Map<String, Integer> distances = new HashMap<>();
        Map<String, String> predecessors = new HashMap<>();
        for (String node : graph.getAllNodes().keySet()) {
            distances.put(node, Integer.MAX_VALUE);
        }

        // Min-Heap PriorityQueue
        PriorityQueue<NodeDistance> minHeap = new PriorityQueue<>();

        // Distance to source is 0
        distances.put(src, 0);
        minHeap.add(new NodeDistance(src, 0));

        Set<String> settled = new HashSet<>();

        while (!minHeap.isEmpty()) {
            NodeDistance current = minHeap.poll();
            String u = current.nodeId;

            // Skip if already processed with a shorter distance
            if (settled.contains(u)) {
                continue;
            }
            settled.add(u);

            // Edge relaxation
            for (Edge edge : graph.getNeighbors(u)) {
                String v = edge.getTargetNodeId();
                int weight = edge.getWeight();

                if (!settled.contains(v)) {
                    int currentDistU = distances.get(u);
                    if (currentDistU != Integer.MAX_VALUE) {
                        int newDist = currentDistU + weight;
                        if (newDist < distances.get(v)) {
                            distances.put(v, newDist);
                            predecessors.put(v, u);
                            minHeap.add(new NodeDistance(v, newDist));
                        }
                    }
                }
            }
        }

        // Build results for all nodes
        Map<String, ShortestPathResult> results = new HashMap<>();
        for (String target : graph.getAllNodes().keySet()) {
            int dist = distances.get(target);
            if (dist == Integer.MAX_VALUE) {
                results.put(target, new ShortestPathResult(src, target, Integer.MAX_VALUE, Collections.emptyList(), false));
            } else {
                List<String> path = reconstructPath(predecessors, src, target);
                results.put(target, new ShortestPathResult(src, target, dist, path, true));
            }
        }

        return results;
    }

    /**
     * Computes the shortest path from source to a specific target node.
     */
    public static ShortestPathResult findShortestPath(WeightedGraph graph, String source, String target) {
        String tgt = target.trim().toUpperCase();
        Map<String, ShortestPathResult> allPaths = computeAllShortestPaths(graph, source);
        if (!allPaths.containsKey(tgt)) {
            return new ShortestPathResult(source, target, Integer.MAX_VALUE, Collections.emptyList(), false);
        }
        return allPaths.get(tgt);
    }

    private static List<String> reconstructPath(Map<String, String> predecessors, String source, String target) {
        List<String> path = new ArrayList<>();
        String curr = target;
        while (curr != null) {
            path.add(curr);
            if (curr.equals(source)) {
                break;
            }
            curr = predecessors.get(curr);
        }
        Collections.reverse(path);
        return path;
    }
}
