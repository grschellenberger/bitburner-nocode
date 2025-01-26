/** 
 * Handles UI navigation and interaction for infiltrator
 */
export class UIController {
    constructor(ns, state, logger) {
        this.ns = ns;
        this.state = state;
        this.logger = logger;
        this.doc = eval('document');
        this.NAVIGATION_RETRY = 3;
        this.RETRY_DELAY = 100;
    }

    /**
     * Navigate to the infiltration view
     */
    async navigateToInfiltration() {
        this.ns.print("Navigating to infiltration view...");
        
        try {
            // First ensure we're in a city
            await this.ensureInCity();
            
            // Find and click the City tab if needed
            await this.navigateToCityTab();
            
            // Verify we can see infiltration buttons
            return await this.verifyInfiltrationView();
            
        } catch (error) {
            await this.logger.logError("navigation", error, this.state);
            return false;
        }
    }

    /**
     * Ensure we're in a city
     */
    async ensureInCity() {
        try {
            this.ns.singularity.travelToCity("Sector-12");
            await this.ns.sleep(this.RETRY_DELAY);
        } catch (error) {
            await this.logger.logError("city_travel", error, this.state);
        }
    }

    /**
     * Navigate to the City tab
     */
    async navigateToCityTab() {
        const buttons = Array.from(this.doc.querySelectorAll("button"));
        
        // First try to find and click the City tab
        const cityTab = buttons.find(b => 
            b.getAttribute("aria-label")?.includes("City") ||
            b.textContent.includes("City")
        );
        
        if (cityTab) {
            this.ns.print("Found City tab, clicking...");
            await this.simulateClick(cityTab);
            await this.ns.sleep(this.RETRY_DELAY);
        }
    }

    /**
     * Verify we're in the infiltration view
     */
    async verifyInfiltrationView() {
        let retries = this.NAVIGATION_RETRY;
        
        while (retries > 0) {
            const infiltrateButtons = Array.from(this.doc.querySelectorAll("button"))
                .filter(b => b.textContent.includes("Infiltrate Company"));
            
            if (infiltrateButtons.length > 0) {
                this.ns.print("Successfully navigated to infiltration view");
                return true;
            }
            
            this.ns.print(`Waiting for infiltration view... (${retries} retries left)`);
            await this.ns.sleep(this.RETRY_DELAY);
            retries--;
        }
        
        this.ns.print("Failed to navigate to infiltration view");
        return false;
    }

    /**
     * Get all available infiltration targets
     */
    async getInfiltrationTargets() {
        const infiltrateButtons = Array.from(this.doc.querySelectorAll("button"))
            .filter(b => b.textContent.includes("Infiltrate Company"));
        
        return infiltrateButtons.map(button => {
            const container = button.closest("div");
            const text = container?.textContent || "";
            
            return this.parseTargetInfo(button, text);
        });
    }

    /**
     * Parse target information from button and text
     */
    parseTargetInfo(button, text) {
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
        const stats = this.state.companyStats[companyName] || {
            attempts: 0,
            successes: 0,
            failures: 0,
            totalReward: 0,
            averageTime: 0,
            lastAttempt: 0
        };
        
        return {
            button,
            companyName,
            difficulty,
            successChance,
            text,
            stats
        };
    }

    /**
     * Calculate target score based on multiple factors
     */
    calculateTargetScore(target) {
        const { successChance, difficulty, stats } = target;
        
        // Calculate various factors
        const successRate = stats.attempts > 0 ? stats.successes / stats.attempts : 0;
        const rewardRate = stats.successes > 0 ? stats.totalReward / stats.successes : 0;
        const timePenalty = stats.averageTime > 0 ? Math.log(stats.averageTime) : 0;
        
        // Cooldown factor (avoid spamming same company)
        const cooldownFactor = Math.max(0, 1 - (Date.now() - stats.lastAttempt) / 60000);
        
        // Calculate final score
        return (
            successChance * 0.4 +                  // 40% weight on success chance
            (1 / difficulty) * 25 +                // 25% weight on inverse difficulty
            (successRate * 15) +                   // 15% weight on historical success
            (rewardRate * 0.1) +                   // 10% weight on historical rewards
            (1 - timePenalty) * 10                 // 10% weight on speed
        ) * (1 - cooldownFactor);                  // Apply cooldown penalty
    }

    /**
     * Select best target based on scoring
     */
    async selectBestTarget() {
        try {
            const targets = await this.getInfiltrationTargets();
            
            if (targets.length === 0) {
                return null;
            }
            
            // Calculate scores and sort
            const scoredTargets = targets.map(target => ({
                ...target,
                score: this.calculateTargetScore(target)
            })).sort((a, b) => b.score - a.score);
            
            const selected = scoredTargets[0];
            
            // Update company stats
            this.state.companyStats[selected.companyName] = {
                ...selected.stats,
                attempts: selected.stats.attempts + 1,
                lastAttempt: Date.now()
            };
            
            // Log selection
            await this.logger.logDebug("target_selection", {
                selected: selected.companyName,
                score: selected.score,
                successChance: selected.successChance,
                available: targets.length,
                allScores: scoredTargets.map(t => ({
                    company: t.companyName,
                    score: t.score
                }))
            });
            
            return selected;
            
        } catch (error) {
            await this.logger.logError("target_selection", error, this.state);
            return null;
        }
    }

    /**
     * Simulate click event
     */
    async simulateClick(element) {
        await element[Object.keys(element)[1]].onClick({ isTrusted: true });
    }
} 