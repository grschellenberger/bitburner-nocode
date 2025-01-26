/** 
 * Solver for "Array Jumping Game" contract type
 * Each number represents the MAXIMUM number of indices you can jump forward
 * You can jump any number of indices from 1 up to the number at current position
 * @param {Array<number>} data - Array where each element is the maximum jump length
 * @returns {number} 1 if last index is reachable, 0 if not
 */
export function solve(data) {
    // Input validation
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error("Invalid input: expected non-empty array");
    }

    // If single element, we're already at the end
    if (data.length === 1) return 1;
    
    // Track the furthest index we can reach
    let maxReach = 0;
    
    // Check each position up to our current maximum reach
    for (let i = 0; i <= maxReach && i < data.length; i++) {
        // From position i, we can jump to any position up to i + data[i]
        // This means we can reach any index that's:
        // - Greater than our current position (i)
        // - Less than or equal to our current position plus max jump (i + data[i])
        maxReach = Math.max(maxReach, i + data[i]);
        
        // If we can reach the last index from any checked position, return success
        if (maxReach >= data.length - 1) {
            return 1;
        }
    }
    
    // If we can't reach the end after checking all reachable positions, return failure
    return 0;
} 