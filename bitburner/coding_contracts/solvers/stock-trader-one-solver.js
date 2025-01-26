/** 
 * Solver for "Algorithmic Stock Trader I" contract type
 * Find maximum profit from a single buy-sell transaction
 * @param {Array<number>} data - Array of stock prices
 * @returns {number} Maximum profit possible
 */
export function solve(data) {
    // Input validation
    if (!Array.isArray(data) || data.length < 2) {
        throw new Error("Invalid input: expected array of at least 2 prices");
    }

    let minPrice = data[0];
    let maxProfit = 0;
    
    // Single pass through the array
    // For each price, we check if:
    // 1. It's a new minimum price (potential buy point)
    // 2. Current price - minimum price gives a better profit
    for (let i = 1; i < data.length; i++) {
        const currentPrice = data[i];
        
        // Update minimum price seen so far
        minPrice = Math.min(minPrice, currentPrice);
        
        // Update maximum profit if selling at current price is better
        const potentialProfit = currentPrice - minPrice;
        maxProfit = Math.max(maxProfit, potentialProfit);
    }
    
    return maxProfit;
} 