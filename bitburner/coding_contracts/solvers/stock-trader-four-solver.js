/** 
 * Solver for "Algorithmic Stock Trader IV" contract type
 * Find maximum profit with at most k transactions
 * @param {Array} data - [k, prices] where k is max transactions and prices is array of stock prices
 * @returns {number} Maximum profit possible
 */
export function solve(data) {
    // Input validation
    if (!Array.isArray(data) || data.length !== 2 || 
        !Array.isArray(data[1]) || data[1].length < 2) {
        throw new Error("Invalid input: expected [k, prices]");
    }

    const k = data[0];
    const prices = data[1];
    const n = prices.length;
    
    // If k is large enough, we can do unlimited transactions
    if (k >= Math.floor(n/2)) {
        let profit = 0;
        for (let i = 1; i < n; i++) {
            if (prices[i] > prices[i-1]) {
                profit += prices[i] - prices[i-1];
            }
        }
        return profit;
    }
    
    // dp[i][j] represents maximum profit using at most i transactions up to day j
    const dp = Array(k + 1).fill(0)
        .map(() => Array(n).fill(0));
    
    for (let i = 1; i <= k; i++) {
        let maxDiff = -prices[0];  // Maximum difference found so far
        
        for (let j = 1; j < n; j++) {
            // Either don't make transaction on day j, or buy before and sell on day j
            dp[i][j] = Math.max(dp[i][j-1], prices[j] + maxDiff);
            // Update maxDiff for next iteration
            maxDiff = Math.max(maxDiff, dp[i-1][j-1] - prices[j]);
        }
    }
    
    return dp[k][n-1];
} 