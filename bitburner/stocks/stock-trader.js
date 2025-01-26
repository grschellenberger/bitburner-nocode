/** @param {NS} ns */
export async function main(ns) {
    // Disable default logging
    ns.disableLog("ALL");
    
    // Color constants for display
    const COLOR = {
        RESET: "\u001b[0m",
        GREEN: "\u001b[32m",
        RED: "\u001b[31m",
        YELLOW: "\u001b[33m",
        CYAN: "\u001b[36m",
        MAGENTA: "\u001b[35m",
        BLUE: "\u001b[34m",
        BOLD: "\u001b[1m",
    };

    // Constants for trading logic
    const CONSTANTS = {
        RESERVE_AMOUNT: 5_000_000_000,      // 5 billion minimum reserve
        MIN_SERVER_MONEY_RATIO: 0.20,       // Server money threshold for bonus scoring
        MIN_FORECAST: 0.50,                 // Minimum forecast for stocks with server advantage
        MIN_FORECAST_NO_SERVER: 0.55,       // Minimum forecast for stocks without server advantage
        COMMISSION: 100_000,                // Commission fee per trade
        VOLATILITY_WEIGHT: 0.4,             // Weight for volatility in scoring
        UPDATE_INTERVAL: 6000,              // 6 second update interval
        SERVER_BONUS_MULTIPLIER: 0.2,       // Bonus score multiplier for favorable server conditions
        CLOSEOUT_MIN_PROFIT: 1,             // Minimum profit to trigger sale in closeout mode
        LIFETIME_PROFITS: 0,  // Initialize lifetime profits
        PROFIT_TRACKING: {
            SELLS: new Map(),  // Track sell profits
            BUYS: new Map(),   // Track purchase costs
        }
    };

    // Server mapping for stocks
    const STOCK_SERVERS = {
        'FSIG': 'foodnstuff',
        'CTYS': 'catalyst',
        'FLCM': 'fulcrumtech',
        'MEGACORP': 'megacorp',
        'BLD': 'blade',
        'CLRK': 'clarkinc',
        'OMTK': 'omnitek',
        'SYSC': 'syscore',
        'CTK': 'computek',
        'NTLK': 'netlink',
        'SGC': 'sigma-cosmetics',
        'JGN': 'joesguns',
        'HWGP': 'helios',
        'OMGA': 'omega-net',
        '4SIG': '4sigma',
        // Add more stock-to-server mappings as needed
    };

    // Create a basic tail window for monitoring
    ns.tail();
    ns.disableLog("ALL");
    ns.resizeTail(400, 400);

    // Initialize lifetime profits
    let lifetimeProfits = 0;

    // Check for closeout mode
    const isCloseout = ns.args.includes("--closeout");
    if (isCloseout) {
        ns.print(`${COLOR.YELLOW}Starting in closeout mode${COLOR.RESET}`);
    }

    /**
     * Kills other instances of this script
     * @param {NS} ns - Netscript namespace
     */
    function killOtherInstances(ns) {
        const thisScript = ns.getScriptName();
        const thisProcess = ns.pid;
        
        // Get all running scripts
        const processes = ns.ps('home');
        
        // Kill other instances of this script
        for (const process of processes) {
            if (process.filename === thisScript && process.pid !== thisProcess) {
                ns.print(`Killing other instance: PID ${process.pid}`);
                ns.kill(process.pid);
            }
        }
    }

    // If in closeout mode, kill other instances first
    if (isCloseout) {
        killOtherInstances(ns);
        ns.print("CLOSEOUT MODE: Killed other stock trader instances");
    }

    /**
     * Analyzes a server for trading advantage potential
     * @param {NS} ns - Netscript namespace
     * @param {string} serverName - Name of the server to analyze
     * @returns {number} Bonus score (0 if no advantage)
     */
    function analyzeServer(ns, serverName) {
        try {
            // Check if server exists
            if (!ns.serverExists(serverName)) {
                return 0;
            }

            // Get server details
            const server = {
                isRooted: ns.hasRootAccess(serverName),
                requiredHackLevel: ns.getServerRequiredHackingLevel(serverName),
                currentMoney: ns.getServerMoneyAvailable(serverName),
                maxMoney: ns.getServerMaxMoney(serverName),
                playerHackLevel: ns.getHackingLevel()
            };

            // Check if server is hackable
            if (!server.isRooted || server.requiredHackLevel > server.playerHackLevel) {
                return 0;
            }

            // Calculate money ratio
            const moneyRatio = server.currentMoney / server.maxMoney;

            // If money ratio is below threshold, return bonus score
            if (moneyRatio < CONSTANTS.MIN_SERVER_MONEY_RATIO) {
                // Calculate bonus score based on how far below threshold
                const bonusScore = (CONSTANTS.MIN_SERVER_MONEY_RATIO - moneyRatio) * CONSTANTS.SERVER_BONUS_MULTIPLIER;
                return Math.min(bonusScore, CONSTANTS.SERVER_BONUS_MULTIPLIER); // Cap the bonus
            }

            return 0;
        } catch (error) {
            ns.print(`ERROR analyzing server ${serverName}: ${error}`);
            return 0;
        }
    }

    /**
     * Analyzes all stocks and returns sorted array of stock objects
     * @param {NS} ns - Netscript namespace
     * @param {boolean} has4S - Whether 4S data access is available
     * @returns {Array} Array of stock objects with analysis data
     */
    function analyzeStocks(ns, has4S) {
        const stocks = [];
        
        // Get all stock symbols
        const symbols = ns.stock.getSymbols();
        
        for (const sym of symbols) {
            try {
                // Get basic stock information
                const position = ns.stock.getPosition(sym);
                const price = ns.stock.getPrice(sym);
                const maxShares = ns.stock.getMaxShares(sym);
                
                // Get price history for volatility analysis
                const askPrice = ns.stock.getAskPrice(sym);
                const bidPrice = ns.stock.getBidPrice(sym);
                const spread = askPrice - bidPrice;
                
                // Create stock object with basic info
                const stock = {
                    symbol: sym,
                    price: price,
                    maxShares: maxShares,
                    forecast: 0.5,  // Default to neutral
                    volatility: 0,
                    ownedShares: position[0],
                    avgPricePaid: position[1],
                    spread: spread,
                    spreadRatio: spread / price,  // Spread as percentage of price
                    score: 0
                };

                // Add 4S data if available
                if (has4S) {
                    stock.forecast = ns.stock.getForecast(sym);
                    stock.volatility = ns.stock.getVolatility(sym);
                    
                    // Calculate score components
                    const forecastScore = (stock.forecast - 0.5) * 2; // Convert 0-1 to -1 to 1
                    const volatilityScore = stock.volatility * CONSTANTS.VOLATILITY_WEIGHT;
                    const spreadScore = -stock.spreadRatio * 2; // Penalize high spreads
                    
                    // Combine scores with weights
                    stock.score = (
                        forecastScore * 0.6 +    // Forecast is primary factor
                        volatilityScore * 0.3 +  // Volatility can increase gains
                        spreadScore * 0.1        // Small penalty for high spreads
                    );

                    // Bonus for very strong forecasts (>65%)
                    if (stock.forecast > 0.65) {
                        stock.score *= 1.2;
                    }
                } else {
                    // Without 4S data, use spread analysis
                    // Lower spread often indicates more stable price
                    stock.score = -stock.spreadRatio;
                }

                // Penalize stocks we already own a lot of
                if (stock.ownedShares > 0) {
                    const positionRatio = stock.ownedShares / stock.maxShares;
                    stock.score *= (1 - positionRatio); // Reduce score based on how much we own
                }

                stocks.push(stock);
            } catch (error) {
                ns.print(`${COLOR.RED}ERROR analyzing stock ${sym}: ${error}${COLOR.RESET}`);
            }
        }

        // Sort stocks by score in descending order
        return stocks.sort((a, b) => b.score - a.score);
    }

    /**
     * Analyzes price trends and momentum for a stock
     * @param {NS} ns - Netscript namespace
     * @param {string} symbol - Stock symbol
     * @returns {Object} Trend analysis data
     */
    async function analyzeTrend(ns, symbol) {
        try {
            const PRICE_HISTORY_LENGTH = 10;  // Reduced from 50 to 10 for faster analysis
            const priceHistory = [];
            let lastPrice = ns.stock.getPrice(symbol);
            
            // Collect price history
            priceHistory.push(lastPrice);
            for (let i = 1; i < PRICE_HISTORY_LENGTH; i++) {
                await ns.sleep(50); // Small delay between checks
                const price = ns.stock.getPrice(symbol);
                if (price !== lastPrice) {
                    priceHistory.push(price);
                    lastPrice = price;
                }
            }

            if (priceHistory.length < 2) {
                return {
                    bottomPercentage: 0.5,
                    recentMomentum: 0,
                    priceVolatility: 0,
                    isNearBottom: false,
                    isPriceStable: true,
                    recentHigh: lastPrice,
                    recentLow: lastPrice
                };
            }

            const currentPrice = priceHistory[0];
            const recentHigh = Math.max(...priceHistory);
            const recentLow = Math.min(...priceHistory);
            
            // Calculate where current price is in the recent range
            const priceRange = recentHigh - recentLow;
            const bottomPercentage = priceRange > 0 
                ? (currentPrice - recentLow) / priceRange 
                : 0.5;

            // Calculate simple momentum (direction of price movement)
            const recentMomentum = (currentPrice - priceHistory[priceHistory.length - 1]) / priceHistory[priceHistory.length - 1];
            
            return {
                bottomPercentage,
                recentMomentum,
                priceVolatility: priceRange / currentPrice,
                isNearBottom: bottomPercentage < 0.2,  // Bottom 20% of range
                isPriceStable: Math.abs(recentMomentum) < 0.001,  // Price stabilizing
                recentHigh,
                recentLow
            };
        } catch (error) {
            ns.print(`${COLOR.RED}ERROR in trend analysis for ${symbol}: ${error}${COLOR.RESET}`);
            return null;
        }
    }

    /**
     * Enhanced buy decision logic with trend analysis
     */
    async function getBuyDecision(ns, stock, availableCash, has4S) {
        try {
            const trend = await analyzeTrend(ns, stock.symbol);
            
            if (!trend) {
                return {
                    symbol: stock.symbol,
                    shares: 0,
                    price: 0,
                    cost: 0,
                    shouldBuy: false,
                    reason: "No trend data"
                };
            }

            const decision = {
                symbol: stock.symbol,
                shares: 0,
                price: 0,
                cost: 0,
                shouldBuy: false,
                reason: ""
            };

            // Don't buy if we already own maximum shares
            if (stock.ownedShares >= stock.maxShares) {
                return decision;
            }

            // Score the buying opportunity
            let buyScore = 0;
            let buyReasons = [];

            if (has4S) {
                // With 4S data
                if (stock.forecast <= 0.55) {
                    return decision; // Don't buy with poor forecast
                }

                // Base score on forecast strength
                buyScore += (stock.forecast - 0.5) * 2;
                buyReasons.push(`Forecast: ${(stock.forecast * 100).toFixed(1)}%`);

                // Add trend analysis
                if (trend.isNearBottom) {
                    buyScore += 0.3;
                    buyReasons.push("Near bottom");
                }
                if (trend.isPriceStable) {
                    buyScore += 0.2;
                    buyReasons.push("Price stable");
                }
                
                // Momentum consideration
                if (trend.recentMomentum > 0) {
                    buyScore += 0.1;
                    buyReasons.push("Upward momentum");
                }
            } else {
                // Without 4S data, rely more heavily on technical analysis
                if (trend.isNearBottom) {
                    buyScore += 0.5;
                    buyReasons.push("Near bottom");
                }
                if (trend.isPriceStable) {
                    buyScore += 0.3;
                    buyReasons.push("Price stable");
                }
                if (trend.bottomPercentage < 0.1) {
                    buyScore += 0.2;
                    buyReasons.push("Possible bottom");
                }
            }

            // Only buy if score is high enough
            if (buyScore < 0.4) {
                return decision;
            }

            // Calculate shares to buy - now only limited by available cash and max shares
            const maxAffordableShares = Math.floor(
                (availableCash - CONSTANTS.COMMISSION) / stock.price
            );

            const remainingShares = stock.maxShares - stock.ownedShares;

            const sharesToBuy = Math.min(
                maxAffordableShares,
                remainingShares
            );

            // Ensure the purchase is worth the commission
            const totalCost = (sharesToBuy * stock.price) + CONSTANTS.COMMISSION;
            if (sharesToBuy > 0 && totalCost < availableCash) {
                decision.shares = sharesToBuy;
                decision.price = stock.price;
                decision.cost = totalCost;
                decision.shouldBuy = true;
                decision.reason = buyReasons.join(", ");
                decision.score = buyScore;
            }

            return decision;

        } catch (error) {
            ns.print(`${COLOR.RED}ERROR in buy decision for ${stock.symbol}: ${error}${COLOR.RESET}`);
            return {
                symbol: stock.symbol,
                shares: 0,
                price: 0,
                cost: 0,
                shouldBuy: false,
                reason: `Error: ${error}`
            };
        }
    }

    /**
     * Determines if a stock position should be sold
     * @param {NS} ns - Netscript namespace
     * @param {Object} stock - Stock object from analyzeStocks
     * @param {boolean} has4S - Whether 4S data is available
     * @param {boolean} isCloseout - Whether closeout mode is active
     * @returns {Object} Sell decision with shares and expected profit
     */
    function getSellDecision(ns, stock, has4S, isCloseout) {
        try {
            const decision = {
                symbol: stock.symbol,
                shares: 0,
                price: 0,
                profit: 0,
                shouldSell: false
            };

            if (stock.ownedShares <= 0) {
                return decision;
            }

            const currentPrice = ns.stock.getPrice(stock.symbol);
            const grossProfit = (currentPrice - stock.avgPricePaid) * stock.ownedShares;
            const netProfit = grossProfit - CONSTANTS.COMMISSION;
            const profitPercentage = (currentPrice - stock.avgPricePaid) / stock.avgPricePaid;

            // Profit thresholds
            const LARGE_PROFIT_MONEY = 10e9;    // 10 billion
            const SMALL_PROFIT_MONEY = 1e9;     // 1 billion
            const LARGE_PROFIT_PERCENT = 0.05;  // 5%
            const SMALL_PROFIT_PERCENT = 0.02;  // 2%

            // Closeout mode - sell any profitable position
            if (isCloseout) {
                if (netProfit > CONSTANTS.COMMISSION) {
                    decision.shouldSell = true;
                }
            } 
            // Normal trading mode
            else {
                let shouldSell = false;

                if (has4S) {
                    const sellThreshold = CONSTANTS.MIN_FORECAST;

                    // Sell conditions with 4S data:
                    if (
                        // Bad forecast
                        (stock.forecast < sellThreshold) ||
                        // OR large profit (5% OR 10b+)
                        (profitPercentage >= LARGE_PROFIT_PERCENT || netProfit >= LARGE_PROFIT_MONEY) ||
                        // OR small profit (2% OR 1b+) with declining forecast
                        ((profitPercentage >= SMALL_PROFIT_PERCENT || netProfit >= SMALL_PROFIT_MONEY) && 
                         stock.forecast < 0.5) ||
                        // OR any profit with very bad forecast
                        (netProfit > CONSTANTS.COMMISSION && stock.forecast < 0.4)
                    ) {
                        shouldSell = true;
                    }
                } else {
                    // Without 4S data, sell if:
                    if (
                        // Large profit (5% OR 10b+)
                        (profitPercentage >= LARGE_PROFIT_PERCENT || netProfit >= LARGE_PROFIT_MONEY) ||
                        // OR small profit (2% OR 1b+)
                        (profitPercentage >= SMALL_PROFIT_PERCENT || netProfit >= SMALL_PROFIT_MONEY)
                    ) {
                        shouldSell = true;
                    }
                }

                if (shouldSell && netProfit > CONSTANTS.COMMISSION) {
                    decision.shouldSell = true;
                }
            }

            if (decision.shouldSell) {
                decision.shares = stock.ownedShares;
                decision.price = currentPrice;
                decision.profit = netProfit;
                
                // Add profit reason to help with debugging/monitoring
                if (netProfit >= LARGE_PROFIT_MONEY) {
                    decision.reason = "Large profit (money)";
                } else if (profitPercentage >= LARGE_PROFIT_PERCENT) {
                    decision.reason = "Large profit (percent)";
                } else if (netProfit >= SMALL_PROFIT_MONEY) {
                    decision.reason = "Small profit (money)";
                } else if (profitPercentage >= SMALL_PROFIT_PERCENT) {
                    decision.reason = "Small profit (percent)";
                } else if (has4S && stock.forecast < 0.4) {
                    decision.reason = "Bad forecast";
                } else {
                    decision.reason = "Other";
                }
            }

            return decision;

        } catch (error) {
            ns.print(`${COLOR.RED}ERROR in sell decision for ${stock.symbol}: ${error}${COLOR.RESET}`);
            return {
                symbol: stock.symbol,
                shares: 0,
                price: 0,
                profit: 0,
                shouldSell: false,
                reason: "Error"
            };
        }
    }

    /**
     * Manages the stock portfolio and tracks performance
     * @param {NS} ns - Netscript namespace
     * @param {Array} stocks - Analyzed stocks array
     * @returns {Object} Portfolio status and statistics
     */
    function managePortfolio(ns, stocks) {
        try {
            const portfolio = {
                totalValue: 0,
                totalCost: 0,
                totalProfit: 0,
                positions: [],
                investedRatio: 0,
                cashAvailable: ns.getServerMoneyAvailable("home"),
                reserveAmount: ns.fileExists("Formulas.exe", "home") ? 0 : CONSTANTS.RESERVE_AMOUNT
            };

            // Calculate portfolio metrics
            let totalInvested = 0;
            let stocksWithPositions = 0;

            for (const stock of stocks) {
                if (stock.ownedShares > 0) {
                    const currentPrice = ns.stock.getPrice(stock.symbol);
                    const positionValue = currentPrice * stock.ownedShares;
                    const positionCost = stock.avgPricePaid * stock.ownedShares;
                    const positionProfit = positionValue - positionCost;

                    // Validate numbers before adding
                    if (!isNaN(positionValue)) {
                        totalInvested += positionValue;
                    }
                    stocksWithPositions++;

                    portfolio.positions.push({
                        symbol: stock.symbol,
                        shares: stock.ownedShares,
                        value: positionValue,
                        profit: positionProfit,
                        profitPercent: positionCost > 0 ? (positionProfit / positionCost) * 100 : 0,
                        forecast: stock.forecast,
                        volatility: stock.volatility,
                        score: stock.score,
                        avgPricePaid: stock.avgPricePaid
                    });
                }
            }

            // Calculate portfolio totals with validation
            portfolio.totalValue = totalInvested;
            portfolio.totalCost = portfolio.positions.reduce((sum, pos) => 
                sum + (pos.shares * pos.avgPricePaid), 0);
            portfolio.totalProfit = portfolio.totalValue - portfolio.totalCost;
            
            // Fix investment ratio calculation
            const totalFunds = portfolio.cashAvailable - portfolio.reserveAmount + totalInvested;
            portfolio.investedRatio = totalFunds > 0 ? totalInvested / totalFunds : 0;

            // Sort positions by value
            portfolio.positions.sort((a, b) => b.value - a.value);

            return portfolio;

        } catch (error) {
            ns.print(`ERROR in portfolio management: ${error}`);
            return {
                totalValue: 0,
                totalCost: 0,
                totalProfit: 0,
                positions: [],
                investedRatio: 0,
                cashAvailable: 0,
                reserveAmount: 0
            };
        }
    }

    /**
     * Executes trades based on buy/sell decisions
     * @param {NS} ns - Netscript namespace
     * @param {Array} sellDecisions - Array of sell decisions
     * @param {Array} buyDecisions - Array of buy decisions
     * @returns {Object} Results of executed trades
     */
    function executeTrades(ns, sellDecisions, buyDecisions) {
        const results = {
            sells: [],
            buys: [],
            totalProfit: 0,  // Money earned from sells
            totalSpent: 0    // Money spent on buys
        };

        try {
            // Execute sells first
            for (const decision of sellDecisions) {
                try {
                    const success = ns.stock.sellStock(
                        decision.symbol,
                        decision.shares
                    );

                    if (success) {
                        const sellValue = ns.stock.getSaleGain(decision.symbol, decision.shares, "Long");
                        results.totalProfit += sellValue;
                        
                        results.sells.push({
                            symbol: decision.symbol,
                            shares: decision.shares,
                            profit: sellValue,
                            reason: decision.reason
                        });
                        
                        ns.print(`SOLD: ${decision.symbol} - ${ns.formatNumber(decision.shares)} shares, ` +
                                `Value: $${ns.formatNumber(sellValue)}`);
                    }
                } catch (error) {
                    ns.print(`ERROR selling ${decision.symbol}: ${error}`);
                }
            }

            // Execute buys
            for (const decision of buyDecisions) {
                try {
                    const success = ns.stock.buyStock(
                        decision.symbol,
                        decision.shares
                    );

                    if (success) {
                        const cost = decision.shares * ns.stock.getPrice(decision.symbol);
                        results.totalSpent += cost;

                        results.buys.push({
                            symbol: decision.symbol,
                            shares: decision.shares,
                            cost: cost,
                            reason: decision.reason
                        });
                        
                        ns.print(`BOUGHT: ${decision.symbol} - ${ns.formatNumber(decision.shares)} shares, ` +
                                `Cost: $${ns.formatNumber(cost)} (${decision.reason})`);
                    }
                } catch (error) {
                    ns.print(`ERROR buying ${decision.symbol}: ${error}`);
                }
            }

        } catch (error) {
            ns.print(`ERROR in trade execution: ${error}`);
        }

        return results;
    }

    // Main trading loop
    while (true) {
        try {                        
            // Check prerequisites
            const hasWSE = ns.stock.hasWSEAccount();
            const hasTIX = ns.stock.hasTIXAPIAccess();
            const has4S = ns.stock.has4SData();
            const hasFormulas = ns.fileExists("Formulas.exe", "home");

            // Analyze stocks and manage portfolio
            const analyzedStocks = analyzeStocks(ns, has4S);
            const portfolio = managePortfolio(ns, analyzedStocks);

            // Portfolio Summary
            ns.print(` `);
            ns.print(`\n${COLOR.BOLD}=== PORTFOLIO ===${COLOR.RESET}`);
            ns.print(`Positions: ${COLOR.CYAN}${portfolio.positions.length}${COLOR.RESET}`);
            ns.print(`Total Value: ${COLOR.GREEN}$${ns.formatNumber(portfolio.totalValue)}${COLOR.RESET}`);
            ns.print(`Lifetime Profits: ${COLOR.GREEN}$${ns.formatNumber(lifetimeProfits)}${COLOR.RESET}`);

            // Process trades
            const sellDecisions = analyzedStocks
                .filter(stock => stock.ownedShares > 0)
                .map(stock => getSellDecision(ns, stock, has4S, isCloseout))
                .filter(decision => decision.shouldSell);

            const tradeResults = executeTrades(ns, sellDecisions, []);

            // Process buys if not in closeout mode
            if (!isCloseout) {
                const availableCash = ns.getServerMoneyAvailable("home") - 
                    (hasFormulas ? 0 : CONSTANTS.RESERVE_AMOUNT);

                // Only show available cash if we have positions or are making trades
                if (portfolio.positions.length > 0 || sellDecisions.length > 0) {
                    ns.print(`Available Cash: ${COLOR.CYAN}$${ns.formatNumber(availableCash)}${COLOR.RESET}\n`);
                }

                const validBuyDecisions = [];
                for (const stock of analyzedStocks.filter(s => s.ownedShares < s.maxShares)) {
                    const decision = await getBuyDecision(ns, stock, availableCash, has4S);
                    if (decision.shouldBuy) {
                        validBuyDecisions.push(decision);
                    }
                }

                if (validBuyDecisions.length > 0) {
                    const buyResults = executeTrades(ns, [], validBuyDecisions);
                    tradeResults.buys = buyResults.buys;
                    tradeResults.totalSpent = buyResults.totalSpent;
                }
            }

            // Update lifetime profits (money earned minus money spent)
            lifetimeProfits += (tradeResults.totalProfit - tradeResults.totalSpent);

            // Display current positions if we have any
            if (portfolio.positions.length > 0) {
                ns.print(` `);
                ns.print(`${COLOR.BOLD}=== POSITIONS ===${COLOR.RESET}`);
                portfolio.positions.forEach(pos => {
                    const profitColor = pos.profit >= 0 ? COLOR.GREEN : COLOR.RED;
                    ns.print(
                        `${COLOR.CYAN}${pos.symbol}${COLOR.RESET}: ` +
                        `${ns.formatNumber(pos.shares)} @ $${ns.formatNumber(pos.value/pos.shares)} ` +
                        `(${profitColor}${pos.profitPercent.toFixed(1)}%${COLOR.RESET})`
                    );
                });
            }

            await ns.sleep(CONSTANTS.UPDATE_INTERVAL);
        } catch (error) {
            ns.print(`${COLOR.RED}ERROR: ${error}${COLOR.RESET}`);
            await ns.sleep(CONSTANTS.UPDATE_INTERVAL);
        }
    }
}
