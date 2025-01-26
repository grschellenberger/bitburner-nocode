/** @param {NS} ns */
export async function main(ns) {
    // Constants
    const MONEY_MULTIPLIER = 2;
    const MAX_LEVEL = 200;
    const MAX_RAM = 64;
    const MAX_CORES = 16;
    const CHECK_INTERVAL = 1000;
    const MIN_BALANCE = ns.hasTorRouter() ? 0 : 200000;

    // Disable default logging to clean up output
    ns.disableLog("getServerMoneyAvailable");
    ns.disableLog("sleep");

    // Track total spent
    let totalSpent = 0;

    function getTotalProduction(ns) {
        const nodeCount = ns.hacknet.numNodes();
        let total = 0;
        for (let i = 0; i < nodeCount; i++) {
            total += ns.hacknet.getNodeStats(i).totalProduction;
        }
        return total;
    }

    function canAfford(cost) {
        const availableMoney = ns.getServerMoneyAvailable("home");
        const totalProduction = getTotalProduction(ns)*1000;
        return availableMoney >= (cost * MONEY_MULTIPLIER) + MIN_BALANCE && 
               (totalProduction > totalSpent || totalSpent < 1000000);  // Allow purchases if total spent < 1M
    }

    function isNodeMaxed(nodeIndex) {
        const node = ns.hacknet.getNodeStats(nodeIndex);
        return node.level >= MAX_LEVEL && 
               node.ram >= MAX_RAM && 
               node.cores >= MAX_CORES;
    }

    function areAllNodesMaxed() {
        const nodeCount = ns.hacknet.numNodes();
        
        // Return false if no nodes exist
        if (nodeCount === 0) return false;
        
        for (let i = 0; i < nodeCount; i++) {
            if (!isNodeMaxed(i)) return false;
        }
        return true;
    }

    function tryPurchaseNode() {
        const cost = ns.hacknet.getPurchaseNodeCost();
        if (canAfford(cost)) {
            const index = ns.hacknet.purchaseNode();
            if (index !== -1) {
                totalSpent += cost;
                ns.toast(`Purchased Hacknet Node ${index}`, 'success');
                return true;
            }
        }
        return false;
    }

    function tryUpgradeNode(nodeIndex) {
        let upgraded = false;
        const stats = ns.hacknet.getNodeStats(nodeIndex);

        // Try Level Upgrade
        if (stats.level < MAX_LEVEL) {
            const cost = ns.hacknet.getLevelUpgradeCost(nodeIndex, 1);
            if (canAfford(cost)) {
                ns.hacknet.upgradeLevel(nodeIndex, 1);
                totalSpent += cost;
                if (stats.level + 1 === MAX_LEVEL) {
                    ns.toast(`Node ${nodeIndex} reached maximum level!`, 'success');
                }
                upgraded = true;
            }
        }

        // Try RAM Upgrade
        if (stats.ram < MAX_RAM) {
            const cost = ns.hacknet.getRamUpgradeCost(nodeIndex, 1);
            if (canAfford(cost)) {
                ns.hacknet.upgradeRam(nodeIndex, 1);
                totalSpent += cost;
                if (stats.ram * 2 === MAX_RAM) {
                    ns.toast(`Node ${nodeIndex} reached maximum RAM!`, 'success');
                }
                upgraded = true;
            }
        }

        // Try Core Upgrade
        if (stats.cores < MAX_CORES) {
            const cost = ns.hacknet.getCoreUpgradeCost(nodeIndex, 1);
            if (canAfford(cost)) {
                ns.hacknet.upgradeCore(nodeIndex, 1);
                totalSpent += cost;
                if (stats.cores + 1 === MAX_CORES) {
                    ns.toast(`Node ${nodeIndex} reached maximum cores!`, 'success');
                }
                upgraded = true;
            }
        }

        return upgraded;
    }

    // Main loop
    while (true) {
        if (areAllNodesMaxed()) {
            ns.toast("All Hacknet nodes are maximized!", 'success');
            ns.print("All nodes maximized - script terminating");
            ns.exit();
        }

        // Try to purchase new node
        tryPurchaseNode();

        // Try to upgrade existing nodes
        const nodeCount = ns.hacknet.numNodes();
        for (let i = 0; i < nodeCount; i++) {
            tryUpgradeNode(i);
        }

        await ns.sleep(CHECK_INTERVAL);
    }
} 