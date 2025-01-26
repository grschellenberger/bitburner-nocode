/** @param {NS} ns */
export async function main(ns) {
    try {
        const [target, delay = 0, startTime = Date.now()] = ns.args;
        if (!target) throw new Error("Target server not specified");
        
        // Wait for designated start time + delay
        const timeToWait = (startTime + delay) - Date.now();
        if (timeToWait > 0) await ns.sleep(timeToWait);
        
        await ns.hack(target);
    } catch (err) {
        // Minimal error handling to keep script lightweight
        ns.print(`ERROR in hack-once: ${err}`);
    }
} 