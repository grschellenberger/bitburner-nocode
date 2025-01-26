/** @param {NS} ns */
export async function main(ns) {
    try {
        const [target, delay = 0, startTime = Date.now()] = ns.args;
        if (!target) throw new Error("Target server not specified");
        
        // Wait for designated start time + delay
        const timeToWait = (startTime + delay) - Date.now();
        if (timeToWait > 0) await ns.sleep(timeToWait);
        
        await ns.weaken(target);
    } catch (err) {
        ns.print(`ERROR in weaken-once: ${err}`);
    }
} 