/** @param {NS} ns */
export async function main(ns) {
    const scanInterval = 60000; // 60 seconds
    const targetScript = "infect/target-hackloop.js";
    const defaultTarget = "joesguns";

    // List of hacking programs and their corresponding functions
    const hackingTools = [
        { name: "BruteSSH.exe", func: ns.brutessh },
        { name: "FTPCrack.exe", func: ns.ftpcrack },
        { name: "relaySMTP.exe", func: ns.relaysmtp },
        { name: "HTTPWorm.exe", func: ns.httpworm },
        { name: "SQLInject.exe", func: ns.sqlinject }
    ];

    // Disable default logging
    ns.disableLog("ALL");

    while (true) {
        const servers = new Set();
        const visited = new Set();
        const stack = ["home"];

        // Network scanning and root access attempts
        while (stack.length > 0) {
            const server = stack.pop();
            if (visited.has(server)) continue;
            visited.add(server);

            if (server !== "home") {
                servers.add(server);
            }

            const connectedServers = ns.scan(server);
            for (const connectedServer of connectedServers) {
                if (!visited.has(connectedServer)) {
                    stack.push(connectedServer);
                }
            }

            // Try to gain root access if we don't have it
            if (server !== "home" && 
                ns.getHackingLevel() >= ns.getServerRequiredHackingLevel(server) &&
                !ns.hasRootAccess(server)) {
                let portsOpened = 0;
                for (const tool of hackingTools) {
                    if (ns.fileExists(tool.name, "home")) {
                        try {
                            tool.func(server);
                            portsOpened++;
                        } catch (err) {}
                    }
                }
                if (portsOpened >= ns.getServerNumPortsRequired(server)) {
                    try {
                        ns.nuke(server);
                        ns.toast(`Gained root access to ${server}`, "success");
                    } catch (err) {}
                }
            }
        }

        // Check if controller.js is running
        const controllerRunning = ns.ps("home").some(proc => proc.filename === "controller.js");
        
        if (controllerRunning) {
            // Kill only target-hackloop.js scripts when controller is running
            for (const server of servers) {
                const runningScripts = ns.ps(server);
                for (const script of runningScripts) {
                    if (script.filename === targetScript) {
                        ns.kill(script.pid);
                    }
                }
            }
        } else {
            // Deploy scripts when controller is not running
            for (const server of servers) {
                if (ns.hasRootAccess(server)) {
                    const serverRam = ns.getServerMaxRam(server);
                    const scriptRam = ns.getScriptRam(targetScript);
                    const maxThreads = Math.floor((serverRam - ns.getServerUsedRam(server)) / scriptRam);

                    if (maxThreads > 0) {
                        await ns.scp(targetScript, server);

                        let target = defaultTarget;
                        const isPurchased = server.includes("pserv");
                        const serverMoney = ns.getServerMaxMoney(server);

                        if (!isPurchased && serverMoney > 0) {
                            target = server;
                        }

                        // Check if script is already running with correct target
                        const runningScripts = ns.ps(server);
                        const isAlreadyRunning = runningScripts.some(script => 
                            script.filename === targetScript && 
                            script.args[0] === target
                        );

                        if (!isAlreadyRunning) {
                            try {
                                ns.exec(targetScript, server, maxThreads, target);
                                ns.print(`Deployed ${targetScript} on ${server} targeting ${target} with ${maxThreads} threads`);
                            } catch (err) {
                                ns.print(`Failed to deploy on ${server}: ${err}`);
                            }
                        }
                    }
                }
            }
        }

        await ns.sleep(scanInterval);
    }
} 