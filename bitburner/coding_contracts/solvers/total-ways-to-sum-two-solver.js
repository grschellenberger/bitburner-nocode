/** 
 * Solver for "Total Ways to Sum II" contract type
 * @param {Array} data - [n, [numbers]] where n is target sum and numbers are available integers
 * @returns {number} Number of different ways to write n as a sum of numbers from the array
 */
export function solve(data) {
    // Input validation
    if (!Array.isArray(data) || data.length !== 2 || !Array.isArray(data[1])) {
        throw new Error("Invalid input: expected [number, [numbers]]");
    }

    const target = data[0];
    const numbers = data[1];

    // Create array to store number of ways to sum to each value
    const ways = new Array(target + 1).fill(0);
    ways[0] = 1;  // Base case: one way to sum to 0 (empty sum)
    
    // For each available number
    for (const num of numbers) {
        // For each sum from num to target
        for (let j = num; j <= target; j++) {
            ways[j] += ways[j - num];
        }
    }
    
    return ways[target];
} 