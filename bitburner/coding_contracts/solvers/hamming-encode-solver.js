/** 
 * Solver for "HammingCodes: Integer to Encoded Binary" contract type
 * Convert integer to binary and add Hamming code error correction
 * @param {number} data - Integer to encode
 * @returns {string} Encoded binary string
 */
export function solve(data) {
    // Input validation
    if (!Number.isInteger(data) || data < 0) {
        throw new Error("Invalid input: expected non-negative integer");
    }

    // Convert to binary string without leading zeros
    const binary = data.toString(2);
    
    // Calculate total number of bits needed (data + parity)
    let m = binary.length;  // data bits
    let k = 1;  // number of parity bits (excluding overall parity)
    while ((1 << k) <= m + k) {
        k++;
    }
    
    // Create array for encoded message (including position 0)
    const encoded = new Array(m + k + 1).fill('0');
    
    // Fill in data bits in reverse (MSB first)
    let dataIndex = binary.length - 1;
    for (let i = encoded.length - 1; i > 0; i--) {
        // Skip parity bit positions (powers of 2)
        if ((i & (i - 1)) !== 0) {
            encoded[i] = binary[dataIndex--];
        }
    }
    
    // Calculate parity bits (excluding position 0)
    for (let i = 0; i < k; i++) {
        const pos = 1 << i;
        let parity = 0;
        
        // Check bits that include this parity bit
        for (let j = pos; j < encoded.length; j++) {
            if (j & pos) {
                parity ^= parseInt(encoded[j]);
            }
        }
        encoded[pos] = parity.toString();
    }
    
    // Calculate overall parity (position 0)
    encoded[0] = encoded.slice(1).reduce((p, b) => p ^ parseInt(b), 0).toString();
    
    return encoded.join('');
} 