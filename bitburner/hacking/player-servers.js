/** @param {NS} ns */
export async function main(ns) {
    // Disable logging for specific functions to reduce console clutter
    ns.disableLog("getPurchasedServerLimit");
    ns.disableLog("getPurchasedServers");
    ns.disableLog("getServerMoneyAvailable");
    ns.disableLog("getPurchasedServerCost");
    ns.disableLog("getServerMaxRam");
    ns.disableLog("getServerUsedRam");
    ns.disableLog("getPurchasedServerUpgradeCost");

    // Loop through potential server sizes
    for (var size = 2; size <= 20; ++size) {
        var ram = Math.pow(2, size); // Calculate RAM size
        var formatted_ram = ns.formatRam(ram, 0); // Format RAM for display
        
        // If we have TOR router, don't require minimum balance
        const MIN_BALANCE = ns.hasTorRouter() ? 0 : 200000;
        
        // First, try to purchase new servers up to the limit
        while (ns.getPurchasedServers().length < ns.getPurchasedServerLimit()) {
            const availableMoney = ns.getServerMoneyAvailable("home");
            const serverCost = ns.getPurchasedServerCost(ram);
            
            if (availableMoney > serverCost + MIN_BALANCE) {
                const serverIndex = ns.getPurchasedServers().length;
                ns.purchaseServer(formatted_ram + "-" + serverIndex, ram);
                await ns.sleep(1000);
            } else {
                await ns.sleep(1000); // Wait before retrying
            }
        }

        // Then, upgrade existing servers
        const pserv = ns.getPurchasedServers();
        for (let i = 0; i < pserv.length; i++) {
            while (ns.getServerMaxRam(pserv[i]) < ram) {
                const availableMoney = ns.getServerMoneyAvailable("home");
                const upgradeCost = ns.getPurchasedServerUpgradeCost(pserv[i], ram);
                
                if (availableMoney > upgradeCost + MIN_BALANCE) {
                    await ns.upgradePurchasedServer(pserv[i], ram);
                    var upgrade_name = `${formatted_ram}-${i}`;
                    await ns.renamePurchasedServer(pserv[i], upgrade_name);
                    break;
                } else {
                    ns.print(`Not enough money to upgrade to ${formatted_ram}.`);
                    await ns.sleep(1000); // Wait before retrying
                }
            }
        }
        
        ns.toast(ns.formatRam(ram, 0) + " loop completed.", "info"); // Notify loop completion
        await ns.sleep(1000); // Short delay before next loop
    }
}