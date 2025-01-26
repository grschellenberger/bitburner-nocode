/** @param {NS} ns */
export async function main(ns) {
    const updateInterval = 10000; // 10 seconds
    ns.disableLog('sleep');
  
    while (true) {
      const servers = getAllNonPlayerServers(ns);
      const serverData = [];
  
      for (const server of servers) {
        const maxMoney = ns.getServerMaxMoney(server);
  
        // Skip servers with NaN or 0 max money
        if (isNaN(maxMoney) || maxMoney === 0) {
          continue;
        } else {
          const max_ram = ns.getServerMaxRam(server);
          const used_ram = ns.getServerUsedRam(server);
          const money = ns.getServerMoneyAvailable(server);
          const min_security = ns.getServerMinSecurityLevel(server);
          const security = ns.getServerSecurityLevel(server);
          const hack_money = ns.hackAnalyze(server);
          const hack_chance = ns.hackAnalyzeChance(server);
          const weaken_time = ns.getWeakenTime(server);
          const rooted = ns.hasRootAccess(server) ? "Y" : "N";
          const ramPCT = (used_ram / max_ram) * 100;
          const moneyPCT = (money / maxMoney) * 100;
          const securityPCT = ((security - min_security) / min_security) * 100;
          const cycleLength = Math.ceil((weaken_time + 2000) / 1000);
          const moneyPerSecond = ((hack_money * maxMoney) * hack_chance) / cycleLength;
          const server_name = server + " ".repeat(Math.max(0, 20 - server.length));

  
          serverData.push({
            name: server_name,
            rooted: rooted,
            ramPCT: isNaN(ramPCT) ? 0 : ramPCT,
            moneyPCT: isNaN(moneyPCT) ? 0 : moneyPCT,
            securityPCT: isNaN(securityPCT) ? 0 : securityPCT,
            moneyPerSecond: isNaN(moneyPerSecond) ? 0 : moneyPerSecond
        });
        }
  
        // Debug: Print serverData to verify contents
        ns.print("Server Data: ", JSON.stringify(serverData));
  
        // Sort rooted servers by Money/Second in descending order
        const rootedServers = serverData.filter(server => server.rooted === "Y");
        const sortedServers = rootedServers
            .sort((a, b) => b.moneyPerSecond - a.moneyPerSecond)
            .slice(0, 25); // Limit to top 25 servers
  
        // Format and display the table
        ns.clearLog();
        ns.print("Server Name" + " ".repeat(Math.max(0, 20 - "Server Name".length)) + "| RAM% | $$$% | SEC% | $$$/s");
  
        for (const server of sortedServers) {
          if (server && server.name) { // Ensure server is defined and has a name
            ns.print(formatRow(ns, server));
          } else {
            ns.print("Error: Undefined server object encountered.");
          }
        }
      }
      await ns.sleep(updateInterval);
    }
  
    function getAllNonPlayerServers(ns) {
      const visited = new Set();
      const stack = ["home"];
      const nonPlayerServers = [];
  
      while (stack.length > 0) {
        const server = stack.pop();
        if (visited.has(server)) continue;
        visited.add(server);
  
        const connectedServers = ns.scan(server);
        for (const connectedServer of connectedServers) {
          if (!visited.has(connectedServer)) {
            stack.push(connectedServer);
          }
        }
  
        if (server !== "home" && !ns.getPurchasedServers().includes(server)) {
          nonPlayerServers.push(server);
        }
      }
  
      return nonPlayerServers;
    }
  
    function formatRow(ns, server) {
      return `${server.name}|`
      + ` ${" ".repeat(Math.max(0, 3 - ns.formatNumber(server.ramPCT, 0).length))}${ns.formatNumber(server.ramPCT, 0)}%`
      + ` | ${" ".repeat(Math.max(0, 3 - ns.formatNumber(server.moneyPCT, 0).length))}${ns.formatNumber(server.moneyPCT, 0)}%`
      + ` | ${" ".repeat(Math.max(0, 3 - ns.formatNumber(server.securityPCT, 0).length))}${ns.formatNumber(server.securityPCT, 0)}%`
      + ` | ${ns.formatNumber(server.moneyPerSecond, 0)}`;
    }
}