/** 
 * Solver for "Square Root" contract type
 * Find the square root of the given number, to the nearest integer
 * @param {string|number|BigInt} data - Number to find square root of
 * @returns {string} Square root rounded to nearest integer as string
 */
export function solve(data) {
    // Ensure input is BigInt
    const n = BigInt(data);
    
    if (n < 0n) throw new Error("Cannot calculate square root of negative number");
    if (n === 0n) return "0";
    if (n === 1n) return "1";
    
    // Initial estimate - ensure all operations are BigInt
    const bitLength = BigInt(n.toString(2).length);
    let x = 1n << (bitLength >> 1n);
    
    // Newton's method iteration
    let lastX = 0n;
    while (lastX !== x) {
        lastX = x;
        x = (x + n / x) >> 1n;
    }
    
    // Check which value is closer: x or x+1
    const lower = x * x;
    const upper = (x + 1n) * (x + 1n);
    
    // Return the value whose square is closer to n
    const diffLower = n - lower;
    const diffUpper = upper - n;
    
    if (diffUpper < diffLower) {
        return (x + 1n).toString();
    }
    return x.toString();
} 