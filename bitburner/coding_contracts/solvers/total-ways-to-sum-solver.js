/** 
 * Solver for "Total Ways to Sum" contract type
 * @param {number} data - Target number to sum to
 * @returns {number} Number of different ways to write the number as a sum of positive integers
 */
export function solve(data) {
    // Input validation
    if (typeof data !== 'number' || data < 1) {
        throw new Error("Invalid input: must be a positive integer");
    }

    // Create array to store number of ways to sum to each value
    const ways = new Array(data + 1).fill(0);
    ways[0] = 1;  // Base case: one way to sum to 0 (empty sum)
    
    // For each number from 1 to n-1
    for (let i = 1; i < data; i++) {
        // Add this number to previous sums to create new sums
        for (let j = i; j <= data; j++) {
            ways[j] += ways[j - i];
        }
    }
    
    return ways[data];
} 