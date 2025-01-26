/** 
 * Solver for "Find Largest Prime Factor" contract type
 * @param {NS} ns - The Netscript API
 * @param {number} data - The number to find largest prime factor of
 * @returns {number} The largest prime factor
 */
export function solve(data) {
    // Input validation
    if (typeof data !== 'number' || data < 2) {
        throw new Error("Invalid input: must be a number greater than 1");
    }

    let n = data;
    let largestFactor = 1;
    
    // Handle 2 as a special case
    while (n % 2 === 0) {
        largestFactor = 2;
        n = n / 2;
    }
    
    // Check odd numbers up to square root
    for (let i = 3; i <= Math.sqrt(n); i += 2) {
        while (n % i === 0) {
            largestFactor = i;
            n = n / i;
        }
    }
    
    // If n is still greater than 2, it's prime
    if (n > 2) {
        largestFactor = n;
    }
    
    return largestFactor;
} 