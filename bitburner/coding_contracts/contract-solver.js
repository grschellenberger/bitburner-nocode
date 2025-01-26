/** @param {NS} ns */
// Import all solvers directly
import { solve as solveArrayJumping } from "./solvers/array-jumping-solver.js";
import { solve as solveArrayJumpingTwo } from "./solvers/array-jumping-two-solver.js";
import { solve as solveCaesarCipher } from "./solvers/caesar-cipher-solver.js";
import { solve as solveCompressionOne } from "./solvers/compression-one-solver.js";
import { solve as solveCompressionTwo } from "./solvers/compression-two-solver.js";
import { solve as solveCompressionThree } from "./solvers/compression-three-solver.js";
import { solve as solveGenerateIP } from "./solvers/generate-ip-solver.js";
import { solve as solveHammingDecode } from "./solvers/hamming-decode-solver.js";
import { solve as solveHammingEncode } from "./solvers/hamming-encode-solver.js";
import { solve as solveMaxSubarray } from "./solvers/max-subarray-solver.js";
import { solve as solveMergeIntervals } from "./solvers/merge-intervals-solver.js";
import { solve as solveMinTriangle } from "./solvers/min-triangle-path-solver.js";
import { solve as solvePrimeFactor } from "./solvers/prime-factor-solver.js";
import { solve as solveSanitizeParentheses } from "./solvers/sanitize-parentheses-solver.js";
import { solve as solveShortestPath } from "./solvers/shortest-path-solver.js";
import { solve as solveSpiralize } from "./solvers/spiralize-matrix-solver.js";
import { solve as solveSquareRoot } from "./solvers/square-root-solver.js";
import { solve as solveStockTraderOne } from "./solvers/stock-trader-one-solver.js";
import { solve as solveStockTraderTwo } from "./solvers/stock-trader-two-solver.js";
import { solve as solveStockTraderThree } from "./solvers/stock-trader-three-solver.js";
import { solve as solveStockTraderFour } from "./solvers/stock-trader-four-solver.js";
import { solve as solveTotalWaysToSum } from "./solvers/total-ways-to-sum-solver.js";
import { solve as solveTotalWaysToSumTwo } from "./solvers/total-ways-to-sum-two-solver.js";
import { solve as solveTwoColoring } from "./solvers/two-coloring-solver.js";
import { solve as solveUniquePathsOne } from "./solvers/unique-paths-one-solver.js";
import { solve as solveUniquePathsTwo } from "./solvers/unique-paths-two-solver.js";
import { solve as solveValidExpressions } from "./solvers/valid-expressions-solver.js";
import { solve as solveVigenereCipher } from "./solvers/vigenere-cipher-solver.js";

export async function main(ns) {
    // Disable default logging
    ns.disableLog("ALL");
    
    // Constants
    const SCAN_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
    const SOLUTIONS_PATH = "coding_contracts/solutions.txt";

    // Create a basic tail window for monitoring
    ns.tail();
    ns.resizeTail(800, 600);

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

    // Solver mapping
    const solvers = {
        "Find Largest Prime Factor": solvePrimeFactor,
        "Subarray with Maximum Sum": solveMaxSubarray,
        "Total Ways to Sum": solveTotalWaysToSum,
        "Total Ways to Sum II": solveTotalWaysToSumTwo,
        "Spiralize Matrix": solveSpiralize,
        "Array Jumping Game": solveArrayJumping,
        "Array Jumping Game II": solveArrayJumpingTwo,
        "Merge Overlapping Intervals": solveMergeIntervals,
        "Generate IP Addresses": solveGenerateIP,
        "Algorithmic Stock Trader I": solveStockTraderOne,
        "Algorithmic Stock Trader II": solveStockTraderTwo,
        "Algorithmic Stock Trader III": solveStockTraderThree,
        "Algorithmic Stock Trader IV": solveStockTraderFour,
        "Minimum Path Sum in a Triangle": solveMinTriangle,
        "Unique Paths in a Grid I": solveUniquePathsOne,
        "Unique Paths in a Grid II": solveUniquePathsTwo,
        "Sanitize Parentheses in Expression": solveSanitizeParentheses,
        "Find All Valid Math Expressions": solveValidExpressions,
        "HammingCodes: Integer to Encoded Binary": solveHammingEncode,
        "HammingCodes: Encoded Binary to Integer": solveHammingDecode,
        "Proper 2-Coloring of a Graph": solveTwoColoring,
        "Compression I: RLE Compression": solveCompressionOne,
        "Compression II: LZ Decompression": solveCompressionTwo,
        "Compression III: LZ Compression": solveCompressionThree,
        "Encryption I: Caesar Cipher": solveCaesarCipher,
        "Encryption II: Vigenère Cipher": solveVigenereCipher,
        "Square Root": solveSquareRoot,
        "Shortest Path in a Grid": solveShortestPath
    };

    /**
     * Recursively scan the network for all servers
     * @param {string} host - Starting host
     * @param {Set<string>} visited - Set of visited servers
     * @returns {string[]} Array of all server names
     */
    function scanNetwork(host, visited = new Set()) {
        if (visited.has(host)) return [];
        visited.add(host);
        const servers = [host];
        const connected = ns.scan(host);
        for (const server of connected) {
            servers.push(...scanNetwork(server, visited));
        }
        return servers;
    }

    /**
     * Safely converts any value to a string for logging
     * @param {any} value - Value to stringify
     * @returns {string} Safe string representation
     */
    function safeStringify(value) {
        if (typeof value === 'bigint') return value.toString();
        if (typeof value === 'object') {
            return JSON.stringify(value, (_, v) => 
                typeof v === 'bigint' ? v.toString() : v
            );
        }
        return String(value);
    }

    /**
     * Logs a successful solution
     * @param {Object} result - Solution result object
     */
    async function logSolution(result) {
        const solutionEntry = {
            timestamp: new Date().toISOString(),
            type: result.type,
            data: safeStringify(result.data),
            solution: safeStringify(result.solution),
            reward: result.reward
        };

        await ns.write(SOLUTIONS_PATH, JSON.stringify(solutionEntry) + "\n", "a");
    }

    /**
     * Process a single contract
     * @param {string} server - Server name
     * @param {string} filename - Contract filename
     */
    async function processContract(server, filename) {
        try {
            const type = ns.codingcontract.getContractType(filename, server);
            const data = ns.codingcontract.getData(filename, server);
            
            ns.print(`${COLOR.CYAN}Found contract: ${COLOR.BOLD}${type}${COLOR.RESET}`);
            ns.print(`${COLOR.CYAN}Location: ${server}/${filename}${COLOR.RESET}`);
            ns.print(`${COLOR.CYAN}Input Data: ${COLOR.RESET}${safeStringify(data)}\n`);

            // Skip long Valid Math Expressions contracts
            if (type === "Find All Valid Math Expressions" && data[0].length > 8) {
                ns.print(`${COLOR.YELLOW}Skipping long math expression contract (length: ${data[0].length})${COLOR.RESET}\n`);
                return;
            }

            const solver = solvers[type];
            if (!solver) {
                ns.print(`${COLOR.RED}No solver implemented for: ${type}${COLOR.RESET}\n`);
                return;
            }

            const solution = await solver(data, ns);
            const result = ns.codingcontract.attempt(
                solution,
                filename,
                server,
                { returnReward: true }
            );

            if (result) {
                ns.print(`${COLOR.GREEN}Successfully solved ${type}!${COLOR.RESET}`);
                ns.print(`${COLOR.GREEN}Reward: ${result}${COLOR.RESET}\n`);
                await logSolution({ type, data, solution, reward: result });
            } else {
                ns.print(`${COLOR.RED}Failed to solve ${type}${COLOR.RESET}`);
                ns.print(`${COLOR.RED}Attempted solution: ${safeStringify(solution)}${COLOR.RESET}\n`);
            }

        } catch (error) {
            ns.print(`${COLOR.RED}Error processing contract: ${error}${COLOR.RESET}\n`);
        }
    }

    // Main loop
    while (true) {
        try {
           
            const servers = scanNetwork('home');
            let totalContracts = 0;
            
            for (const server of servers) {
                const contracts = ns.ls(server, '.cct');
                totalContracts += contracts.length;
                
                for (const contract of contracts) {
                    await processContract(server, contract);
                }
            }
                        
            await ns.sleep(SCAN_INTERVAL);
            
        } catch (error) {
            ns.print(`${COLOR.RED}Error in main loop: ${error}${COLOR.RESET}\n`);
            await ns.sleep(SCAN_INTERVAL);
        }
    }
} 