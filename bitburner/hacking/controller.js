/** @param {NS} ns */
export async function main(ns) {
    // Disable logging
    ns.disableLog('getServerMoneyAvailable');
    ns.disableLog('getServerMaxMoney');
    ns.disableLog('getServerMaxRam');
    ns.disableLog('getServerUsedRam');
    ns.disableLog('getServerSecurityLevel');
    ns.disableLog('getServerMinSecurityLevel');
    ns.disableLog('getServerRequiredHackingLevel');
    ns.disableLog('exec');
    ns.disableLog('scan');
    ns.disableLog('sleep');
    ns.disableLog('getHackingLevel');
    ns.disableLog('getServer');
    ns.disableLog('getServerGrowth');
    ns.disableLog('hackAnalyzeChance');
    ns.disableLog('hackAnalyze');
    ns.disableLog('growthAnalyze');
    ns.disableLog('weakenAnalyze');
  
    // Add batch tracking set
    const activeBatches = new Set();
  
    // Constants
    const SCRIPTS = {
        hack: "infect/hack-once.js",
        grow: "infect/grow-once.js",
        weaken: "infect/weaken-once.js"
    };
    const MIN_SERVER_RAM = 4;
    const RAM_CHECK_TIMEOUT = 10000;  // 10 seconds
    const OPERATION_SPACING = 100;    // 100ms between operations within a batch
    const SERVER_SPACING = 100;       // 100ms between targeting different servers in same run
    const BATCH_BUFFER = 400;         // 400ms buffer between batch cycles

    // Cache script RAM costs
    const SCRIPT_RAM = {
        hack: ns.getScriptRam(SCRIPTS.hack),
        grow: ns.getScriptRam(SCRIPTS.grow),
        weaken: ns.getScriptRam(SCRIPTS.weaken)
    };
  
    function getBatchDelay(ns) {
        return (OPERATION_SPACING * 3) + BATCH_BUFFER;  // 700ms total
    }
  
    // Logging utility
    function log(ns, message, type = 'info') {
        const prefix = type === 'error' ? 'ERROR: ' : 
                      type === 'warning' ? 'WARNING: ' : '';
        ns.print(`${prefix}${message}`);
    }
  
    function getAvailableRam(ns, host) {
        return host === "home" ? 
            (ns.getServerMaxRam(host) * 0.8 - ns.getServerUsedRam(host)) :
            (ns.getServerMaxRam(host) - ns.getServerUsedRam(host));
    }
  
    function getTotalAvailableRam(ns, hosts) {
        return hosts.reduce((sum, host) => sum + getAvailableRam(ns, host), 0);
    }
  
    function sortHostsByEfficiency(ns, hosts) {
        return hosts.map(host => ({
            name: host,
            ram: getAvailableRam(ns, host),
            efficiency: host === 'home' ? 0.8 : 1.0  // Prefer non-home servers
        }))
        .sort((a, b) => (b.ram * b.efficiency) - (a.ram * a.efficiency));
    }
  
    function getAvailableHosts(ns) {
        const hosts = [];
        const visited = new Set();
        const stack = ["home"];
        
        // First, get all purchased servers with sufficient RAM
        const purchasedServers = ns.getPurchasedServers()
            .filter(server => ns.getServerMaxRam(server) >= MIN_SERVER_RAM)
            .sort((a, b) => ns.getServerMaxRam(b) - ns.getServerMaxRam(a));
        
        hosts.push(...purchasedServers);
        
        // Add home server if it meets minimum RAM requirement
        const homeMaxRam = ns.getServerMaxRam('home');
        if (homeMaxRam >= MIN_SERVER_RAM) {
            const usableHomeRam = Math.floor(homeMaxRam * 0.8);
            const insertIndex = hosts.findIndex(server => 
                ns.getServerMaxRam(server) <= usableHomeRam
            );
            
            if (insertIndex === -1) {
                hosts.push('home');
            } else {
                hosts.splice(insertIndex, 0, 'home');
            }
        }
        
        // Find all network servers
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
            
            if (server !== "home" && 
                !purchasedServers.includes(server) && 
                ns.hasRootAccess(server) && 
                ns.getServerMaxRam(server) >= MIN_SERVER_RAM) {
                
                const insertIndex = hosts.findIndex(host => 
                    ns.getServerMaxRam(host) <= ns.getServerMaxRam(server)
                );
                
                if (insertIndex === -1) {
                    hosts.push(server);
                } else {
                    hosts.splice(insertIndex, 0, server);
                }
            }
        }
        
        return hosts;
    }
  
    async function getValidServers(ns) {
        const visited = new Set();
        const stack = ["home"];
        const validServers = [];
  
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
  
            if (server !== "home" && 
                ns.getServerMaxMoney(server) > 0 &&
                ns.hasRootAccess(server) &&
                ns.getHackingLevel() >= ns.getServerRequiredHackingLevel(server)) {
                validServers.push(server);
            }
        }
        return validServers;
    }
  
    function calculateDelays(ns, target) {
        const hackTime = ns.getHackTime(target);
        const growTime = ns.getGrowTime(target);
        const weakenTime = ns.getWeakenTime(target);
        
        return {
            weaken1Delay: 0,
            hackDelay: Math.max(0, weakenTime - hackTime - OPERATION_SPACING),
            growDelay: Math.max(0, weakenTime - growTime + OPERATION_SPACING),
            weaken2Delay: OPERATION_SPACING * 2  // 200ms after first weaken
        };
    }
  
    function calculateTargetValue(ns, server) {
        try {
            const maxMoney = ns.getServerMaxMoney(server);
            const hackChance = ns.hackAnalyzeChance(server);
            const weakenTime = ns.getWeakenTime(server);
            
            // Simple money per second calculation
            // Higher max money, better hack chance, and lower weaken time = better target
            const value = (maxMoney * hackChance) / weakenTime;
            
            return value;
        } catch (err) {
            log(ns, `ERROR calculating target value for ${server}: ${err}`, 'error');
            return 0;
        }
    }
  
    function calculateRamUtilization(ns, target) {
        const serverGrowth = ns.getServerGrowth(target);
        const maxMoney = ns.getServerMaxMoney(target);
        
        let utilization = 0.8;
        
        if (serverGrowth > 50) utilization += 0.1;
        if (serverGrowth < 20) utilization -= 0.1;
        
        if (maxMoney > 1e9) utilization += 0.05;
        if (maxMoney < 1e6) utilization -= 0.05;
        
        return Math.min(0.95, Math.max(0.6, utilization));
    }
  
    function isServerPrepped(ns, target) {
        const currentSecurity = ns.getServerSecurityLevel(target);
        const minSecurity = ns.getServerMinSecurityLevel(target);
        const currentMoney = ns.getServerMoneyAvailable(target);
        const maxMoney = ns.getServerMaxMoney(target);
        
        return currentSecurity <= minSecurity + 0.1 && 
               currentMoney >= maxMoney * 0.99;
    }
  
    function needsRecovery(ns, target) {
        const currentSecurity = ns.getServerSecurityLevel(target);
        const minSecurity = ns.getServerMinSecurityLevel(target);
        const currentMoney = ns.getServerMoneyAvailable(target);
        const maxMoney = ns.getServerMaxMoney(target);
        
        return currentSecurity > minSecurity + 1 || 
               currentMoney < maxMoney * 0.9;
    }
  
    function isBeingPrepped(ns, target) {
        const hosts = getAvailableHosts(ns);
        
        for (const host of hosts) {
            const scripts = ns.ps(host);
            const prepScripts = scripts.filter(script => 
                (script.filename === SCRIPTS.grow || script.filename === SCRIPTS.weaken) &&
                script.args[0] === target
            );
            
            if (prepScripts.length > 0) return true;
        }
        return false;
    }
  
    async function prepareHost(ns, host) {
        if (host === 'home') return true;
        
        try {
            const scriptsExist = Object.values(SCRIPTS).every(script => 
                ns.fileExists(script, host)
            );
            
            if (!scriptsExist) {
                await ns.scp(Object.values(SCRIPTS), host, "home");
                
                const verifyScripts = Object.values(SCRIPTS).every(script => 
                    ns.fileExists(script, host)
                );
                
                if (!verifyScripts) {
                    throw new Error(`Failed to copy scripts to ${host}`);
                }
            }
            return true;
        } catch (err) {
            log(ns, `ERROR preparing host ${host}: ${err}`, 'error');
            return false;
        }
    }
  
    function calculateThreads(ns, operation, target, weakenType = 0) {
        try {
            const maxMoney = ns.getServerMaxMoney(target);
            const serverGrowth = ns.getServerGrowth(target);
            const cores = ns.getServer('home').cpuCores;
            const weakenPerThread = ns.weakenAnalyze(1, cores);
            
            switch(operation) {
                case 'hack':
                    const hackPerThread = ns.hackAnalyze(target);
                    
                    let hackPercent;
                    if (serverGrowth > 50) {
                        hackPercent = 0.75;
                    } else if (serverGrowth > 25) {
                        hackPercent = 0.50;
                    } else {
                        hackPercent = 0.35;
                    }
                    
                    if (maxMoney < 1e6) hackPercent *= 0.5;
                    if (maxMoney > 1e9) hackPercent *= 1.5;
                    
                    // Calculate hack threads and its security impact
                    const hackThreads = Math.ceil(hackPercent / hackPerThread);
                    const hackSecurity = ns.hackAnalyzeSecurity(hackThreads);
                    
                    // Project server state after hack
                    const moneyAfterHack = maxMoney * Math.max(0.25, (1 - hackPercent));
                    
                    // Calculate grow threads needed to recover from hack
                    const growthNeeded = Math.max(1, maxMoney / moneyAfterHack);
                    const growThreads = Math.ceil(ns.growthAnalyze(target, growthNeeded, cores));
                    const growSecurity = ns.growthAnalyzeSecurity(growThreads);
                    
                    // Calculate weaken threads needed for both hack and grow
                    // First weaken (after hack)
                    const weakenThreads1 = Math.ceil(hackSecurity / weakenPerThread);
                    // Second weaken (after grow)
                    const weakenThreads2 = Math.ceil(growSecurity / weakenPerThread);
                    
                    // Return appropriate threads based on operation
                    return weakenType === 1 ? weakenThreads1 : weakenType === 2 ? weakenThreads2 : hackThreads;
                    
                case 'grow':
                    // Calculate grow threads needed from minimum money state
                    const growthRequired = Math.max(1, maxMoney / (maxMoney * 0.25));
                    return Math.ceil(ns.growthAnalyze(target, growthRequired, cores));

                case 'weaken':
                    // For first weaken (after hack)
                    if (weakenType === 1) {
                        const hackThreads = calculateThreads(ns, 'hack', target);
                        const hackSec = ns.hackAnalyzeSecurity(hackThreads);
                        return Math.ceil(hackSec / weakenPerThread);
                    }
                    // For second weaken (after grow)
                    else {
                        const growThreads = calculateThreads(ns, 'grow', target);
                        const growSec = ns.growthAnalyzeSecurity(growThreads);
                        return Math.ceil(growSec / weakenPerThread);
                    }

                default:
                    throw new Error(`Unknown operation: ${operation}`);
            }
        } catch (err) {
            log(ns, `ERROR calculating threads for ${operation} on ${target}: ${err}`, 'error');
            return 1;
        }
    }
  
    async function calculatePreparationNeeds(ns, target) {
        try {
            const currentSecurity = ns.getServerSecurityLevel(target);
            const minSecurity = ns.getServerMinSecurityLevel(target);
            const cores = ns.getServer('home').cpuCores;
            const weakenPerThread = ns.weakenAnalyze(1, cores);
            
            // Calculate initial weaken threads
            const initialWeakenThreads = Math.ceil((currentSecurity - minSecurity + 0.5) / weakenPerThread);
            
            // Simulate server state after initial weaken
            const securityAfterWeaken = Math.max(minSecurity, currentSecurity - (initialWeakenThreads * weakenPerThread));
            
            const currentMoney = ns.getServerMoneyAvailable(target);
            const maxMoney = ns.getServerMaxMoney(target);
            
            // Calculate grow threads based on state after initial weaken
            // Server will be at minimum security when grow starts
            const growthMultiplier = Math.max(1, maxMoney / Math.max(currentMoney, 1));
            const growThreads = Math.ceil(ns.growthAnalyze(target, growthMultiplier, cores));

            // Calculate security increase from grow
            const growthSecurityIncrease = ns.growthAnalyzeSecurity(growThreads);
            
            // Calculate additional weaken threads needed based on grow's security increase
            // This weaken will start after grow completes
            const additionalWeakenThreads = Math.ceil(growthSecurityIncrease / weakenPerThread);

            return {
                initialWeaken: Math.max(1, initialWeakenThreads),
                grow: Math.max(1, growThreads),
                additionalWeaken: Math.max(1, additionalWeakenThreads),
                totalRamNeeded: (initialWeakenThreads + growThreads + additionalWeakenThreads) * SCRIPT_RAM.weaken
            };
        } catch (err) {
            log(ns, `ERROR calculating preparation needs for ${target}: ${err}`, 'error');
            return null;
        }
    }
  
    async function executePreparation(ns, target, hosts) {
        try {
            const prepNeeds = await calculatePreparationNeeds(ns, target);
            if (!prepNeeds) return false;

            if (prepNeeds.initialWeaken === 0 && prepNeeds.grow === 0) return true;

            // Convert hosts to the correct format
            const availableHosts = hosts.map(host => 
                typeof host === 'string' ? 
                { name: host, ram: getAvailableRam(ns, host) } : 
                host
            );

            const { weaken1Delay, hackDelay, growDelay, weaken2Delay } = calculateDelays(ns, target);
            const now = Date.now();

            const operations = [
                {
                    script: SCRIPTS.weaken,
                    threads: prepNeeds.initialWeaken,
                    delay: weaken1Delay,
                    ram: SCRIPT_RAM.weaken,
                    args: [1],
                    name: 'initial weaken'
                },
                {
                    script: SCRIPTS.grow,
                    threads: prepNeeds.grow,
                    delay: growDelay,
                    ram: SCRIPT_RAM.grow,
                    name: 'grow'
                },
                {
                    script: SCRIPTS.weaken,
                    threads: prepNeeds.additionalWeaken,
                    delay: weaken2Delay,
                    ram: SCRIPT_RAM.weaken,
                    args: [2],
                    name: 'additional weaken'
                }
            ];

            // Split operations across available hosts
            for (const operation of operations) {
                if (operation.threads <= 0) continue;

                let remainingThreads = operation.threads;
                let operationScheduled = false;
                
                // Sort hosts by available RAM for each operation
                const sortedHosts = [...availableHosts].sort((a, b) => b.ram - a.ram);
                
                for (const host of sortedHosts) {
                    if (host.ram <= 0) continue;

                    const maxThreads = Math.floor(host.ram / operation.ram);
                    if (maxThreads <= 0) continue;

                    const threadsToUse = Math.min(remainingThreads, maxThreads);
                    const ramNeeded = operation.ram * threadsToUse;

                    if (await prepareHost(ns, host.name)) {
                        const pid = ns.exec(
                            operation.script,
                            host.name,
                            threadsToUse,
                            target,
                            operation.delay,
                            now,
                            ...(operation.args || [])
                        );

                        if (pid === 0) {
                            log(ns, `Failed to start ${operation.name} on ${host.name} (RAM: ${host.ram.toFixed(2)}GB, needed: ${ramNeeded.toFixed(2)}GB)`, 'warning');
                            continue;
                        }

                        host.ram -= ramNeeded;
                        remainingThreads -= threadsToUse;
                        operationScheduled = true;

                        if (remainingThreads <= 0) break;
                    }
                }

                if (remainingThreads > 0) {
                    log(ns, `Could not allocate all threads for ${operation.name} (${remainingThreads} threads remaining)`, 'warning');
                    return false;
                }

                if (!operationScheduled) {
                    log(ns, `Failed to schedule ${operation.name}`, 'warning');
                    return false;
                }
            }

            return true;
        } catch (err) {
            log(ns, `ERROR executing preparation for ${target}: ${err}`, 'error');
            return false;
        }
    }
  
    function calculateTotalBatchRam(ns, target) {
        try {
            const hackThreads = calculateThreads(ns, 'hack', target);
            const growThreads = calculateThreads(ns, 'grow', target);
            const weaken1Threads = calculateThreads(ns, 'weaken', target, 1);  // After hack
            const weaken2Threads = calculateThreads(ns, 'weaken', target, 2);  // After grow
            const cores = ns.getServer('home').cpuCores;
            const weakenPerThread = ns.weakenAnalyze(1, cores);

            return (hackThreads * SCRIPT_RAM.hack) +
                   (growThreads * SCRIPT_RAM.grow) +
                   (weaken1Threads * SCRIPT_RAM.weaken) +
                   (weaken2Threads * SCRIPT_RAM.weaken);
        } catch (err) {
            log(ns, `ERROR calculating batch RAM for ${target}: ${err}`, 'error');
            return Infinity;
        }
    }
  
    async function executeBatch(ns, target, hosts) {
        try {
            const now = Date.now();
            const batchId = `${target}-${now}`;
            
            if (activeBatches.has(batchId)) {
                log(ns, `Batch ${batchId} already active`, 'warning');
                return false;
            }

            // Convert hosts to the correct format if they aren't already
            const availableHosts = hosts.map(host => 
                typeof host === 'string' ? 
                { name: host, ram: getAvailableRam(ns, host) } : 
                host
            );

            const hackThreads = calculateThreads(ns, 'hack', target);
            const growThreads = calculateThreads(ns, 'grow', target);
            const weaken1Threads = calculateThreads(ns, 'weaken', target, 1);
            const weaken2Threads = calculateThreads(ns, 'weaken', target, 2);

            const { weaken1Delay, hackDelay, growDelay, weaken2Delay } = calculateDelays(ns, target);

            const operations = [
                { script: SCRIPTS.weaken, threads: weaken1Threads, delay: weaken1Delay, ram: SCRIPT_RAM.weaken * weaken1Threads, args: [1], name: 'weaken1' },
                { script: SCRIPTS.hack, threads: hackThreads, delay: hackDelay, ram: SCRIPT_RAM.hack * hackThreads, name: 'hack' },
                { script: SCRIPTS.grow, threads: growThreads, delay: growDelay, ram: SCRIPT_RAM.grow * growThreads, name: 'grow' },
                { script: SCRIPTS.weaken, threads: weaken2Threads, delay: weaken2Delay, ram: SCRIPT_RAM.weaken * weaken2Threads, args: [2], name: 'weaken2' }
            ];

            const totalRamNeeded = operations.reduce((sum, op) => sum + op.ram, 0);
            const totalRamAvailable = availableHosts.reduce((sum, host) => sum + host.ram, 0);

            log(ns, `Batch for ${target}: H:${hackThreads} G:${growThreads} W1:${weaken1Threads} W2:${weaken2Threads} RAM(${totalRamNeeded.toFixed(2)} / ${totalRamAvailable.toFixed(2)})`);

            // Split operations across available hosts
            for (const operation of operations) {
                let remainingThreads = operation.threads;
                let operationScheduled = false;
                
                // Sort hosts by available RAM for each operation
                const sortedHosts = [...availableHosts].sort((a, b) => b.ram - a.ram);
                
                for (const host of sortedHosts) {
                    if (host.ram <= 0) continue;

                    const maxThreads = Math.floor(host.ram / (operation.ram / operation.threads));
                    if (maxThreads <= 0) continue;

                    const threadsToUse = Math.min(remainingThreads, maxThreads);
                    const ramNeeded = (operation.ram / operation.threads) * threadsToUse;

                    if (await prepareHost(ns, host.name)) {
                        const pid = ns.exec(
                            operation.script, 
                            host.name, 
                            threadsToUse, 
                            target, 
                            operation.delay, 
                            now, 
                            ...(operation.args || [])
                        );

                        if (pid === 0) {
                            log(ns, `Failed to start ${operation.name} on ${host.name} (RAM: ${host.ram.toFixed(2)}GB, needed: ${ramNeeded.toFixed(2)}GB)`, 'warning');
                            continue;
                        }

                        host.ram -= ramNeeded;
                        remainingThreads -= threadsToUse;
                        operationScheduled = true;

                        if (remainingThreads <= 0) break;
                    }
                }

                if (remainingThreads > 0) {
                    log(ns, `Could not allocate all threads for ${operation.name} (${remainingThreads} threads remaining)`, 'warning');
                    return false;
                }

                if (!operationScheduled) {
                    log(ns, `Failed to schedule ${operation.name}`, 'warning');
                    return false;
                }
            }

            activeBatches.add(batchId);
            setTimeout(() => activeBatches.delete(batchId), getBatchDelay(ns));
            return true;

        } catch (err) {
            log(ns, `ERROR executing batch on ${target}: ${err}`, 'error');
            return false;
        }
    }
  
    // Main Loop
    while (true) {
        try {
            const validServers = await getValidServers(ns);
            const hosts = getAvailableHosts(ns);
            const serversNeedingPrep = [];
            const readyForBatching = [];
  
            for (const server of validServers) {
                if (needsRecovery(ns, server) || !isServerPrepped(ns, server)) {
                    if (!isBeingPrepped(ns, server)) {
                        serversNeedingPrep.push(server);
                    }
                } else {
                    readyForBatching.push(server);
                }
            }
  
            if (serversNeedingPrep.length > 0) {
                log(ns, `Preparing servers: ${serversNeedingPrep.join(', ')}`);
                for (const target of serversNeedingPrep) {
                    await executePreparation(ns, target, hosts);
                    await ns.sleep(SERVER_SPACING);
                }
                await ns.sleep(getBatchDelay(ns));
                continue;
            }
  
            if (readyForBatching.length > 0) {
                const totalAvailableRam = getTotalAvailableRam(ns, hosts);
                
                const serverMetrics = readyForBatching
                    .map(server => ({
                        name: server,
                        value: calculateTargetValue(ns, server),
                        ramNeeded: calculateTotalBatchRam(ns, server)
                    }))
                    .filter(server => server.ramNeeded > 0)
                    .sort((a, b) => b.value - a.value);

                const selectedTargets = [];
                let remainingRam = totalAvailableRam;
                
                for (const server of serverMetrics) {
                    if (remainingRam >= server.ramNeeded) {
                        selectedTargets.push(server.name);
                        remainingRam -= server.ramNeeded;
                    }
                }

                if (selectedTargets.length > 0) {
                    log(ns, `Targeting ${selectedTargets.length} servers: ${selectedTargets.join(', ')}`);

                    for (const target of selectedTargets) {
                        try {
                            const success = await executeBatch(ns, target, hosts);
                            if (!success) {
                                log(ns, `Failed to execute batch on ${target}`, 'warning');
                                continue;
                            }
                            await ns.sleep(SERVER_SPACING);
                        } catch (err) {
                            log(ns, `Error executing batch on ${target}: ${err}`, 'error');
                            continue;
                        }
                    }
                }
            }
  
        } catch (err) {
            log(ns, `Error in main loop: ${err}`, 'error');
        }
        await ns.sleep(getBatchDelay(ns));
    }
}