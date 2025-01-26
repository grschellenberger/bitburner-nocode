1. **Initial Setup**
   ```javascript
   - Define constants:
     - RESERVE_AMOUNT = 5_000_000_000 // 5 billion
     - MAX_INVESTMENT_RATIO = 0.10    // 10% max per stock
     - MIN_SERVER_MONEY_RATIO = 0.20  // 20% of max money
     - MIN_FORECAST = 0.50            // 50% chance of increase
     - MIN_FORECAST_NO_SERVER = 0.55  // Higher threshold when no server advantage
     - COMMISSION = 100_000           // Stock commission fee
     - VOLATILITY_WEIGHT = 0.4        // Weight for volatility in scoring
   ```

2. **Prerequisites Check Function**
   ```javascript
   - Check if player has WSE account
   - Check if player has TIX API access
   - Check if Formulas.exe exists (affects reserve amount)
   - Check if 4S data access is available
   ```

3. **Server Analysis Function (Optional Bonus)**
   ```javascript
   - Input: server name
   - Check if server exists
   - If exists:
     - Check if server is rooted
     - Check if server is hackable (player level >= required)
     - Calculate current money / max money ratio
     - Return bonus score if ratio < MIN_SERVER_MONEY_RATIO
   - If doesn't exist:
     - Return 0 (no bonus)
   ```

4. **Stock Analysis Function**
   ```javascript
   - For each stock:
     - Get current price
     - Get max shares available
     - Calculate base score:
       If 4S available:
         - Get forecast (0 to 1)
         - Get volatility (0 to 1)
         - Base score = (forecast - 0.5) * (1 + volatility * VOLATILITY_WEIGHT)
       Else:
         - Base score = 0
     - Add server bonus if applicable
     - Store in stock object with final score
   ```

5. **Buy Decision Function**
   ```javascript
   - Input: stock object
   - Check available cash minus reserve
   - Calculate maximum investment (10% of available cash)
   - Calculate opportunity score:
     - If 4S available:
       - Must meet MIN_FORECAST threshold
       - If has hackable server advantage:
         - Use MIN_FORECAST
       - If no server advantage:
         - Use MIN_FORECAST_NO_SERVER
     - If no 4S:
       - Only buy if has hackable server advantage
   - Calculate shares to buy (respecting max shares and budget)
   - Return buy decision object
   ```

6. **Sell Decision Function**
   ```javascript
   - Input: stock object with position
   - Calculate current value
   - Calculate profit after commission
   - If 4S available:
     - Check if forecast dropped below threshold
     - Consider volatility trend
   - Return sell decision object
   ```

7. **Portfolio Management Function**
   ```javascript
   - Track all current positions
   - Calculate total portfolio value
   - Ensure diversification limits
   - Track profit/loss per position
   - Sort potential buys by opportunity score
   ```

8. **Main Loop**
   ```javascript
   - Every 6 seconds:
     - Update stock data and scores
     - Check existing positions for sell conditions
     - If cash available:
       - Get list of all stocks above minimum thresholds
       - Sort by opportunity score
       - Execute buy orders in order of best opportunity
     - Log portfolio status
     - Update running profit/loss tracking
   ```

9. **Logging and Monitoring**
   ```javascript
   - Create tail window
   - Display:
     - Current positions
     - Available cash
     - Total portfolio value
     - Profit/loss
     - Recent transactions
     - Opportunity scores
   ```

10. **Error Handling**
    ```javascript
    - Handle insufficient funds
    - Handle API access errors
    - Handle position limits
    - Implement safety checks for all transactions
    ```