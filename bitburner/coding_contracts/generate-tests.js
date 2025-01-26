/** @param {NS} ns */
export async function main(ns) {
    // Get specific contract type from arguments
    const requestedType = ns.args[0];

    // Create contracts directory if it doesn't exist
    if (!ns.ls('home', '/coding_contracts').length) {
        ns.tprint('Creating coding_contracts directory...');
        await ns.write('/coding_contracts/README.txt', 'Test contracts for solver development', 'w');
    }

    // Contract types from the game's source
    const CONTRACT_TYPES = [
        "Find Largest Prime Factor",
        "Subarray with Maximum Sum",
        "Total Ways to Sum",
        "Total Ways to Sum II",
        "Spiralize Matrix",
        "Array Jumping Game",
        "Array Jumping Game II",
        "Merge Overlapping Intervals",
        "Generate IP Addresses",
        "Algorithmic Stock Trader I",
        "Algorithmic Stock Trader II",
        "Algorithmic Stock Trader III",
        "Algorithmic Stock Trader IV",
        "Minimum Path Sum in a Triangle",
        "Unique Paths in a Grid I",
        "Unique Paths in a Grid II",
        "Sanitize Parentheses in Expression",
        "Find All Valid Math Expressions",
        "HammingCodes: Integer to Encoded Binary",
        "HammingCodes: Encoded Binary to Integer",
        "Proper 2-Coloring of a Graph",
        "Compression I: RLE Compression",
        "Compression II: LZ Decompression",
        "Compression III: LZ Compression",
        "Encryption I: Caesar Cipher",
        "Encryption II: Vigenère Cipher"
    ];

    // If a specific type was requested, validate it
    if (requestedType) {
        const matchingType = CONTRACT_TYPES.find(type => 
            type.toLowerCase().includes(requestedType.toLowerCase())
        );
        
        if (!matchingType) {
            ns.tprint(`ERROR: No contract type found matching "${requestedType}"`);
            ns.tprint('Available types:');
            CONTRACT_TYPES.forEach(type => ns.tprint(`- ${type}`));
            return;
        }

        // Generate the requested type
        try {
            const filename = `test-${matchingType.toLowerCase().replace(/[^a-z0-9]/g, '-')}.cct`;
            const success = ns.codingcontract.createDummyContract(matchingType);
            if (success) {
                ns.tprint(`Created test contract: ${matchingType}`);
            } else {
                ns.tprint(`WARNING: Failed to create contract: ${matchingType}`);
            }
        } catch (error) {
            ns.tprint(`ERROR creating ${matchingType}: ${error}`);
        }
        return;
    }

    // Generate one of each type if no specific type requested
    let created = 0;
    for (const type of CONTRACT_TYPES) {
        try {
            const filename = `test-${type.toLowerCase().replace(/[^a-z0-9]/g, '-')}.cct`;
            const success = ns.codingcontract.createDummyContract(type);
            if (success) {
                created++;
                ns.tprint(`Created test contract: ${type}`);
            } else {
                ns.tprint(`WARNING: Failed to create contract: ${type}`);
            }
        } catch (error) {
            ns.tprint(`ERROR creating ${type}: ${error}`);
        }
    }

    // Summary (only show if generating all types)
    ns.tprint(`\nCreated ${created} test contracts out of ${CONTRACT_TYPES.length} types`);
    ns.tprint('Test contracts are ready for solver development');
} 