/** 
 * Solver for "Minimum Path Sum in a Triangle" contract type
 * Find minimum path sum from top to bottom
 * Each step can only move to adjacent numbers on the row below
 * @param {Array<Array<number>>} data - Triangle represented as array of arrays
 * @returns {number} Minimum path sum
 */
export function solve(data) {
    // Input validation
    if (!Array.isArray(data) || data.length === 0 || 
        !data.every((row, i) => Array.isArray(row) && row.length === i + 1)) {
        throw new Error("Invalid input: expected triangle array");
    }

    // Create a copy of the last row
    let minSums = [...data[data.length - 1]];
    
    // Work backwards from second-to-last row
    for (let row = data.length - 2; row >= 0; row--) {
        const currentRow = data[row];
        const newMinSums = new Array(row + 1);
        
        // For each number in current row
        for (let col = 0; col <= row; col++) {
            // Choose minimum of two possible paths and add current number
            newMinSums[col] = currentRow[col] + 
                Math.min(minSums[col], minSums[col + 1]);
        }
        
        minSums = newMinSums;
    }
    
    // Return minimum sum (will be single number at top of triangle)
    return minSums[0];
} 