/** 
 * Solver for "Proper 2-Coloring of a Graph" contract type
 * Determine if graph can be colored with 2 colors with no adjacent nodes same color
 * @param {Array} data - [n, edges] where n is number of nodes and edges is array of [node1, node2]
 * @returns {Array<number>} Colors for each node (0 or 1) or [] if impossible
 */
export function solve(data) {
    // Input validation
    if (!Array.isArray(data) || data.length !== 2 || 
        !Number.isInteger(data[0]) || !Array.isArray(data[1])) {
        throw new Error("Invalid input: expected [number_of_nodes, edges_array]");
    }

    const n = data[0];
    const edges = data[1];
    
    // Create adjacency list representation of graph
    const graph = Array(n).fill(0).map(() => []);
    for (const [a, b] of edges) {
        graph[a].push(b);
        graph[b].push(a);
    }
    
    // Initialize colors array (-1 means uncolored)
    const colors = Array(n).fill(-1);
    
    // Try to color the graph starting from each uncolored node
    for (let node = 0; node < n; node++) {
        if (colors[node] === -1) {
            // Try to color component starting with node 0
            if (!colorComponent(node, 0)) {
                return []; // Return empty array if coloring impossible
            }
        }
    }
    
    return colors;
    
    // Helper function to color a connected component
    function colorComponent(node, color) {
        colors[node] = color;
        
        // Check all adjacent nodes
        for (const neighbor of graph[node]) {
            if (colors[neighbor] === -1) {
                // Color neighbor with opposite color
                if (!colorComponent(neighbor, 1 - color)) {
                    return false;
                }
            } else if (colors[neighbor] === color) {
                // Adjacent nodes have same color
                return false;
            }
        }
        
        return true;
    }
} 