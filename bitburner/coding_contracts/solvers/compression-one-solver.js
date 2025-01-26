/** 
 * Solver for "Compression I: RLE Compression" contract type
 * Implement Run-Length Encoding compression
 * @param {string} data - String to compress
 * @returns {string} Compressed string
 */
export function solve(data) {
    // Input validation
    if (typeof data !== 'string') {
        throw new Error("Invalid input: expected string");
    }

    let result = '';
    let count = 1;
    
    // Handle empty string
    if (data.length === 0) return '';
    
    // Process each character
    for (let i = 1; i <= data.length; i++) {
        // If current char matches previous char and not at max count
        if (i < data.length && data[i] === data[i-1] && count < 9) {
            count++;
        } else {
            // Add count and character to result
            result += count + data[i-1];
            count = 1;
        }
    }
    
    return result;
} 