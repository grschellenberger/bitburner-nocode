/** 
 * Solver for "Encryption I: Caesar Cipher" contract type
 * Implement Caesar cipher encryption (shift each letter left by fixed amount)
 * @param {Array} data - [text, shift] where text is string to encrypt and shift is number
 * @returns {string} Encrypted text
 */
export function solve(data) {
    // Input validation
    if (!Array.isArray(data) || data.length !== 2 || 
        typeof data[0] !== 'string' || 
        !Number.isInteger(data[1])) {
        throw new Error("Invalid input: expected [string, number]");
    }

    const text = data[0];
    const shift = data[1];
    
    return text.split('').map(char => {
        // Only encrypt letters
        if (!/[a-zA-Z]/.test(char)) return char;
        
        // Determine base code (65 for uppercase)
        const base = 65;  // We'll convert everything to uppercase
        
        // Convert to 0-25 range, apply left shift, convert back to ASCII
        // Subtract shift instead of adding for left shift
        const shifted = (char.toUpperCase().charCodeAt(0) - base - shift) % 26;
        // Handle negative shifts
        const normalized = shifted < 0 ? shifted + 26 : shifted;
        
        return String.fromCharCode(base + normalized);
    }).join('');
} 