/** 
 * Solver for "Subarray with Maximum Sum" contract type
 * @param {number[]} data - Array of integers
 * @returns {number} Maximum sum of any contiguous subarray
 */
export function solve(data) {
    // Input validation
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error("Invalid input: must be a non-empty array of numbers");
    }

    let maxEndingHere = data[0];
    let maxSoFar = data[0];
    
    // Kadane's Algorithm
    for (let i = 1; i < data.length; i++) {
        // Either extend previous subarray or start new one
        maxEndingHere = Math.max(data[i], maxEndingHere + data[i]);
        // Update global maximum
        maxSoFar = Math.max(maxSoFar, maxEndingHere);
    }
    
    return maxSoFar;
} 