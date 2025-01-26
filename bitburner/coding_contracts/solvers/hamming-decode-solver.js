/** 
 * Solver for "HammingCodes: Encoded Binary to Integer" contract type
 * Convert Hamming-encoded binary string back to integer
 * @param {string} data - Encoded binary string
 * @returns {number} Decoded integer
 */
export function solve(data) {
    // Input validation
    if (typeof data !== 'string' || !/^[01]+$/.test(data)) {
        throw new Error("Invalid input: expected binary string");
    }

    // Remove overall parity bit
    const encoded = data.slice(1);
    
    // Find error position if any
    let errorPos = 0;
    let parityBits = Math.floor(Math.log2(encoded.length)) + 1;
    
    // Check each parity bit
    for (let i = 0; i < parityBits; i++) {
        const parityPos = (1 << i) - 1;
        let parity = 0;
        
        // Calculate parity for bits in this group
        for (let j = parityPos; j < encoded.length; j++) {
            if ((j + 1) & (1 << i)) {
                parity ^= parseInt(encoded[j]);
            }
        }
        
        // If parity check fails, add position to error location
        if (parity !== 0) {
            errorPos += (1 << i);
        }
    }
    
    // Extract data bits (ignoring parity bits)
    let binary = '';
    for (let i = 1; i <= encoded.length; i++) {
        // Skip parity bit positions (powers of 2)
        if ((i & (i - 1)) !== 0) {
            // If this is the error position, flip the bit
            const bit = errorPos === i ? 
                (1 - parseInt(encoded[i-1])).toString() : 
                encoded[i-1];
            binary += bit;
        }
    }
    
    // Convert binary to integer
    return parseInt(binary, 2);
} 