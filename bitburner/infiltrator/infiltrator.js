/** @param {NS} ns */
export async function main(ns) {
    // Disable default logging
    ns.disableLog("ALL");
    
    // Parse command line arguments
    const args = ns.flags([
        ["start", false],
        ["stop", false],
        ["status", false],
        ["quiet", false],
        ["auto", false],
        ["faction", ''],
    ]);
    
    // Setup UI
    ns.tail();
    ns.resizeTail(800, 600);
    ns.clearLog();

    /**
     * Wrap event listeners to bypass security checks
     */
    function wrapEventListeners() {
        const doc = eval('document');
        if (!doc._addEventListener) {
            doc._addEventListener = doc.addEventListener;
            doc.addEventListener = function(type, callback, options) {
                if (typeof options === 'undefined') {
                    options = false;
                }
                
                const handler = type === "keydown" ? function(...args) {
                    if (!args[0].isTrusted) {
                        const hackedEv = {};
                        for (const key in args[0]) {
                            if (key === "isTrusted") {
                                hackedEv.isTrusted = true;
                            } else if (typeof args[0][key] === "function") {
                                hackedEv[key] = args[0][key].bind(args[0]);
                            } else {
                                hackedEv[key] = args[0][key];
                            }
                        }
                        args[0] = hackedEv;
                    }
                    return callback.apply(callback, args);
                } : callback;

                if (!this.eventListeners) {
                    this.eventListeners = {};
                }
                if (!this.eventListeners[type]) {
                    this.eventListeners[type] = [];
                }
                
                this.eventListeners[type].push({
                    listener: callback,
                    useCapture: options,
                    wrapped: handler
                });

                return this._addEventListener(type, handler, options);
            };
        }
    }

    /**
     * Simulate trusted keyboard input
     * @param {Document} doc - Document object
     * @param {string} key - Key to simulate
     */
    function simulateKey(doc, key) {
        const events = [
            new KeyboardEvent("keydown", { key, bubbles: true }),
            new KeyboardEvent("keypress", { key, bubbles: true }),
            new KeyboardEvent("keyup", { key, bubbles: true })
        ];
        
        events.forEach(event => doc.dispatchEvent(event));
    }

    /**
     * Simulate trusted input event
     * @param {HTMLElement} element - Target element
     * @param {string} value - Input value
     */
    async function simulateInput(element, value) {
        await element[Object.keys(element)[1]].onChange({ 
            isTrusted: true, 
            currentTarget: { value: value } 
        });
    }

    async function simulateClick(element) {
        await element[Object.keys(element)[1]].onClick({ isTrusted: true });
    }

    // Initialize event wrapper
    wrapEventListeners();
    ns.print("Event listeners wrapped for trusted simulation");

    /**
     * Navigate to the infiltration view
     */
    async function navigateToInfiltration() {
        ns.print("Attempting to navigate to infiltration view...");
        
        // First, make sure we're in a city
        ns.singularity.travelToCity("Sector-12");
        await ns.sleep(100);
        
        const doc = eval("document");
        const buttons = Array.from(doc.querySelectorAll("button"));
        
        // First try to find and click the City tab
        const cityTab = buttons.find(b => 
            b.getAttribute("aria-label")?.includes("City") ||
            b.textContent.includes("City")
        );
        
        if (cityTab) {
            ns.print("Found City tab, clicking...");
            cityTab.click();
            await ns.sleep(100);
        }
        
        // Verify we can see infiltration buttons
        const infiltrateButtons = Array.from(doc.querySelectorAll("button"))
            .filter(b => b.textContent.includes("Infiltrate Company"));
        
        if (infiltrateButtons.length === 0) {
            ns.print("No infiltration buttons found after navigation!");
            return false;
        }

        ns.print(`Found ${infiltrateButtons.length} infiltration targets`);
        return true;
    }

    // Initial navigation
    let navigationAttempts = 0;
    const MAX_NAVIGATION_ATTEMPTS = 3;
    
    while (navigationAttempts < MAX_NAVIGATION_ATTEMPTS) {
        ns.print(`Navigation attempt ${navigationAttempts + 1}/${MAX_NAVIGATION_ATTEMPTS}`);
        if (await navigateToInfiltration()) {
            ns.print("Successfully navigated to infiltration view!");
            break;
        }
        navigationAttempts++;
        await ns.sleep(500);
    }

    if (navigationAttempts >= MAX_NAVIGATION_ATTEMPTS) {
        ns.print("IMPORTANT: Please manually navigate to the City view where you can see the infiltration options");
        ns.print("The script will continue once you're on the correct screen.");
    }

    ns.print("Starting infiltration automation...");
    
    // Constants
    const SCAN_INTERVAL = 22; // 22ms for responsive gameplay
    const INFILTRATION_WAIT = 100; // Wait between infiltration attempts
    const ERROR_LOG = "infiltrator_errors.txt";
    const DEBUG_LOG = "infiltrator_debug.txt";
    const WORD_LOG = "infiltrator_words.txt";
    
    // State management
    const state = {
        company: "",
        lastCompany: "",    // For auto-restart
        started: false,
        game: {},
        currentGame: null,
        lastInput: Date.now(),
        infiltrationStart: 0,
        autoMode: args.auto,
        repFaction: args.faction,
        errors: {
            count: 0,
            lastError: null,
            gameErrors: {}
        },
        stats: {
            gamesAttempted: 0,
            gamesSucceeded: 0,
            gamesFailed: 0,
            startTime: Date.now()
        },
        companyStats: {}
    };

    /**
     * Log error with context
     * @param {string} context - Where the error occurred
     * @param {Error} error - The error object
     * @param {Object} details - Additional details
     */
    async function logError(context, error, details = {}) {
        const timestamp = new Date().toISOString();
        const errorEntry = {
            timestamp,
            context,
            error: error.message,
            stack: error.stack,
            gameState: {
                currentGame: state.currentGame,
                started: state.started,
                company: state.company
            },
            details,
            stats: state.stats
        };

        // Update error statistics
        state.errors.count++;
        state.errors.lastError = error.message;
        state.errors.gameErrors[context] = (state.errors.gameErrors[context] || 0) + 1;

        // Log to file
        await ns.write(ERROR_LOG, JSON.stringify(errorEntry) + "\n", "a");
        
        // Print to terminal
        ns.print(`ERROR [${context}]: ${error.message}`);
    }

    /**
     * Log debug information
     * @param {string} context - Debug context
     * @param {Object} data - Debug data
     */
    async function logDebug(context, data = {}) {
        const timestamp = new Date().toISOString();
        const debugEntry = {
            timestamp,
            context,
            data,
            gameState: {
                currentGame: state.currentGame,
                started: state.started
            }
        };

        await ns.write(DEBUG_LOG, JSON.stringify(debugEntry) + "\n", "a");
    }

    // Mini-game solvers with exact game constants and logic
    const games = {
        "type it backward": {
            detect: (doc) => {
                try {
                    const element = doc.querySelector(".MuiTypography-root");
                    return element?.textContent?.includes("Type backward");
                } catch (error) {
                    logError("type_backward.detect", error);
                    return false;
                }
            },
            solve: async (doc) => {
                try {
                    const element = doc.querySelector(".MuiTypography-root");
                    if (!element) throw new Error("Could not find text element");
                    
                    // Game uses text between quotes
                    const match = element.textContent.match(/"([^"]*)"/);
                    if (!match) throw new Error("Could not extract text to type");
                    const text = match[1];
                    
                    await logDebug("type_backward.solve", { originalText: text });
                    
                    const reversed = text.split('').reverse().join('');
                    await simulateInput(doc.activeElement, reversed);
                    state.stats.gamesSucceeded++;
                } catch (error) {
                    state.stats.gamesFailed++;
                    logError("type_backward.solve", error, { element: doc.querySelector(".MuiTypography-root")?.textContent });
                    throw error;
                }
            }
        },
        
        "slash when guard is down": {
            detect: (doc) => {
                return doc.querySelector(".MuiTypography-root")?.textContent?.includes("slash when the guard");
            },
            solve: async (doc) => {
                try {
                    const guard = doc.querySelector('img[src*="guard"]');
                    if (!guard) return;
                    
                    // From GuardMinigame.tsx: guard-2 is vulnerable state (arms up)
                    const isVulnerable = guard.src.includes("guard-2");
                    if (isVulnerable) {
                        simulateKey(doc, " ");
                        state.stats.gamesSucceeded++;
                    }
                } catch (error) {
                    state.stats.gamesFailed++;
                    await logError("slash_guard.solve", error);
                    throw error;
                }
            }
        },
        
        "match the symbols": {
            detect: (doc) => {
                return doc.querySelector(".MuiTypography-root")?.textContent?.includes("Match the symbol");
            },
            solve: async (doc) => {
                try {
                    // Game uses single character symbols
                    const symbols = Array.from(doc.querySelectorAll(".MuiTypography-root"))
                        .filter(e => e.textContent.length === 1);
                    
                    if (symbols.length < 2) return;
                    
                    const target = symbols[0].textContent;
                    const options = symbols.slice(1);
                    
                    const match = options.find(opt => opt.textContent === target);
                    if (match) {
                        match.click();
                        state.stats.gamesSucceeded++;
                    }
                } catch (error) {
                    state.stats.gamesFailed++;
                    await logError("match_symbols.solve", error);
                    throw error;
                }
            }
        },
        
        "cut the wires": {
            detect: (doc) => {
                return doc.querySelector(".MuiTypography-root")?.textContent?.includes("Cut the wires");
            },
            solve: async (doc) => {
                try {
                    // From WireCuttingMinigame.tsx
                    const WIRE_ORDER = ["red", "white", "blue", "yellow"];
                    
                    const wires = Array.from(doc.querySelectorAll(".MuiButtonBase-root"));
                    const validWires = wires.filter(wire => {
                        const color = wire.textContent.toLowerCase();
                        return WIRE_ORDER.includes(color);
                    });
                    
                    // Find first uncut wire in the correct order
                    const nextWire = validWires.find(wire => 
                        wire.textContent.toLowerCase() === WIRE_ORDER[0] && !wire.disabled
                    );
                    
                    if (nextWire) {
                        nextWire.click();
                        state.stats.gamesSucceeded++;
                    }
                } catch (error) {
                    state.stats.gamesFailed++;
                    await logError("cut_wires.solve", error);
                    throw error;
                }
            }
        },
        
        "remember mines": {
            detect: (doc) => {
                return doc.querySelector(".MuiTypography-root")?.textContent?.includes("Remember the mines");
            },
            solve: async (doc) => {
                try {
                    // From MinesweeperMinigame.tsx
                    const MINE_COLOR = "#F00";
                    
                    // Store mine positions during memorization phase
                    if (!state.game.mines) {
                        state.game.mines = new Set();
                        const mines = Array.from(doc.querySelectorAll(".MuiButtonBase-root"))
                            .filter(e => e.style.backgroundColor.toUpperCase() === MINE_COLOR);
                        
                        mines.forEach(mine => {
                            const pos = mine.getBoundingClientRect();
                            state.game.mines.add(`${pos.x},${pos.y}`);
                        });
                        
                        await logDebug("remember_mines.memorize", { 
                            mineCount: mines.length 
                        });
                    } else {
                        // Mark mines during marking phase
                        const buttons = Array.from(doc.querySelectorAll(".MuiButtonBase-root"));
                        let markedCount = 0;
                        
                        buttons.forEach(button => {
                            const pos = button.getBoundingClientRect();
                            if (state.game.mines.has(`${pos.x},${pos.y}`)) {
                                button.click();
                                markedCount++;
                            }
                        });
                        
                        await logDebug("remember_mines.mark", { 
                            markedCount 
                        });
                        
                        if (markedCount > 0) {
                            state.stats.gamesSucceeded++;
                        }
                    }
                } catch (error) {
                    state.stats.gamesFailed++;
                    await logError("remember_mines.solve", error);
                    throw error;
                }
            }
        },
        
        "say something nice": {
            detect: (doc) => {
                return doc.querySelector(".MuiTypography-root")?.textContent?.includes("Say something nice");
            },
            solve: async (doc) => {
                try {
                    const options = Array.from(doc.querySelectorAll(".MuiButtonBase-root"));
                    
                    // From SayItMinigame.tsx
                    const positiveWords = [
                        "GOOD", "GREAT", "EXCELLENT", "NICE", "PERFECT",
                        "SUPER", "WELL", "DONE", "AWESOME", "FANTASTIC",
                        "WONDERFUL", "AMAZING", "OUTSTANDING", "MAGNIFICENT",
                        "BRILLIANT", "BEAUTIFUL", "LOVELY", "SPLENDID",
                        "SUBLIME", "IMPRESSIVE"
                    ];
                    
                    await logDebug("say_nice_options", {
                        options: options.map(opt => opt.textContent)
                    });
                    
                    const bestOption = options.find(opt => 
                        positiveWords.some(word => 
                            opt.textContent.toUpperCase().includes(word)
                        )
                    );
                    
                    if (bestOption) {
                        bestOption.click();
                        state.stats.gamesSucceeded++;
                    } else {
                        await logError("say_nice_solve", new Error("No positive option found"), {
                            availableOptions: options.map(opt => opt.textContent)
                        });
                        state.stats.gamesFailed++;
                    }
                } catch (error) {
                    state.stats.gamesFailed++;
                    await logError("say_nice_solve", error);
                    throw error;
                }
            }
        },
        
        "enter the code": {
            detect: (doc) => {
                return doc.querySelector(".MuiTypography-root")?.textContent?.includes("Enter the code");
            },
            solve: (doc) => {
                const arrows = Array.from(doc.querySelectorAll(".MuiTypography-root"))
                    .find(e => e.textContent.includes("↑"))
                    ?.textContent.split(" ")[0];
                
                if (!arrows) return;
                
                const keyMap = {
                    "↑": "ArrowUp",
                    "↓": "ArrowDown",
                    "←": "ArrowLeft",
                    "→": "ArrowRight"
                };
                
                arrows.split("").forEach(arrow => {
                    const key = keyMap[arrow];
                    if (key) simulateKey(doc, key);
                });
            }
        },
        
        "close the brackets": {
            detect: (doc) => {
                return doc.querySelector(".MuiTypography-root")?.textContent?.includes("Close the brackets");
            },
            solve: async (doc) => {
                try {
                    // From BracketMinigame.tsx
                    const bracketPairs = {
                        "[": "]",
                        "(": ")",
                        "{": "}",
                        "<": ">"
                    };
                    
                    const element = doc.querySelector(".MuiTypography-root");
                    if (!element) throw new Error("Could not find bracket element");
                    
                    const brackets = element.textContent;
                    if (!brackets) throw new Error("Could not find brackets");
                    
                    const solution = brackets.split("")
                        .map(char => bracketPairs[char] || char)
                        .join("");
                    
                    await simulateInput(doc.activeElement, solution);
                    state.stats.gamesSucceeded++;
                    
                    await logDebug("close_brackets.solve", { 
                        input: brackets,
                        solution 
                    });
                } catch (error) {
                    state.stats.gamesFailed++;
                    await logError("close_brackets.solve", error);
                    throw error;
                }
            }
        }
    };

    /**
     * Get the current game type from the screen
     * @param {Document} doc - Document object
     * @returns {string|null} Game type or null if not found
     */
    function getCurrentGame(doc) {
        try {
            for (const [name, game] of Object.entries(games)) {
                if (game.detect(doc)) {
                    return name;
                }
            }
            return null;
        } catch (error) {
            logError("getCurrentGame", error);
            return null;
        }
    }

    /**
     * Print statistics
     */
    function printStats() {
        const runtime = (Date.now() - state.stats.startTime) / 1000;
        ns.print(`
=== Infiltration Statistics ===
Runtime: ${runtime.toFixed(2)}s
Games Attempted: ${state.stats.gamesAttempted}
Games Succeeded: ${state.stats.gamesSucceeded}
Games Failed: ${state.stats.gamesFailed}
Success Rate: ${((state.stats.gamesSucceeded / state.stats.gamesAttempted) * 100).toFixed(2)}%
Total Errors: ${state.errors.count}
Last Error: ${state.errors.lastError || "None"}
`);
    }

    /**
     * Check if infiltration was successful
     * @param {Document} doc - Document object
     * @returns {boolean} True if successful
     */
    function checkSuccess(doc) {
        const elements = Array.from(doc.querySelectorAll(".MuiTypography-root"));
        return elements.some(e => e.textContent.includes("Infiltration successful"));
    }

    /**
     * Check if infiltration failed
     * @param {Document} doc - Document object
     * @returns {boolean} True if failed
     */
    function checkFailure(doc) {
        const elements = Array.from(doc.querySelectorAll(".MuiTypography-root"));
        return elements.some(e => e.textContent.includes("Infiltration failed"));
    }

    /**
     * Get faction with most available augmentations
     * @returns {Promise<{faction: string, augs: number, rep: number}>}
     */
    async function getBestFaction() {
        try {
            // Get player's faction memberships
            const player = ns.getPlayer();
            const factions = player.factions;
            
            if (factions.length === 0) {
                await logDebug("faction_check", { status: "no_memberships" });
                return null;
            }

            // Get data for each faction
            const factionData = await Promise.all(factions.map(async faction => {
                const augs = await ns.singularity.getAugmentationsFromFaction(faction);
                const rep = await ns.singularity.getFactionRep(faction);
                return {
                    faction,
                    augs: augs.length,
                    rep
                };
            }));

            // Sort by number of augmentations (desc), then by reputation (asc)
            factionData.sort((a, b) => {
                if (b.augs !== a.augs) return b.augs - a.augs;
                return a.rep - b.rep;
            });

            await logDebug("faction_analysis", { factions: factionData });
            return factionData[0];
        } catch (error) {
            await logError("get_best_faction", error);
            return null;
        }
    }

    /**
     * Get currently working faction, if any
     * @returns {Promise<string|null>}
     */
    async function getWorkingFaction() {
        try {
            const work = ns.singularity.getCurrentWork();
            if (!work || !work.factionName) return null;
            
            await logDebug("work_check", { 
                type: work.type,
                faction: work.factionName 
            });
            
            return work.factionName;
        } catch (error) {
            await logError("get_working_faction", error);
            return null;
        }
    }

    /**
     * Select faction for reputation reward
     * @returns {Promise<string|null>}
     */
    async function selectFactionForReward() {
        try {
            // First check if working for a faction
            const workingFaction = await getWorkingFaction();
            if (workingFaction) {
                await logDebug("faction_selection", {
                    status: "working_faction",
                    faction: workingFaction
                });
                return workingFaction;
            }

            // Otherwise get faction with most augmentations
            const bestFaction = await getBestFaction();
            if (bestFaction) {
                await logDebug("faction_selection", {
                    status: "best_faction",
                    faction: bestFaction.faction,
                    augs: bestFaction.augs,
                    rep: bestFaction.rep
                });
                return bestFaction.faction;
            }

            await logDebug("faction_selection", { status: "no_faction_found" });
            return null;
        } catch (error) {
            await logError("select_faction_reward", error);
            return null;
        }
    }

    /**
     * Handle infiltration rewards
     * @param {Document} doc - Document object
     */
    async function handleRewards(doc) {
        try {
            // Wait for reward screen
            await ns.sleep(500);
            
            // Find the reputation reward button
            const buttons = Array.from(doc.querySelectorAll("button"));
            const repButton = buttons.find(b => b.textContent.includes("Faction Rep"));
            
            if (!repButton) {
                await logError("handle_rewards", new Error("Could not find reputation reward button"));
                return;
            }

            // Click reputation reward
            repButton.click();
            await ns.sleep(100);

            // Select faction
            const selectedFaction = await selectFactionForReward();
            if (!selectedFaction) {
                await logError("handle_rewards", new Error("No suitable faction found for reward"));
                return;
            }

            // Find and click faction button
            const factionButtons = Array.from(doc.querySelectorAll("button"));
            const factionButton = factionButtons.find(b => 
                b.textContent.includes(selectedFaction)
            );

            if (!factionButton) {
                await logError("handle_rewards", new Error(`Could not find button for faction: ${selectedFaction}`));
                return;
            }

            // Click faction button and confirm
            factionButton.click();
            await ns.sleep(100);

            const confirmButton = Array.from(doc.querySelectorAll("button"))
                .find(b => b.textContent.includes("Confirm"));
            
            if (confirmButton) {
                confirmButton.click();
                await logDebug("rewards", { 
                    action: "reputation_reward",
                    faction: selectedFaction
                });
            }
            
            // Reset state
            state.started = false;
            state.currentGame = null;
            state.game = {};
            
            // Update statistics
            state.stats.infiltrationsCompleted++;
            state.stats.factionsRewarded = state.stats.factionsRewarded || {};
            state.stats.factionsRewarded[selectedFaction] = 
                (state.stats.factionsRewarded[selectedFaction] || 0) + 1;

            await logDebug("infiltration_complete", {
                company: state.company,
                rewardedFaction: selectedFaction,
                stats: state.stats
            });
            
        } catch (error) {
            await logError("handle_rewards", error);
        }
    }

    /**
     * Select best target company
     * @param {Document} doc - Document object
     * @returns {Promise<HTMLElement|null>} Button element for best company
     */
    async function selectTarget(doc) {
        try {
            const infiltrateButtons = Array.from(doc.querySelectorAll("button"))
                .filter(b => b.textContent.includes("Infiltrate Company"));
            
            if (infiltrateButtons.length === 0) {
                await navigateToInfiltration();
                return null;
            }
            
            // Initialize company stats if not exists
            if (!state.companyStats) {
                state.companyStats = {};
            }
            
            // Get all targets with detailed information
            const targets = infiltrateButtons.map(button => {
                const container = button.closest("div");
                const text = container?.textContent || "";
                
                // Parse company information
                const companyMatch = text.match(/([^(]+)/);
                const companyName = companyMatch ? companyMatch[1].trim() : "Unknown";
                
                // Parse success chance
                const chanceMatch = text.match(/(\d+)%/);
                const successChance = chanceMatch ? parseInt(chanceMatch[1]) : 0;
                
                // Parse difficulty
                const difficulty = text.includes("EASY") ? 1 :
                                 text.includes("MEDIUM") ? 2 :
                                 text.includes("HARD") ? 3 : 4;
                
                // Get company stats
                const stats = state.companyStats[companyName] || {
                    attempts: 0,
                    successes: 0,
                    failures: 0,
                    totalReward: 0,
                    averageTime: 0,
                    lastAttempt: 0
                };
                
                // Calculate score based on multiple factors
                const successRate = stats.attempts > 0 ? stats.successes / stats.attempts : 0;
                const rewardRate = stats.successes > 0 ? stats.totalReward / stats.successes : 0;
                const timePenalty = stats.averageTime > 0 ? Math.log(stats.averageTime) : 0;
                
                // Cooldown factor (avoid spamming same company)
                const cooldownFactor = Math.max(0, 1 - (Date.now() - stats.lastAttempt) / 60000);
                
                // Calculate final score
                const score = (
                    successChance * 0.4 +                  // 40% weight on success chance
                    (1 / difficulty) * 25 +                // 25% weight on inverse difficulty
                    (successRate * 15) +                   // 15% weight on historical success
                    (rewardRate * 0.1) +                   // 10% weight on historical rewards
                    (1 - timePenalty) * 10                 // 10% weight on speed
                ) * (1 - cooldownFactor);                  // Apply cooldown penalty
                
                ns.print(`Company: ${companyName}`);
                ns.print(`- Success Chance: ${successChance}%`);
                ns.print(`- Difficulty: ${difficulty}`);
                ns.print(`- Historical Success Rate: ${(successRate * 100).toFixed(1)}%`);
                ns.print(`- Score: ${score.toFixed(2)}`);
                
                return {
                    button,
                    companyName,
                    difficulty,
                    successChance,
                    score,
                    text,
                    stats
                };
            });
            
            // Sort by score (highest first)
            targets.sort((a, b) => b.score - a.score);
            
            if (targets.length > 0) {
                const selected = targets[0];
                // Update company stats
                state.companyStats[selected.companyName] = {
                    ...selected.stats,
                    attempts: selected.stats.attempts + 1,
                    lastAttempt: Date.now()
                };
                
                await logDebug("target_selection", {
                    selected: selected.companyName,
                    score: selected.score,
                    successChance: selected.successChance,
                    available: targets.length,
                    allScores: targets.map(t => ({
                        company: t.companyName,
                        score: t.score
                    }))
                });
                
                ns.print(`Selected target: ${selected.companyName}`);
                ns.print(`Score: ${selected.score.toFixed(2)}`);
                ns.print(`Success Chance: ${selected.successChance}%`);
                return selected.button;
            }
            
            return null;
        } catch (error) {
            ns.print(`Error in selectTarget: ${error.message}`);
            await logError("select_target", error);
            return null;
        }
    }

    // Main infiltration loop
    while (true) {
        try {
            await mainLoop(ns, state);
            await ns.sleep(SCAN_INTERVAL);
        } catch (error) {
            await logError("main", error);
            await ns.sleep(INFILTRATION_WAIT);
        }
    }
}