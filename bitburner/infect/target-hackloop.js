/** @param {NS} ns */
export async function main(ns) {
    const target = ns.args[0];
  
    if (!target) {
      ns.tprint("Error: No target server specified, using joesguns.");
      const target = "joesguns";
      return;
    }
  
    // Disable default logging
    ns.disableLog("ALL");
    ns.print(`Starting hack loop on ${target}...`);
  
    while (true) {
      const maxMoney = ns.getServerMaxMoney(target);
      const minSecurity = ns.getServerMinSecurityLevel(target);
      const moneyThreshold = maxMoney;
      const securityThreshold = minSecurity;
  
      const currentMoney = ns.getServerMoneyAvailable(target);
      const currentSecurity = ns.getServerSecurityLevel(target);
  
      if ((currentSecurity > securityThreshold) || ns.fileExists("Formulas.exe", "home") || ns.isRunning("controller.js", "home")) {
        ns.print(`Weakening ${target}... (${currentSecurity.toFixed(2)}/${minSecurity.toFixed(2)})`);
        await ns.weaken(target);
      } else if (currentMoney < moneyThreshold) {
        ns.print(`Growing ${target}... (${ns.formatNumber(currentMoney, 0)}/${ns.formatNumber(maxMoney, 0)})`);
        await ns.grow(target);
      } else {
        const moneyBeforeHack = ns.getServerMoneyAvailable(target);
        await ns.hack(target);
        const moneyAfterHack = ns.getServerMoneyAvailable(target);
        const moneyEarned = moneyBeforeHack - moneyAfterHack;
        ns.print(`Hacking ${target}... Earned: ${ns.formatNumber(moneyEarned, 0)}`);
      }
  
      await ns.sleep(100);
    }
  } 