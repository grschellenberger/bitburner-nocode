// Global constants - ONLY DECLARE THESE ONCE AT THE TOP
const OPPONENTS = [
    "Netburners",
    "Slum Snakes",
    "The Black Hand",
    "Tetrads",
    "Daedalus",
    "Illuminati"
];
const BOARD_SIZES = [5, 7, 9, 13];  // Available board sizes
const STRATEGY = "aggressive";
const LOG_FILE = "ipvgo_results.txt";
const LEARNING_FILE = "ipvgo_learning.txt";
const MOVE_PATTERNS = {
    CORNER_CONTROL: 'corner',
    EDGE_EXPANSION: 'edge',
    CENTER_INFLUENCE: 'center',
    TERRITORY_DEFENSE: 'defense',
    AGGRESSIVE_EXPANSION: 'aggressive'
};
// Add pattern weights that will be adjusted based on success
let patternWeights = {
    [MOVE_PATTERNS.CORNER_CONTROL]: 1.0,
    [MOVE_PATTERNS.EDGE_EXPANSION]: 1.0,
    [MOVE_PATTERNS.CENTER_INFLUENCE]: 1.0,
    [MOVE_PATTERNS.TERRITORY_DEFENSE]: 1.0,
    [MOVE_PATTERNS.AGGRESSIVE_EXPANSION]: 1.0
};

// Additional learning constants
const TERRITORY_WEIGHT = 0.6;  // Weight for territory control vs captures
const PATTERN_MEMORY_SIZE = 100;  // Number of games to remember per opponent
const LEARNING_RATE = 0.1;
const EXPLORATION_RATE = 0.1;  // Chance to try new strategies

// Enhanced pattern recognition
const PATTERNS = {
    ...MOVE_PATTERNS,  // Keep existing patterns
    TERRITORY_EXPANSION: 'territory',
    INVASION: 'invasion',
    CONNECTION: 'connection',
    INFLUENCE_BUILDING: 'influence',
    TERRITORY_REDUCTION: 'reduction'
};

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog('sleep');
    ns.disableLog('go.opponentNextTurn');
    ns.disableLog('go.makeMove');
    ns.disableLog('go.passTurn');
    
    const opponentStats = await loadLearningData(ns);
    const moveHistory = [];
    
    while (true) {
        try {
            const opponent = OPPONENTS[Math.floor(Math.random() * OPPONENTS.length)];
            if (!opponentStats[opponent]) {
                opponentStats[opponent] = {
                    wins: 0,
                    losses: 0,
                    preferredPatterns: {}
                };
            }

            // Randomly select board size
            const boardSize = BOARD_SIZES[Math.floor(Math.random() * BOARD_SIZES.length)];
            
            // Validate board size
            if (!BOARD_SIZES.includes(boardSize)) {
                throw new Error(`Invalid board size: ${boardSize}`);
            }
            
            ns.print(`Starting new game against ${opponent} on ${boardSize}x${boardSize} board`);
            
            // Reset the board and start new game
            await ns.go.resetBoardState(opponent, boardSize);
            
            // Add board state validation
            const board = ns.go.getBoardState();
            if (!board || board.length !== boardSize) {
                throw new Error('Invalid board state after reset');
            }
            
            const startTime = new Date().toISOString();
            let moveCount = 0;
            
            // Individual game loop
            while (true) {
                try {
                    // Get current board state and validate
                    const board = ns.go.getBoardState();
                    if (!board || !Array.isArray(board) || board.length === 0) {
                        throw new Error('Invalid board state');
                    }
                    
                    const validMoves = ns.go.analysis.getValidMoves();
                    if (!validMoves || !Array.isArray(validMoves)) {
                        throw new Error('Invalid valid moves state');
                    }
                    
                    const liberties = ns.go.analysis.getLiberties();
                    if (!liberties || !Array.isArray(liberties)) {
                        throw new Error('Invalid liberties state');
                    }
                    
                    // Get next move based on strategy
                    const move = await getNextMove(ns, board, validMoves, liberties);
                    
                    if (!move) {
                        ns.print("No safe moves available - passing turn");
                        const result = await ns.go.passTurn();
                        if (result.type === "gameOver") break;
                        continue;
                    }

                    // Execute move and log with move type
                    const result = await ns.go.makeMove(move.x, move.y);
                    moveCount++;
                    
                    // Calculate current scores
                    const networkCount = countNetworks(board);
                    const territoryCount = countTerritory(ns, board);
                    
                    // Enhanced logging with move type
                    ns.print(`[${opponent} ${boardSize}x${boardSize}] Move #${moveCount} @ ${move.x},${move.y} | Type: ${move.type} | Networks: ${networkCount} | Territory: ${territoryCount}`);

                    if (result.type === "gameOver") break;

                    // Wait for opponent's move
                    await ns.go.opponentNextTurn();
                    await ns.sleep(50);

                    if (move) {
                        const pattern = classifyMove(move.x, move.y, board);
                        moveHistory.push({ ...move, pattern });
                    }

                } catch (err) {
                    ns.print(`ERROR in game loop: ${err.message}`);
                    await ns.sleep(100);
                    continue;
                }
            }

            // Log game results and get the result object
            const finalBoard = ns.go.getBoardState();
            const result = await logGameResults(ns, startTime, finalBoard, opponent, boardSize);
            
            // Update statistics with the captured result
            opponentStats[opponent][result.isWin ? 'wins' : 'losses']++;
            updateWeights(result, moveHistory, opponentStats);
            await saveLearningData(ns, opponentStats);
            
            // Analyze opponent patterns
            analyzeOpponentPatterns(opponentStats[opponent], moveHistory);
            
            ns.print(`Game complete. Starting new game in 5 seconds...`);
            await ns.sleep(100);

        } catch (err) {
            ns.print(`ERROR in main loop: ${err.message}`);
            await ns.sleep(100);
        }
    }
}

// Board Analysis Functions
function countNetworks(board) {
    return board.flat().filter(cell => cell === 'X').length;
}

function countTerritory(ns, board) {
    const controlled = ns.go.analysis.getControlledEmptyNodes();
    return controlled.flat().filter(cell => cell === 'X').length;
}

function getAdjacentPoints(x, y, board) {
    const points = [];
    const directions = [{dx:-1,dy:0}, {dx:1,dy:0}, {dx:0,dy:-1}, {dx:0,dy:1}];
    
    for (const {dx, dy} of directions) {
        const newX = x + dx, newY = y + dy;
        if (newX >= 0 && newX < board.length && newY >= 0 && newY < board.length) {
            points.push({x: newX, y: newY});
        }
    }
    return points;
}

// Move Validation Functions
function isValidMove(move, board, validMoves) {
    return move && 
           typeof move.x === 'number' && 
           typeof move.y === 'number' &&
           move.x >= 0 && 
           move.x < board.length &&
           move.y >= 0 && 
           move.y < board.length &&
           validMoves[move.x][move.y];
}

function wouldFillTerritory(ns, board, x, y) {
    const controlled = ns.go.analysis.getControlledEmptyNodes();
    if (controlled[x][y] !== 'X') return false;
    
    const adjacent = getAdjacentPoints(x, y, board);
    const friendlyCount = adjacent.filter(p => board[p.x][p.y] === 'X').length;
    const emptyCount = adjacent.filter(p => board[p.x][p.y] === '.').length;
    
    return friendlyCount >= 2 && emptyCount <= 2;
}

function isProtectedSpace(ns, board, x, y) {
    if (board[x][y] !== '.') return false;
    
    const controlled = ns.go.analysis.getControlledEmptyNodes();
    if (controlled[x][y] !== 'X') return false;
    
    const adjacent = getAdjacentPoints(x, y, board);
    const friendlyCount = adjacent.filter(p => board[p.x][p.y] === 'X').length;
    const emptyCount = adjacent.filter(p => board[p.x][p.y] === '.').length;
    
    return friendlyCount >= 2 && emptyCount >= 2;
}

// Eye Formation Functions
function isEye(ns, board, x, y) {
    if (board[x][y] !== '.') return false;
    
    const adjacent = getAdjacentPoints(x, y, board);
    const diagonal = getDiagonalPoints(x, y, board);
    
    // For a perfect eye:
    // 1. All adjacent points must be friendly pieces
    const allAdjacentFriendly = adjacent.every(p => board[p.x][p.y] === 'X');
    
    // 2. At least 3 diagonal points should be friendly or edge for corner/side positions
    const friendlyDiagonals = diagonal.filter(p => board[p.x][p.y] === 'X').length;
    const isCorner = (x === 0 || x === board.length - 1) && (y === 0 || y === board.length - 1);
    const isSide = x === 0 || x === board.length - 1 || y === 0 || y === board.length - 1;
    
    const requiredDiagonals = isCorner ? 1 : (isSide ? 2 : 3);
    
    return allAdjacentFriendly && friendlyDiagonals >= requiredDiagonals;
}

function wouldFormEye(ns, board, x, y) {
    // Simulate placing a piece at (x,y)
    const tempBoard = board.map(row => [...row]);
    tempBoard[x][y] = 'X';
    
    // Check adjacent empty points for potential eyes
    const adjacent = getAdjacentPoints(x, y, board);
    for (const point of adjacent) {
        if (board[point.x][point.y] === '.' && isEye(ns, tempBoard, point.x, point.y)) {
            return true;
        }
    }
    
    return false;
}

function getDiagonalPoints(x, y, board) {
    const points = [];
    const directions = [
        {dx: -1, dy: -1}, {dx: -1, dy: 1},
        {dx: 1, dy: -1}, {dx: 1, dy: 1}
    ];
    
    for (const {dx, dy} of directions) {
        const newX = x + dx, newY = y + dy;
        if (newX >= 0 && newX < board.length && newY >= 0 && newY < board.length) {
            points.push({x: newX, y: newY});
        }
    }
    return points;
}

// Move Finding Functions
async function getNextMove(ns, board, validMoves, liberties) {
    if (!board || !validMoves || !liberties) {
        ns.print("Invalid game state - missing required data");
        return null;
    }

    try {
        // Define move types with their finder functions
        const moveTypes = [
            { type: "Impenetrable", finder: () => findImpenetrableMove(ns, board, validMoves, liberties) },
            { type: "Connection", finder: () => findConnectionMove(ns, board, validMoves) },
            { type: "Strangulation", finder: () => findStrangulationMove(ns, board, validMoves, liberties) },
            { type: "Cutoff", finder: () => findCutoffMove(ns, board, validMoves, liberties) },
            { type: "Capture", finder: () => findCaptureMove(ns, board, validMoves, liberties) },
            { type: "Defensive", finder: () => findDefensiveMove(ns, board, validMoves, liberties) },
            { type: "StrongConnection", finder: () => findStrongConnectionMove(ns, board, validMoves) },
            { type: "Corner", finder: () => findCornerMove(ns, board, validMoves) },
            { type: "SafeExpanding", finder: () => findSafeExpandingMove(ns, board, validMoves, liberties) },
            { type: "Random", finder: () => findRandomMove(ns, board, validMoves) }
        ];

        // Try each move finder in order
        for (const { type, finder } of moveTypes) {
            const move = await finder();
            if (move && isValidMove(move, board, validMoves) && !wouldFillTerritory(ns, board, move.x, move.y)) {
                // Add move type to the move object
                return { ...move, type };
            }
        }
        
        return null;
    } catch (err) {
        ns.print(`Error in getNextMove: ${err.message}`);
        return null;
    }
}

// Move Strategy Functions
function findDefensiveMove(ns, board, validMoves, liberties) {
    // First check for moves that both defend and form eyes
    for (let x = 0; x < board.length; x++) {
        for (let y = 0; y < board[x].length; y++) {
            if (board[x][y] === 'X' && liberties[x][y] === 1) {
                const adjacent = getAdjacentPoints(x, y, board);
                for (const point of adjacent) {
                    if (!validMoves[point.x][point.y]) continue;
                    
                    if (wouldFormEye(ns, board, point.x, point.y)) {
                        return point;
                    }
                }
            }
        }
    }
    
    // Fall back to regular defensive moves
    return findRegularDefensiveMove(ns, board, validMoves, liberties);
}

function findRegularDefensiveMove(ns, board, validMoves, liberties) {
    for (let x = 0; x < board.length; x++) {
        for (let y = 0; y < board[x].length; y++) {
            if (board[x][y] === 'X' && liberties[x][y] === 1) {
                const adjacent = getAdjacentPoints(x, y, board);
                for (const point of adjacent) {
                    if (!validMoves[point.x][point.y]) continue;
                    
                    const wouldCreateThreeLiberties = adjacent.filter(p => 
                        (p.x !== point.x || p.y !== point.y) && 
                        board[p.x][p.y] === '.'
                    ).length >= 3;
                    
                    if (wouldCreateThreeLiberties) return point;
                }
            }
        }
    }
    return null;
}

function findCaptureMove(ns, board, validMoves, liberties) {
    // First, look for direct captures (1 liberty)
    for (let x = 0; x < board.length; x++) {
        for (let y = 0; y < board[x].length; y++) {
            if (board[x][y] === 'O' && liberties[x][y] === 1) {
                const adjacent = getAdjacentPoints(x, y, board);
                for (const point of adjacent) {
                    if (validMoves[point.x][point.y]) {
                        return point;
                    }
                }
            }
        }
    }

    // Then, look for networks we can pressure (2 liberties)
    for (let x = 0; x < board.length; x++) {
        for (let y = 0; y < board[x].length; y++) {
            if (board[x][y] === 'O' && liberties[x][y] === 2) {
                const adjacent = getAdjacentPoints(x, y, board);
                for (const point of adjacent) {
                    if (validMoves[point.x][point.y] && !isProtectedSpace(ns, board, point.x, point.y)) {
                        // Check if this move would be safe
                        const ourLiberties = adjacent.filter(p => 
                            board[p.x][p.y] === '.' && 
                            p.x !== point.x && 
                            p.y !== point.y
                        ).length;
                        if (ourLiberties >= 2) return point;
                    }
                }
            }
        }
    }
    return null;
}

function findConnectionMove(ns, board, validMoves) {
    const chains = ns.go.analysis.getChains();
    
    for (let x = 0; x < board.length; x++) {
        for (let y = 0; y < board[x].length; y++) {
            if (!validMoves[x][y]) continue;
            
            const adjacent = getAdjacentPoints(x, y, board);
            const uniqueChains = new Set(
                adjacent
                    .filter(p => board[p.x][p.y] === 'X')
                    .map(p => chains[p.x][p.y])
            );
            
            if (uniqueChains.size >= 2 && !wouldFillTerritory(ns, board, x, y)) {
                return {x, y};
            }
        }
    }
    return null;
}

function findStrongConnectionMove(ns, board, validMoves) {
    // Look for moves that strongly connect our networks
    for (let x = 0; x < board.length; x++) {
        for (let y = 0; y < board[x].length; y++) {
            if (!validMoves[x][y]) continue;
            
            const adjacent = getAdjacentPoints(x, y, board);
            const friendlyCount = adjacent.filter(p => board[p.x][p.y] === 'X').length;
            const emptyCount = adjacent.filter(p => board[p.x][p.y] === '.').length;
            
            // Look for moves that:
            // 1. Connect to multiple friendly pieces
            // 2. Maintain good liberties
            // 3. Don't fill territory
            if (friendlyCount >= 2 && emptyCount >= 3 && !wouldFillTerritory(ns, board, x, y)) {
                return {x, y};
            }
        }
    }
    return null;
}

function findCutoffMove(ns, board, validMoves, liberties) {
    // Look for moves that cut off enemy networks
    const chains = ns.go.analysis.getChains();
    
    // First, identify significant enemy chains (size >= 3)
    const significantChains = new Set();
    for (let x = 0; x < board.length; x++) {
        for (let y = 0; y < board[x].length; y++) {
            if (board[x][y] === 'O') {
                const chainId = chains[x][y];
                // Count routers in this chain
                let chainSize = 0;
                for (let i = 0; i < board.length; i++) {
                    for (let j = 0; j < board.length; j++) {
                        if (chains[i][j] === chainId) chainSize++;
                    }
                }
                if (chainSize >= 3) {
                    significantChains.add(chainId);
                }
            }
        }
    }
    
    // Look for moves that cut off significant chains
    for (let x = 0; x < board.length; x++) {
        for (let y = 0; y < board[x].length; y++) {
            if (!validMoves[x][y]) continue;
            
            const adjacent = getAdjacentPoints(x, y, board);
            const adjacentEnemyChains = new Set(
                adjacent
                    .filter(p => board[p.x][p.y] === 'O')
                    .map(p => chains[p.x][p.y])
                    .filter(chainId => significantChains.has(chainId))
            );
            
            if (adjacentEnemyChains.size >= 2) {
                // Check if this move would be safe
                const emptyCount = adjacent.filter(p => board[p.x][p.y] === '.').length;
                if (emptyCount >= 2) return {x, y};
            }
        }
    }
    return null;
}

function findStrangulationMove(ns, board, validMoves, liberties) {
    // Look for enemy chains with exactly 2 liberties
    for (let x = 0; x < board.length; x++) {
        for (let y = 0; y < board[x].length; y++) {
            if (board[x][y] === 'O' && liberties[x][y] === 2) {
                const adjacent = getAdjacentPoints(x, y, board);
                for (const point of adjacent) {
                    if (!validMoves[point.x][point.y]) continue;
                    
                    // Check if taking this liberty won't endanger our own chains
                    if (!isProtectedSpace(ns, board, point.x, point.y)) {
                        const ourLiberties = adjacent.filter(p => 
                            board[p.x][p.y] === '.' && 
                            p.x !== point.x && 
                            p.y !== point.y
                        ).length;
                        if (ourLiberties >= 2) return point;
                    }
                }
            }
        }
    }
    return null;
}

function findCornerMove(ns, board, validMoves) {
    const corners = [
        {x: 0, y: 0},
        {x: board.length-1, y: 0},
        {x: 0, y: board.length-1},
        {x: board.length-1, y: board.length-1}
    ];
    
    for (const corner of corners) {
        if (validMoves[corner.x][corner.y] && 
            !wouldFillTerritory(ns, board, corner.x, corner.y)) {
            return corner;
        }
    }
    return null;
}

function findSafeExpandingMove(ns, board, validMoves, liberties) {
    // First look for moves that form eyes
    for (let x = 0; x < board.length; x++) {
        for (let y = 0; y < board[x].length; y++) {
            if (!validMoves[x][y] || isProtectedSpace(ns, board, x, y)) continue;
            
            if (wouldFormEye(ns, board, x, y)) {
                const adjacent = getAdjacentPoints(x, y, board);
                const emptyCount = adjacent.filter(p => board[p.x][p.y] === '.').length;
                if (emptyCount >= 2) {
                    return {x, y};
                }
            }
        }
    }
    
    // Fall back to regular expanding moves
    return findRegularExpandingMove(ns, board, validMoves, liberties);
}

function findRegularExpandingMove(ns, board, validMoves, liberties) {
    for (let x = 0; x < board.length; x++) {
        for (let y = 0; y < board[x].length; y++) {
            if (!validMoves[x][y] || isProtectedSpace(ns, board, x, y)) continue;
            
            const adjacent = getAdjacentPoints(x, y, board);
            const emptyCount = adjacent.filter(p => board[p.x][p.y] === '.').length;
            const enemyCount = adjacent.filter(p => board[p.x][p.y] === 'O').length;
            
            if (emptyCount >= 2 && enemyCount <= 1 && !wouldFillTerritory(ns, board, x, y)) {
                return {x, y};
            }
        }
    }
    return null;
}

function findRandomMove(ns, board, validMoves) {
    const moves = [];
    for (let x = 0; x < board.length; x++) {
        for (let y = 0; y < board[x].length; y++) {
            if (validMoves[x][y] && !wouldFillTerritory(ns, board, x, y)) {
                const adjacent = getAdjacentPoints(x, y, board);
                const emptyCount = adjacent.filter(p => board[p.x][p.y] === '.').length;
                if (emptyCount >= 2) {
                    moves.push({x, y});
                }
            }
        }
    }
    return moves.length > 0 ? moves[Math.floor(Math.random() * moves.length)] : null;
}

function findImpenetrableMove(ns, board, validMoves, liberties) {
    // First priority: Complete almost-formed eyes
    const eyeMove = findEyeCompletingMove(ns, board, validMoves);
    if (eyeMove) return eyeMove;
    
    // Second priority: Create new eye formations near existing eyes
    const multipleEyeMove = findMultipleEyeMove(ns, board, validMoves);
    if (multipleEyeMove) return multipleEyeMove;
    
    // Third priority: Create new single eye formations
    const newEyeMove = findNewEyeMove(ns, board, validMoves);
    if (newEyeMove) return newEyeMove;
    
    // Fourth priority: Create strong shapes that lead to eyes
    const strongShapeMove = findStrongShapeMove(ns, board, validMoves, liberties);
    if (strongShapeMove) return strongShapeMove;
    
    // Fifth priority: Strengthen existing territory
    const strengthenMove = findTerritoryStrengtheningMove(ns, board, validMoves, liberties);
    if (strengthenMove) return strengthenMove;
    
    return null;
}

function findMultipleEyeMove(ns, board, validMoves) {
    // First, identify existing eyes
    const existingEyes = [];
    for (let x = 0; x < board.length; x++) {
        for (let y = 0; y < board[x].length; y++) {
            if (isEye(ns, board, x, y)) {
                existingEyes.push({x, y});
            }
        }
    }
    
    // If we have existing eyes, try to create new ones nearby
    if (existingEyes.length > 0) {
        for (let x = 0; x < board.length; x++) {
            for (let y = 0; y < board[x].length; y++) {
                if (!validMoves[x][y]) continue;
                if (wouldFillTerritory(ns, board, x, y)) continue;
                
                // Check if this position is near an existing eye
                const distanceToEye = existingEyes.some(eye => 
                    Math.abs(eye.x - x) + Math.abs(eye.y - y) <= 3
                );
                
                if (distanceToEye) {
                    const adjacent = getAdjacentPoints(x, y, board);
                    const diagonal = getDiagonalPoints(x, y, board);
                    
                    // Look for positions that could form a new eye
                    const friendlyAdjacent = adjacent.filter(p => board[p.x][p.y] === 'X').length;
                    const emptyAdjacent = adjacent.filter(p => board[p.x][p.y] === '.').length;
                    const friendlyDiagonal = diagonal.filter(p => board[p.x][p.y] === 'X').length;
                    
                    // Check if this move could lead to a new eye
                    if (friendlyAdjacent >= 2 && 
                        emptyAdjacent >= 2 && 
                        friendlyDiagonal >= 2 && 
                        couldFormEye(ns, board, x, y)) {
                        
                        // Verify the formation would be strong
                        if (!isVulnerableEyeFormation(ns, board, x, y)) {
                            return {x, y};
                        }
                    }
                }
            }
        }
    }
    
    // If no existing eyes, look for positions where we could form two eyes
    for (let x = 0; x < board.length; x++) {
        for (let y = 0; y < board[x].length; y++) {
            if (!validMoves[x][y]) continue;
            if (wouldFillTerritory(ns, board, x, y)) continue;
            
            // Simulate placing a stone here
            const tempBoard = board.map(row => [...row]);
            tempBoard[x][y] = 'X';
            
            // Count potential eye spaces after this move
            const adjacent = getAdjacentPoints(x, y, board);
            const potentialEyes = adjacent.filter(p => 
                board[p.x][p.y] === '.' && 
                couldFormEye(ns, tempBoard, p.x, p.y)
            ).length;
            
            // If this move could lead to multiple eyes
            if (potentialEyes >= 2) {
                // Verify the formation would be strong
                if (!isVulnerableEyeFormation(ns, board, x, y)) {
                    return {x, y};
                }
            }
        }
    }
    
    return null;
}

function findStrongShapeMove(ns, board, validMoves, liberties) {
    for (let x = 0; x < board.length; x++) {
        for (let y = 0; y < board[x].length; y++) {
            if (!validMoves[x][y]) continue;
            
            // Skip if this would fill our territory
            if (wouldFillTerritory(ns, board, x, y)) continue;
            
            const adjacent = getAdjacentPoints(x, y, board);
            const diagonal = getDiagonalPoints(x, y, board);
            
            // Look for tiger's mouth formation
            const friendlyAdjacent = adjacent.filter(p => board[p.x][p.y] === 'X').length;
            const emptyAdjacent = adjacent.filter(p => board[p.x][p.y] === '.').length;
            const friendlyDiagonal = diagonal.filter(p => board[p.x][p.y] === 'X').length;
            
            if (friendlyAdjacent >= 2 && emptyAdjacent >= 2 && friendlyDiagonal >= 2) {
                // Check if this creates a strong shape
                if (wouldCreateStrongShape(ns, board, x, y)) {
                    return {x, y};
                }
            }
        }
    }
    return null;
}

function findEyeCompletingMove(ns, board, validMoves) {
    for (let x = 0; x < board.length; x++) {
        for (let y = 0; y < board[x].length; y++) {
            if (!validMoves[x][y]) continue;
            
            const adjacent = getAdjacentPoints(x, y, board);
            const diagonal = getDiagonalPoints(x, y, board);
            
            // Count friendly pieces around the point
            const friendlyAdjacent = adjacent.filter(p => board[p.x][p.y] === 'X').length;
            const friendlyDiagonal = diagonal.filter(p => board[p.x][p.y] === 'X').length;
            
            // Check if this move would complete an eye
            if (friendlyAdjacent >= 3 && friendlyDiagonal >= 2) {
                // Verify it won't be an easily capturable eye
                if (!isVulnerableEyeFormation(ns, board, x, y)) {
                    return {x, y};
                }
            }
        }
    }
    return null;
}

function findNewEyeMove(ns, board, validMoves) {
    for (let x = 0; x < board.length; x++) {
        for (let y = 0; y < board[x].length; y++) {
            if (!validMoves[x][y]) continue;
            
            // Skip if this would fill our territory
            if (wouldFillTerritory(ns, board, x, y)) continue;
            
            const adjacent = getAdjacentPoints(x, y, board);
            const diagonal = getDiagonalPoints(x, y, board);
            
            // Look for positions that could start a new eye formation
            const friendlyAdjacent = adjacent.filter(p => board[p.x][p.y] === 'X').length;
            const emptyAdjacent = adjacent.filter(p => board[p.x][p.y] === '.').length;
            const friendlyDiagonal = diagonal.filter(p => board[p.x][p.y] === 'X').length;
            
            // Good position for starting an eye formation
            if (friendlyAdjacent >= 2 && emptyAdjacent >= 2 && friendlyDiagonal >= 2) {
                // Check if the empty spaces could form eyes
                const potentialEyes = adjacent.filter(p => 
                    board[p.x][p.y] === '.' && 
                    couldFormEye(ns, board, p.x, p.y)
                ).length;
                
                if (potentialEyes >= 1) {
                    return {x, y};
                }
            }
        }
    }
    return null;
}

function findTerritoryStrengtheningMove(ns, board, validMoves, liberties) {
    for (let x = 0; x < board.length; x++) {
        for (let y = 0; y < board[x].length; y++) {
            if (!validMoves[x][y]) continue;
            
            const adjacent = getAdjacentPoints(x, y, board);
            const diagonal = getDiagonalPoints(x, y, board);
            
            // Count different types of points
            const friendlyAdjacent = adjacent.filter(p => board[p.x][p.y] === 'X').length;
            const emptyAdjacent = adjacent.filter(p => board[p.x][p.y] === '.').length;
            const friendlyDiagonal = diagonal.filter(p => board[p.x][p.y] === 'X').length;
            
            // Look for moves that strengthen our position without filling territory
            if (friendlyAdjacent >= 2 && emptyAdjacent >= 2 && !wouldFillTerritory(ns, board, x, y)) {
                // Check if this move creates a strong formation
                const controlled = ns.go.analysis.getControlledEmptyNodes();
                const strengthensTerritory = adjacent.some(p => 
                    board[p.x][p.y] === '.' && 
                    controlled[p.x][p.y] === 'X'
                );
                
                if (strengthensTerritory && wouldCreateStrongShape(ns, board, x, y)) {
                    return {x, y};
                }
            }
        }
    }
    return null;
}

function isVulnerableEyeFormation(ns, board, x, y) {
    const adjacent = getAdjacentPoints(x, y, board);
    const diagonal = getDiagonalPoints(x, y, board);
    const liberties = ns.go.analysis.getLiberties();
    
    // Check for enemy pieces that could threaten the eye
    const enemyAdjacent = adjacent.filter(p => board[p.x][p.y] === 'O').length;
    const enemyDiagonal = diagonal.filter(p => board[p.x][p.y] === 'O').length;
    
    // Vulnerable if there are too many enemy pieces nearby
    if (enemyAdjacent > 0 || enemyDiagonal > 2) return true;
    
    // Check liberties of surrounding friendly pieces
    const friendlyPieces = adjacent.filter(p => board[p.x][p.y] === 'X');
    for (const piece of friendlyPieces) {
        if (liberties[piece.x][piece.y] < 2) return true;
    }
    
    // Check if the eye could be easily split
    const emptyAdjacent = adjacent.filter(p => board[p.x][p.y] === '.').length;
    if (emptyAdjacent > 1) {
        const controlled = ns.go.analysis.getControlledEmptyNodes();
        const uncontrolledEmpty = adjacent.filter(p => 
            board[p.x][p.y] === '.' && 
            controlled[p.x][p.y] !== 'X'
        ).length;
        if (uncontrolledEmpty > 0) return true;
    }
    
    return false;
}

function couldFormEye(ns, board, x, y) {
    // Simulate placing friendly pieces around this point
    const adjacent = getAdjacentPoints(x, y, board);
    const diagonal = getDiagonalPoints(x, y, board);
    
    // Count existing friendly pieces
    const friendlyAdjacent = adjacent.filter(p => board[p.x][p.y] === 'X').length;
    const friendlyDiagonal = diagonal.filter(p => board[p.x][p.y] === 'X').length;
    
    // Count empty spaces that could become friendly pieces
    const emptyAdjacent = adjacent.filter(p => board[p.x][p.y] === '.').length;
    const emptyDiagonal = diagonal.filter(p => board[p.x][p.y] === '.').length;
    
    // Count enemy pieces that could interfere
    const enemyAdjacent = adjacent.filter(p => board[p.x][p.y] === 'O').length;
    const enemyDiagonal = diagonal.filter(p => board[p.x][p.y] === 'O').length;
    
    // Check if position is on edge or corner
    const isCorner = (x === 0 || x === board.length - 1) && (y === 0 || y === board.length - 1);
    const isEdge = x === 0 || x === board.length - 1 || y === 0 || y === board.length - 1;
    
    // Adjust required counts based on position
    const requiredAdjacent = isCorner ? 2 : (isEdge ? 3 : 4);
    const requiredDiagonal = isCorner ? 1 : (isEdge ? 2 : 3);
    
    // Could form an eye if:
    // 1. We can complete the necessary structure
    // 2. Enemy pieces don't interfere too much
    // 3. Position is strong enough for the board location
    return (friendlyAdjacent + emptyAdjacent >= requiredAdjacent) && 
           (friendlyDiagonal + emptyDiagonal >= requiredDiagonal) &&
           (enemyAdjacent === 0) &&
           (enemyDiagonal <= 1);
}

function wouldCreateStrongShape(ns, board, x, y) {
    const adjacent = getAdjacentPoints(x, y, board);
    const diagonal = getDiagonalPoints(x, y, board);
    
    // Simulate placing a piece at (x,y)
    const tempBoard = board.map(row => [...row]);
    tempBoard[x][y] = 'X';
    
    // Check for various strong shapes:
    
    // 1. Bamboo joint (two stones connected with space between)
    const hasBambooJoint = adjacent.some((p1, i) => 
        board[p1.x][p1.y] === 'X' && 
        adjacent.some((p2, j) => 
            i !== j && 
            board[p2.x][p2.y] === 'X' && 
            Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y) === 2
        )
    );
    
    // 2. Tiger's mouth (three stones forming an L shape)
    const hasTigersMouth = adjacent.filter(p => board[p.x][p.y] === 'X').length >= 2 &&
                          diagonal.some(p => board[p.x][p.y] === 'X');
    
    // 3. Table shape (square formation with one empty point)
    const hasTableShape = adjacent.filter(p => board[p.x][p.y] === 'X').length >= 2 &&
                         diagonal.filter(p => board[p.x][p.y] === 'X').length >= 1;
    
    // 4. Wall formation (connected line of stones)
    const hasWallFormation = adjacent.filter((p1, i) => 
        board[p1.x][p1.y] === 'X' && 
        adjacent.some((p2, j) => 
            i !== j && 
            board[p2.x][p2.y] === 'X' && 
            ((p1.x === p2.x) || (p1.y === p2.y))
        )
    ).length >= 2;
    
    return hasBambooJoint || hasTigersMouth || hasTableShape || hasWallFormation;
}

// Logging Functions
async function logGameResults(ns, startTime, finalBoard, opponent, boardSize) {
    const endTime = new Date().toISOString();
    const territory = countTerritory(ns, finalBoard);
    const networks = countNetworks(finalBoard);
    const totalScore = territory + networks;
    
    const result = {
        startTime,
        endTime,
        opponent,
        boardSize,
        territory,
        networks,
        totalScore,
        isWin: totalScore > 0,
        duration: (new Date(endTime) - new Date(startTime)) / 1000
    };
    
    await ns.write(LOG_FILE, JSON.stringify(result) + '\n', 'a');
    
    ns.print('Game Summary:');
    ns.print(`Opponent: ${opponent}`);
    ns.print(`Board Size: ${boardSize}x${boardSize}`);
    ns.print(`Territory: ${territory}`);
    ns.print(`Networks: ${networks}`);
    ns.print(`Total Score: ${totalScore}`);
    ns.print(`Result: ${result.isWin ? 'WIN' : 'LOSS'}`);
    ns.print(`Duration: ${result.duration}s`);
    return result;
}

async function loadLearningData(ns) {
    try {
        const data = await ns.read(LEARNING_FILE);
        if (data) {
            const learningData = JSON.parse(data);
            patternWeights = learningData.weights;
            return learningData.opponentStats || {};
        }
    } catch (err) {
        ns.print(`No existing learning data found`);
    }
    return {};
}

async function saveLearningData(ns, opponentStats) {
    const learningData = {
        weights: patternWeights,
        opponentStats: opponentStats
    };
    await ns.write(LEARNING_FILE, JSON.stringify(learningData), 'w');
}

function classifyMove(x, y, board) {
    const size = board.length;
    const isCorner = (x <= 1 || x >= size-2) && (y <= 1 || y >= size-2);
    const isEdge = x === 0 || x === size-1 || y === 0 || y === size-1;
    const isCenter = x > size/3 && x < (2*size)/3 && y > size/3 && y < (2*size)/3;
    
    if (isCorner) return MOVE_PATTERNS.CORNER_CONTROL;
    if (isEdge) return MOVE_PATTERNS.EDGE_EXPANSION;
    if (isCenter) return MOVE_PATTERNS.CENTER_INFLUENCE;
    return MOVE_PATTERNS.TERRITORY_DEFENSE;
}

function evaluateMove(ns, x, y, board, pattern, opponent, opponentStats) {
    let score = patternWeights[pattern];
    
    // Base pattern success rate
    if (opponentStats.patterns && opponentStats.patterns[pattern]) {
        const patternStats = opponentStats.patterns[pattern];
        score *= (patternStats.success / patternStats.count) || 1;
    }
    
    // Territory potential
    const territoryScore = evaluateTerritoryPotential(ns, x, y, board);
    score += territoryScore * TERRITORY_WEIGHT;
    
    // Influence score
    const influenceScore = calculateInfluenceScore(x, y, board);
    score += influenceScore * (1 - TERRITORY_WEIGHT);
    
    // Add exploration bonus for less-used patterns
    if (Math.random() < EXPLORATION_RATE) {
        score *= 1.2;
    }
    
    return score;
}

function evaluateTerritoryPotential(ns, x, y, board) {
    const controlled = ns.go.analysis.getControlledEmptyNodes();
    const adjacent = getAdjacentPoints(x, y, board);
    const diagonal = getDiagonalPoints(x, y, board);
    
    let score = 0;
    
    // Check for territory expansion potential
    score += adjacent.filter(p => controlled[p.x][p.y] === 'X').length * 2;
    score += diagonal.filter(p => controlled[p.x][p.y] === 'X').length;
    
    // Check for eye formation potential
    if (wouldFormEye(ns, board, x, y)) {
        score += 5;
    }
    
    return score;
}

function calculateInfluenceScore(x, y, board) {
    const size = board.length;
    let score = 0;
    
    // Center control bonus
    const centerDistance = Math.abs(x - size/2) + Math.abs(y - size/2);
    score += (size - centerDistance) / size;
    
    // Connection potential
    const adjacent = getAdjacentPoints(x, y, board);
    score += adjacent.filter(p => board[p.x][p.y] === 'X').length * 1.5;
    
    return score;
}

function updateWeights(result, moveHistory, opponentStats) {
    const winMultiplier = result.isWin ? 1 : -1;
    const territoryEfficiency = result.territory / result.maxTerritory;
    
    moveHistory.forEach((move, index) => {
        const pattern = move.pattern;
        const territoryImpact = move.territoryAfter - move.territoryBefore;
        
        // Update based on game result
        patternWeights[pattern] += LEARNING_RATE * winMultiplier;
        
        // Update based on territory gain
        patternWeights[pattern] += LEARNING_RATE * (territoryImpact / 10);
        
        // Update based on overall territory efficiency
        patternWeights[pattern] += LEARNING_RATE * (territoryEfficiency - 0.5);
        
        // Normalize weights
        patternWeights[pattern] = Math.max(0.1, Math.min(2.0, patternWeights[pattern]));
    });
}

function analyzeOpponentPatterns(opponentStats, moveHistory) {
    // Implementation of analyzeOpponentPatterns function
}