/** 
 * Solver for "Algorithmic Stock Trader II" contract type
 * Find maximum profit with unlimited transactions (must sell before buying again)
 * @param {Array<number>} data - Array of stock prices
 * @returns {number} Maximum profit possible
 */
export function solve(data) {
    // Input validation
    if (!Array.isArray(data) || data.length < 2) {
        throw new Error("Invalid input: expected array of at least 2 prices");
    }

    let totalProfit = 0;
    
    // Since we can do unlimited transactions,
    // we can simply add up all profitable price differences
    for (let i = 1; i < data.length; i++) {
        // If price goes up, we buy at previous price and sell at current price
        if (data[i] > data[i-1]) {
            totalProfit += data[i] - data[i-1];
        }
    }
    
    return totalProfit;
} 