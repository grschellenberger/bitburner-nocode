/** 
 * Solver for "Merge Overlapping Intervals" contract type
 * @param {Array<Array<number>>} data - Array of intervals, each interval is [start, end]
 * @returns {Array<Array<number>>} Merged intervals
 */
export function solve(data) {
    // Input validation
    if (!Array.isArray(data) || !data.every(interval => 
        Array.isArray(interval) && 
        interval.length === 2 && 
        typeof interval[0] === 'number' && 
        typeof interval[1] === 'number')) {
        throw new Error("Invalid input: expected array of [start, end] intervals");
    }

    // If no intervals or single interval, return as is
    if (data.length <= 1) return data;
    
    // Sort intervals by start time
    const intervals = [...data].sort((a, b) => a[0] - b[0]);
    
    const result = [intervals[0]];
    
    // Merge overlapping intervals
    for (let i = 1; i < intervals.length; i++) {
        const current = intervals[i];
        const lastMerged = result[result.length - 1];
        
        // If current interval overlaps with last merged interval
        if (current[0] <= lastMerged[1]) {
            // Merge by updating end time to max of both intervals
            lastMerged[1] = Math.max(lastMerged[1], current[1]);
        } else {
            // No overlap, add current interval to result
            result.push(current);
        }
    }
    
    return result;
} 