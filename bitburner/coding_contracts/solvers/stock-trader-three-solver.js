/** 
 * Solver for "Algorithmic Stock Trader III" contract type
 * Find maximum profit with at most two transactions (must sell before buying again)
 * @param {Array<number>} data - Array of stock prices
 * @returns {number} Maximum profit possible
 */
export function solve(data) {
    // Input validation
    if (!Array.isArray(data) || data.length < 2) {
        throw new Error("Invalid input: expected array of at least 2 prices");
    }

    const n = data.length;
    
    // First transaction
    let firstBuy = -Infinity;
    let firstSell = 0;
    // Second transaction
    let secondBuy = -Infinity;
    let secondSell = 0;
    
    for (let price of data) {
        // Update the maximum profit for each state
        // The order matters: we update sells before buys to prevent using the same transaction twice
        
        // Second sell (final state)
        secondSell = Math.max(secondSell, secondBuy + price);
        // Second buy (after first sell)
        secondBuy = Math.max(secondBuy, firstSell - price);
        // First sell
        firstSell = Math.max(firstSell, firstBuy + price);
        // First buy (initial state)
        firstBuy = Math.max(firstBuy, -price);
    }
    
    return secondSell; // Maximum profit after all transactions
} 