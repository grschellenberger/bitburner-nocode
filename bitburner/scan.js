/** @param {NS} ns */
export async function main(ns) {
    // Disable default logging to keep output clean
    ns.disableLog('ALL');

    // Get target server from arguments if provided
    const targetServer = ns.args[0];

    // Create network map starting from home
    const networkMap = new Map();
    mapNetwork(ns, 'home', null, networkMap);

    // Handle different argument cases
    if (targetServer === "hackable") {
        displayHackableNetwork(ns, networkMap);
    } else if (targetServer) {
        const path = findPathToServer(networkMap, targetServer, ns);
        if (path) {
            // Display the path to the server
            ns.tprintf('Path to %s:', targetServer);
            for (let i = 0; i < path.length; i++) {
                const server = path[i];
                const prefix = i === 0 ? '' : '→ ';
                ns.tprintf('%s%s', prefix, server);
            }
            
            // Create and display the command string
            const commands = ['home', ...path.filter(s => s !== 'home').map(s => `connect ${s}`)];
            ns.tprintf('%s', commands.join(';'));
        } else {
            ns.tprintf('WARNING: %s does not exist', targetServer);
            displayNetwork(ns, networkMap);
        }
    } else {
        displayNetwork(ns, networkMap);
    }
}

/**
 * Recursively maps the network starting from a given server
 * @param {NS} ns - Netscript API
 * @param {string} server - Current server to map
 * @param {string|null} parent - Parent server
 * @param {Map} networkMap - Map to store network structure
 */
function mapNetwork(ns, server, parent, networkMap) {
    const connections = ns.scan(server);
    const hackLevel = ns.getServerRequiredHackingLevel(server);
    
    // Store server info in map
    networkMap.set(server, {
        parent: parent,
        children: connections.filter(conn => conn !== parent),
        hackLevel: hackLevel
    });

    // Recursively map connected servers
    for (const connection of connections) {
        if (connection !== parent && !networkMap.has(connection)) {
            mapNetwork(ns, connection, server, networkMap);
        }
    }
}

/**
 * Displays the network hierarchy
 * @param {NS} ns - Netscript API
 * @param {Map} networkMap - Network structure map
 */
function displayNetwork(ns, networkMap) {
    // Get list of purchased servers
    const purchasedServers = new Set(ns.getPurchasedServers());

    function displayServer(server, depth = 0) {
        const serverInfo = networkMap.get(server);
        const indent = '-'.repeat(depth);
        const prefix = depth === 0 ? '' : indent + ' ';
        
        // Only display if not a purchased server
        if (!purchasedServers.has(server)) {
            ns.tprintf('%s%s (%d)', prefix, server, serverInfo.hackLevel);
        }

        // Sort children by hack level
        const sortedChildren = [...serverInfo.children]
            .filter(child => !purchasedServers.has(child)) // Filter out purchased servers
            .sort((a, b) => {
                return networkMap.get(a).hackLevel - networkMap.get(b).hackLevel;
            });

        // Recursively display children
        for (const child of sortedChildren) {
            displayServer(child, depth + 1);
        }
    }

    displayServer('home');
}

/**
 * Displays only hackable servers in the network
 * @param {NS} ns - Netscript API
 * @param {Map} networkMap - Network structure map
 */
function displayHackableNetwork(ns, networkMap) {
    const purchasedServers = new Set(ns.getPurchasedServers());
    const playerHackLevel = ns.getHackingLevel();

    function displayServer(server, depth = 0) {
        const serverInfo = networkMap.get(server);
        const indent = '-'.repeat(depth);
        const prefix = depth === 0 ? '' : indent + ' ';
        
        // Only display if:
        // 1. Not a purchased server
        // 2. Server's hack level is <= player's hack level
        // 3. Not the home server
        if (!purchasedServers.has(server) && 
            serverInfo.hackLevel <= playerHackLevel && 
            server !== 'home') {
            ns.tprintf('%s%s (%d)', prefix, server, serverInfo.hackLevel);
        }

        // Sort and filter children
        const sortedChildren = [...serverInfo.children]
            .filter(child => 
                !purchasedServers.has(child) && 
                networkMap.get(child).hackLevel <= playerHackLevel
            )
            .sort((a, b) => networkMap.get(a).hackLevel - networkMap.get(b).hackLevel);

        // Recursively display children
        for (const child of sortedChildren) {
            displayServer(child, depth + 1);
        }
    }

    ns.tprintf('Servers hackable at level %d:', playerHackLevel);
    displayServer('home');
}

/**
 * Finds the path from home to target server
 * @param {Map} networkMap - Network structure map
 * @param {string} target - Target server
 * @param {NS} ns - Netscript API
 * @returns {string[]|null} - Array of servers in path or null if not found
 */
function findPathToServer(networkMap, target, ns) {
    if (!networkMap.has(target)) {
        return null;
    }

    // Get list of purchased servers
    const purchasedServers = new Set(ns.getPurchasedServers());

    const path = [];
    let current = target;

    // Build path from target back to home
    while (current !== null) {
        // Only add servers that aren't player-owned
        if (!purchasedServers.has(current)) {
            path.unshift(current);
        }
        current = networkMap.get(current).parent;
    }

    return path;
}