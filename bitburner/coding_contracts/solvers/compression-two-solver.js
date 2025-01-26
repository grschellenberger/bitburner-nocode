/** 
 * Solver for "Compression II: LZ Decompression" contract type
 * Implement LZ decompression with alternating chunk types
 * @param {string} data - Compressed string
 * @returns {string} Decompressed string
 */
export function solve(data) {
    // Input validation
    if (typeof data !== 'string') {
        throw new Error("Invalid input: expected string");
    }

    let result = '';
    let i = 0;
    let isLiteral = true; // Start with literal chunk (type 1)
    
    while (i < data.length) {
        // Get the length digit
        const len = parseInt(data[i++]);
        
        // Length of 0 means skip this chunk type
        if (len === 0) {
            isLiteral = !isLiteral;
            continue;
        }
        
        if (isLiteral) {
            // Type 1: Copy next len characters directly
            result += data.slice(i, i + len);
            i += len;
        } else {
            // Type 2: Reference chunk
            const backRef = parseInt(data[i++]);
            // Copy len characters from backRef positions back
            const start = result.length - backRef;
            for (let j = 0; j < len; j++) {
                result += result[start + j];
            }
        }
        
        // Switch chunk type
        isLiteral = !isLiteral;
    }
    
    return result;
} 