/** 
 * Solver for "Unique Paths in a Grid I" contract type
 * Find number of unique paths from top-left to bottom-right
 * Can only move right or down
 * @param {Array<number>} data - [rows, cols] dimensions of the grid
 * @returns {number} Number of unique paths
 */
export function solve(data) {
    // Input validation
    if (!Array.isArray(data) || data.length !== 2 ||
        !Number.isInteger(data[0]) || !Number.isInteger(data[1]) ||
        data[0] < 1 || data[1] < 1) {
        throw new Error("Invalid input: expected [rows, cols] positive integers");
    }

    const rows = data[0];
    const cols = data[1];
    
    // Create grid with first row and column initialized to 1
    // (only one way to reach any position in first row or column)
    const grid = Array(rows).fill(0)
        .map(() => Array(cols).fill(1));
    
    // Calculate paths for each cell
    for (let i = 1; i < rows; i++) {
        for (let j = 1; j < cols; j++) {
            // Number of paths to current cell is sum of paths from above and left
            grid[i][j] = grid[i-1][j] + grid[i][j-1];
        }
    }
    
    // Return paths to bottom-right cell
    return grid[rows-1][cols-1];
} 