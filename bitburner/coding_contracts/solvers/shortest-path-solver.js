/** 
 * Solver for "Shortest Path in a Grid" contract type
 * Find shortest path from top-left to bottom-right in grid
 * 0 represents walkable cell, 1 represents obstacle
 * Can only move in four directions (up, down, left, right)
 * @param {Array<Array<number>>} data - Grid of 0s and 1s
 * @returns {string} Path as string of UDLR characters, or "" if no path exists
 */
export function solve(data) {
    // Input validation
    if (!Array.isArray(data) || !data.length || !Array.isArray(data[0])) {
        throw new Error("Invalid input: expected 2D array");
    }

    const rows = data.length;
    const cols = data[0].length;
    
    // Check if start or end is blocked
    if (data[0][0] === 1 || data[rows-1][cols-1] === 1) {
        return "";
    }
    
    // Directions: Up, Down, Left, Right
    const dirs = [[-1, 0, 'U'], [1, 0, 'D'], [0, -1, 'L'], [0, 1, 'R']];
    
    // Queue for BFS: [row, col, path]
    const queue = [[0, 0, ""]];
    
    // Keep track of visited cells
    const visited = new Set();
    visited.add("0,0");
    
    while (queue.length > 0) {
        const [row, col, path] = queue.shift();
        
        // Check if we reached the target
        if (row === rows - 1 && col === cols - 1) {
            return path;
        }
        
        // Try all four directions
        for (const [dr, dc, dir] of dirs) {
            const newRow = row + dr;
            const newCol = col + dc;
            const newPos = `${newRow},${newCol}`;
            
            // Check if new position is valid
            if (newRow >= 0 && newRow < rows && 
                newCol >= 0 && newCol < cols && 
                data[newRow][newCol] === 0 && 
                !visited.has(newPos)) {
                
                visited.add(newPos);
                queue.push([newRow, newCol, path + dir]);
            }
        }
    }
    
    // No path found
    return "";
} 