/** 
 * Solver for "Sanitize Parentheses in Expression" contract type
 * Find all possible valid strings by removing minimum number of parentheses
 * @param {string} data - String containing parentheses to sanitize
 * @returns {Array<string>} Array of valid strings
 */
export function solve(data) {
    // Input validation
    if (typeof data !== 'string') {
        throw new Error("Invalid input: expected string");
    }

    // Helper function to check if string is valid
    function isValid(str) {
        let count = 0;
        for (let char of str) {
            if (char === '(') count++;
            if (char === ')') count--;
            if (count < 0) return false;
        }
        return count === 0;
    }
    
    // If already valid, return original string
    if (isValid(data)) {
        return [data];
    }
    
    // BFS to find valid strings with minimum removals
    const visited = new Set();
    const queue = [data];
    const result = [];
    let found = false;
    
    while (queue.length > 0 && !found) {
        const size = queue.length;
        
        for (let i = 0; i < size; i++) {
            const current = queue.shift();
            
            // Try removing each parenthesis
            for (let j = 0; j < current.length; j++) {
                if (current[j] !== '(' && current[j] !== ')') continue;
                
                // Remove current parenthesis
                const next = current.slice(0, j) + current.slice(j + 1);
                
                if (visited.has(next)) continue;
                visited.add(next);
                
                if (isValid(next)) {
                    result.push(next);
                    found = true;
                } else if (!found) {
                    queue.push(next);
                }
            }
        }
    }
    
    // If no valid strings found, return empty string
    return result.length > 0 ? [...new Set(result)].sort() : [""];
} 