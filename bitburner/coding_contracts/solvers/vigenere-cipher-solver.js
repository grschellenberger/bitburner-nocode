/** 
 * Solver for "Encryption II: Vigenère Cipher" contract type
 * Implement Vigenère cipher encryption (multiple shift cipher using keyword)
 * @param {Array} data - [text, keyword] where text is string to encrypt and keyword is the key
 * @returns {string} Encrypted text
 */
export function solve(data) {
    // Input validation
    if (!Array.isArray(data) || data.length !== 2 || 
        typeof data[0] !== 'string' || 
        typeof data[1] !== 'string' ||
        !/^[a-zA-Z]+$/.test(data[1])) {
        throw new Error("Invalid input: expected [string, keyword]");
    }

    const text = data[0];
    const keyword = data[1].toLowerCase();
    let result = '';
    let keyIndex = 0;
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        
        // Only encrypt letters
        if (!/[a-zA-Z]/.test(char)) {
            result += char;
            continue;
        }
        
        // Get shift amount from current keyword letter (a=0, b=1, etc.)
        const shift = keyword[keyIndex % keyword.length].charCodeAt(0) - 97;
        
        // Determine base code (97 for lowercase, 65 for uppercase)
        const base = char.toLowerCase() === char ? 97 : 65;
        
        // Apply shift and wrap around alphabet
        const shifted = (char.charCodeAt(0) - base + shift) % 26;
        result += String.fromCharCode(base + shifted);
        
        // Move to next keyword letter
        keyIndex++;
    }
    
    return result;
} 