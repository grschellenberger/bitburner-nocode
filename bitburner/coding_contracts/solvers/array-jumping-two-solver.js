/** 
 * Solver for "Array Jumping Game II" contract type
 * Find minimum number of jumps needed to reach the last index
 * Each number represents the MAXIMUM number of indices you can jump forward
 * @param {Array<number>} data - Array where each element is the maximum jump length
 * @returns {number} Minimum number of jumps to reach last index
 */
export function solve(data) {
    // Input validation
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error("Invalid input: expected non-empty array");
    }

    const n = data.length;
    
    // If single element, we're already at the end
    if (n <= 1) return 0;
    
    // If we can't move from start, and we're not already at end
    if (data[0] === 0) return 0;
    
    // Track current reach, maximum reach for next jump, and jumps taken
    let currentReach = data[0];    // How far we can reach with current jump
    let maxReach = data[0];        // Maximum reach possible with next jump
    let jumps = 1;                 // We take first jump from position 0
    
    // Scan array up to second-to-last element (last element is destination)
    for (let i = 1; i < n - 1; i++) {
        // Update maximum reach possible for next jump
        maxReach = Math.max(maxReach, i + data[i]);
        
        // If we can't reach the end
        if (i > maxReach) return 0;
        
        // If we've used up our current jump's reach
        if (i === currentReach) {
            jumps++;               // We must take another jump
            currentReach = maxReach;  // Update how far we can now reach
            
            // If we can already reach the end
            if (currentReach >= n - 1) break;
        }
    }
    
    // Return jumps if we can reach the end, otherwise 0
    return currentReach >= n - 1 ? jumps : 0;
} 