/** 
 * Solver for "Unique Paths in a Grid II" contract type
 * Find number of unique paths from top-left to bottom-right
 * Can only move right or down, must avoid obstacles (1's in grid)
 * @param {Array<Array<number>>} data - Grid with 0 for empty, 1 for obstacle
 * @returns {number} Number of unique paths
 */
export function solve(data) {
    // Input validation
    if (!Array.isArray(data) || data.length === 0 || 
        !data.every(row => Array.isArray(row) && row.length === data[0].length)) {
        throw new Error("Invalid input: expected 2D array grid");
    }

    const rows = data.length;
    const cols = data[0].length;
    
    // Create paths grid initialized to 0
    const paths = Array(rows).fill(0)
        .map(() => Array(cols).fill(0));
    
    // Initialize starting position if not blocked
    paths[0][0] = data[0][0] === 0 ? 1 : 0;
    
    // If starting or ending position is blocked, no paths possible
    if (data[0][0] === 1 || data[rows-1][cols-1] === 1) {
        return 0;
    }
    
    // Fill first row (can only come from left)
    for (let j = 1; j < cols; j++) {
        if (data[0][j] === 0) {
            paths[0][j] = paths[0][j-1];
        }
    }
    
    // Fill first column (can only come from above)
    for (let i = 1; i < rows; i++) {
        if (data[i][0] === 0) {
            paths[i][0] = paths[i-1][0];
        }
    }
    
    // Calculate paths for rest of grid
    for (let i = 1; i < rows; i++) {
        for (let j = 1; j < cols; j++) {
            if (data[i][j] === 0) {
                // Add paths from above and left if not blocked
                paths[i][j] = paths[i-1][j] + paths[i][j-1];
            }
        }
    }
    
    return paths[rows-1][cols-1];
} 