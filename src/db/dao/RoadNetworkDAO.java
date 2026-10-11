package db.dao;

import db.DatabaseManager;
import graph.WeightedGraph;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * Data Access Object for road_nodes and road_edges tables.
 * Loads urban topology from SQL into in-memory WeightedGraph for Dijkstra shortest pathing.
 */
public class RoadNetworkDAO {

    public WeightedGraph loadRoadNetwork() {
        WeightedGraph graph = new WeightedGraph();
        if (!DatabaseManager.isDriverAvailable()) return graph;

        try (Connection conn = DatabaseManager.getConnection();
             Statement stmt = conn.createStatement()) {

            // 1. Load vertices
            try (ResultSet rs = stmt.executeQuery("SELECT node_id, node_name FROM road_nodes ORDER BY node_id ASC")) {
                while (rs.next()) {
                    graph.addNode(rs.getString("node_id"), rs.getString("node_name"));
                }
            }

            // 2. Load edges
            try (ResultSet rs = stmt.executeQuery("SELECT from_node, to_node, travel_time_minutes, is_bidirectional FROM road_edges")) {
                while (rs.next()) {
                    graph.addEdge(
                            rs.getString("from_node"),
                            rs.getString("to_node"),
                            rs.getInt("travel_time_minutes"),
                            rs.getBoolean("is_bidirectional")
                    );
                }
            }
        } catch (SQLException e) {
            System.err.println("[RoadNetworkDAO] Error loading road network from SQL: " + e.getMessage());
        }
        return graph;
    }
}
