/** 
 * Comprehensive logging system for infiltrator
 */
export class InfiltratorLogger {
    constructor(ns) {
        this.ns = ns;
        this.ERROR_LOG = "logs/infiltrator_errors.txt";
        this.DEBUG_LOG = "logs/infiltrator_debug.txt";
        this.STATS_LOG = "logs/infiltrator_stats.txt";
        this.LOG_RETENTION_DAYS = 7;
        
        // Initialize logs
        this.initializeLogs();
    }

    /**
     * Initialize log files
     */
    async initializeLogs() {
        const header = `=== Infiltrator Log Started ${new Date().toISOString()} ===\n`;
        await this.ns.write(this.ERROR_LOG, header, 'w');
        await this.ns.write(this.DEBUG_LOG, header, 'w');
        await this.ns.write(this.STATS_LOG, header, 'w');
        
        // Clean old logs
        await this.cleanOldLogs();
    }

    /**
     * Log error with context
     */
    async logError(context, error, state = null) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            context,
            message: error.message,
            stack: error.stack,
            gameState: state ? {
                currentGame: state.currentGame,
                company: state.company,
                started: state.started,
                lastInput: state.lastInput
            } : null
        };

        // Write to file
        await this.ns.write(this.ERROR_LOG, 
            JSON.stringify(errorEntry) + '\n', 
            'a'
        );

        // Update error stats
        if (state) {
            state.errors.count++;
            state.errors.lastError = errorEntry;
            if (state.currentGame) {
                state.errors.gameErrors[state.currentGame] = 
                    (state.errors.gameErrors[state.currentGame] || 0) + 1;
            }
        }

        // Print to console
        this.ns.print(`ERROR [${context}]: ${error.message}`);
        console.error(`Infiltrator Error [${context}]:`, error);
    }

    /**
     * Log debug information
     */
    async logDebug(context, data, state = null) {
        const debugEntry = {
            timestamp: new Date().toISOString(),
            context,
            data,
            gameState: state ? {
                currentGame: state.currentGame,
                company: state.company,
                started: state.started
            } : null
        };

        await this.ns.write(this.DEBUG_LOG, 
            JSON.stringify(debugEntry) + '\n', 
            'a'
        );
    }

    /**
     * Log infiltration statistics
     */
    async logStats(state) {
        const stats = {
            timestamp: new Date().toISOString(),
            runTime: (Date.now() - state.stats.startTime) / 1000,
            gamesAttempted: state.stats.gamesAttempted,
            gamesSucceeded: state.stats.gamesSucceeded,
            gamesFailed: state.stats.gamesFailed,
            successRate: state.stats.gamesAttempted > 0 
                ? (state.stats.gamesSucceeded / state.stats.gamesAttempted * 100).toFixed(1)
                : 0,
            errors: state.errors.count,
            gameErrors: state.errors.gameErrors,
            companyStats: state.companyStats
        };

        await this.ns.write(this.STATS_LOG, 
            JSON.stringify(stats) + '\n', 
            'a'
        );

        // Print summary to console
        this.printStatsSummary(stats);
    }

    /**
     * Print statistics summary to console
     */
    printStatsSummary(stats) {
        this.ns.print("\n=== Infiltration Statistics ===");
        this.ns.print(`Runtime: ${stats.runTime.toFixed(1)}s`);
        this.ns.print(`Games Attempted: ${stats.gamesAttempted}`);
        this.ns.print(`Success Rate: ${stats.successRate}%`);
        this.ns.print(`Total Errors: ${stats.errors}`);
        
        if (Object.keys(stats.gameErrors).length > 0) {
            this.ns.print("\nErrors by Game:");
            Object.entries(stats.gameErrors)
                .sort((a, b) => b[1] - a[1])
                .forEach(([game, count]) => {
                    this.ns.print(`- ${game}: ${count}`);
                });
        }
    }

    /**
     * Clean logs older than LOG_RETENTION_DAYS
     */
    async cleanOldLogs() {
        const cutoff = Date.now() - (this.LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
        const logFiles = this.ns.ls('home', '/logs/infiltrator');
        
        for (const file of logFiles) {
            const stats = await this.ns.stat(file);
            if (stats.timestamp < cutoff) {
                await this.ns.rm(file);
            }
        }
    }

    /**
     * Format error for console output
     */
    formatError(error) {
        return `${error.message}\n${error.stack}`;
    }

    /**
     * Get current log status
     */
    async getLogStatus() {
        const status = {
            errorLog: await this.ns.stat(this.ERROR_LOG),
            debugLog: await this.ns.stat(this.DEBUG_LOG),
            statsLog: await this.ns.stat(this.STATS_LOG)
        };

        return status;
    }
}
