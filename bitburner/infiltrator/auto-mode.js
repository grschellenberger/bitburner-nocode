/** 
 * Handles automatic infiltration and reward collection
 * @param {NS} ns - Netscript API
 */
export class AutoInfiltrator {
    constructor(ns, state) {
        this.ns = ns;
        this.state = state;
        this.postTimeout = null;
        this.RETRY_DELAY = 1000;
        this.REWARD_DELAY = 500;
    }

    /**
     * Select a company and begin infiltration
     */
    async selectCompany() {
        if (!this.state.autoMode) return;
        this.cancelTimeout();

        try {
            const doc = eval('document');
            const selector = `span[aria-label="${this.state.lastCompany}"]`;
            const companyElem = doc.querySelector(selector);

            if (companyElem) {
                if (this.state.infiltrationStart) {
                    this.logInfiltrationResult(false);
                }

                await this.simulateClick(companyElem);
                await this.ns.sleep(this.RETRY_DELAY);

                const infiltrateBtn = Array.from(doc.querySelectorAll('button'))
                    .find(x => x.innerText.includes('Infiltrate Company'));

                if (infiltrateBtn) {
                    await this.simulateClick(infiltrateBtn);
                }
            }
        } catch (error) {
            this.ns.print(`Error in selectCompany: ${error.message}`);
            await this.logError("select_company", error);
        }
    }

    /**
     * Handle successful infiltration rewards
     */
    async handleRewards() {
        if (!this.state.autoMode) return;
        if (this.postTimeout) return;

        try {
            const doc = eval('document');

            // If faction reputation is selected
            if (this.state.repFaction) {
                await this.handleFactionReward(doc);
            } else {
                await this.handleMoneyReward(doc);
            }

            // Auto restart if enabled
            if (this.state.autoMode) {
                await this.selectCompany();
            }

        } catch (error) {
            this.ns.print(`Error in handleRewards: ${error.message}`);
            await this.logError("handle_rewards", error);
        }
    }

    /**
     * Handle faction reputation reward
     */
    async handleFactionReward(doc) {
        try {
            // Find and click faction dropdown
            const dropdown = Array.from(doc.querySelectorAll('[role="button"]'))
                .find(x => x.innerText.includes('none'));

            if (dropdown) {
                await this.simulateClick(dropdown);
                await this.ns.sleep(this.REWARD_DELAY);

                // Select specific faction
                const factionOption = Array.from(doc.querySelectorAll('li[role="option"]'))
                    .find(x => x.innerText.includes(this.state.repFaction));

                if (factionOption) {
                    await this.simulateClick(factionOption);
                    await this.ns.sleep(this.REWARD_DELAY);

                    // Accept reputation reward
                    const acceptBtn = Array.from(doc.querySelectorAll('button'))
                        .find(x => x.innerText.includes('Trade for'));

                    if (acceptBtn) {
                        await this.simulateClick(acceptBtn);
                        this.logInfiltrationResult(true, `Reputation for ${this.state.repFaction}`);
                    }
                }
            }
        } catch (error) {
            this.ns.print(`Error in handleFactionReward: ${error.message}`);
            await this.logError("faction_reward", error);
        }
    }

    /**
     * Handle money reward
     */
    async handleMoneyReward(doc) {
        try {
            const sellBtn = Array.from(doc.querySelectorAll('button'))
                .find(x => x.innerText.includes('Sell for'));

            if (sellBtn) {
                await this.simulateClick(sellBtn);
                this.logInfiltrationResult(true, sellBtn.innerText);
            }
        } catch (error) {
            this.ns.print(`Error in handleMoneyReward: ${error.message}`);
            await this.logError("money_reward", error);
        }
    }

    /**
     * Log infiltration result
     */
    logInfiltrationResult(success, details = '') {
        const duration = ((Date.now() - this.state.infiltrationStart) / 1000).toFixed(1);
        const message = success 
            ? `SUCCESSFUL INFILTRATION - ${duration}s: ${details}`
            : `FAILED INFILTRATION - ${duration}s, last game: ${this.state.currentGame}`;

        this.ns.print(message);
        console.info(message);
        this.state.infiltrationStart = 0;
    }

    /**
     * Cancel pending timeout
     */
    cancelTimeout() {
        if (this.postTimeout) {
            clearTimeout(this.postTimeout);
            this.postTimeout = null;
        }
    }

    /**
     * Simulate click event
     */
    async simulateClick(element) {
        await element[Object.keys(element)[1]].onClick({ isTrusted: true });
    }

    /**
     * Log error
     */
    async logError(context, error) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            context,
            message: error.message,
            stack: error.stack
        };

        await this.ns.write('logs/infiltrator_errors.txt', 
            JSON.stringify(errorEntry) + '\n', 
            'a');
    }
}
