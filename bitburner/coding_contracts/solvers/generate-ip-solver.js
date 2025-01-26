/** 
 * Solver for "Generate IP Addresses" contract type
 * @param {string} data - String of digits to convert into IP addresses
 * @returns {Array<string>} All possible valid IP addresses
 */
export function solve(data) {
    // Input validation
    if (typeof data !== 'string' || data.length < 4 || data.length > 12) {
        throw new Error("Invalid input: string length must be between 4 and 12");
    }

    const result = [];
    
    // Try all possible positions for three dots
    for (let i = 1; i < 4 && i < data.length - 2; i++) {
        for (let j = i + 1; j < i + 4 && j < data.length - 1; j++) {
            for (let k = j + 1; k < j + 4 && k < data.length; k++) {
                // Extract the four parts
                const p1 = data.slice(0, i);
                const p2 = data.slice(i, j);
                const p3 = data.slice(j, k);
                const p4 = data.slice(k);
                
                // Check if each part is valid
                if (isValidPart(p1) && isValidPart(p2) && 
                    isValidPart(p3) && isValidPart(p4)) {
                    result.push(`${p1}.${p2}.${p3}.${p4}`);
                }
            }
        }
    }
    
    return result;
}

/**
 * Checks if a part of an IP address is valid
 * @param {string} part - Part of IP address to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidPart(part) {
    // Check length and leading zeros
    if (part.length === 0 || part.length > 3 || 
        (part.length > 1 && part[0] === '0')) {
        return false;
    }
    
    // Check numeric value
    const num = parseInt(part);
    return num >= 0 && num <= 255;
} 