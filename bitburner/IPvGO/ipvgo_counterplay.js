// Opponent Analysis Constants
const OPPONENT_MEMORY = {
    PATTERN_SIZE: 3,          // Size of pattern to analyze (3x3 area)
    MAX_PATTERNS: 1000,       // Maximum patterns to store per opponent
    RECENT_GAMES: 20,         // Number of recent games to consider
    MOVE_SEQUENCE_LENGTH: 5   // Number of moves to look ahead/behind
};

// Pattern storage structure
const opponentPatterns = {
    movePatterns: {},         // Store common move patterns
    responseSuccess: {},      // Track success of our responses
    territoryPatterns: {},    // Track territory control patterns
    openingMoves: {},         // Track opening game patterns
    midGamePatterns: {},      // Track mid-game patterns
    endGamePatterns: {},      // Track end-game patterns
    counterMoves: {}          // Track successful counter moves
};

// Add at the top with other constants
const OPPONENTS = [
    "Netburners",
    "Slum Snakes",
    "The Black Hand",
    "Tetrads",
    "Daedalus",
    "Illuminati"
];
const BOARD_SIZES = [5, 7, 9, 13];

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog('sleep');
    ns.disableLog('go.opponentNextTurn');
    ns.disableLog('go.makeMove');
    ns.disableLog('go.passTurn');
    
    const opponentData = await loadOpponentData(ns);
    
    while (true) {
        try {
            const opponent = selectOpponent(ns);
            const boardSize = selectBoardSize(ns);
            let lastOpponentMove = null;
            const moveHistory = [];
            
            ns.print(`Starting new game against ${opponent} on ${boardSize}x${boardSize} board`);
            await ns.go.resetBoardState(opponent, boardSize);
            let board = ns.go.getBoardState();
            
            ns.print(`Current player: ${ns.go.getCurrentPlayer()}`);
            
            // Game loop
            while (true) {
                try {
                    board = ns.go.getBoardState();
                    if (!board || !Array.isArray(board)) {
                        throw new Error('Invalid board state');
                    }
                    
                    // Always make a move - we're black and go first
                    ns.print("Making our move");
                    const validMoves = getValidMoves(board);
                    let moveMade = false;
                    
                    // Try counter move if we have opponent's last move
                    if (lastOpponentMove) {
                        ns.print("Analyzing opponent's last move at: " + lastOpponentMove.x + "," + lastOpponentMove.y);
                        const analysis = analyzeOpponentMove(ns, board, lastOpponentMove, opponent);
                        
                        if (analysis) {
                            const counterMove = findBestResponse(ns, board, analysis, opponent);
                            if (counterMove && isValidMove(counterMove, board, validMoves)) {
                                ns.print(`Making counter move at: ${counterMove.x},${counterMove.y}`);
                                try {
                                    const result = await ns.go.makeMove(counterMove.x, counterMove.y);
                                    if (result === "gameOver") {
                                        ns.print("Game Over after counter move");
                                        break;
                                    }
                                    moveHistory.push({
                                        move: counterMove,
                                        pattern: analysis.pattern,
                                        success: true
                                    });
                                    moveMade = true;
                                } catch (err) {
                                    if (err.toString().includes("game is over")) {
                                        ns.print("Game is over, starting new game");
                                        break;
                                    }
                                    ns.print(`Counter move failed: ${err}`);
                                }
                            }
                        }
                    }
                    
                    // Try opening move if it's our first move
                    if (!moveMade && moveHistory.length === 0) {
                        const corners = [[0,0], [0,board.length-1], [board.length-1,0], [board.length-1,board.length-1]];
                        const center = Math.floor(board.length/2);
                        const possibleMoves = [...corners, [center,center]];
                        
                        // Shuffle possible moves
                        for (let i = possibleMoves.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [possibleMoves[i], possibleMoves[j]] = [possibleMoves[j], possibleMoves[i]];
                        }
                        
                        for (const [x, y] of possibleMoves) {
                            if (validMoves[x][y]) {
                                ns.print(`Making opening move at: ${x},${y}`);
                                try {
                                    const result = await ns.go.makeMove(x, y);
                                    if (result === "gameOver") break;
                                    moveHistory.push({
                                        move: {x, y},
                                        pattern: null,
                                        success: true
                                    });
                                    moveMade = true;
                                    break;
                                } catch (err) {
                                    if (err.toString().includes("game is over")) {
                                        ns.print("Game is over, starting new game");
                                        break;
                                    }
                                    ns.print(`Opening move failed: ${err}`);
                                }
                            }
                        }
                    }
                    
                    // Try defensive move
                    if (!moveMade) {
                        const defensiveMove = findDefensiveMove(ns, board, validMoves);
                        if (defensiveMove && isValidMove(defensiveMove, board, validMoves)) {
                            ns.print(`Making defensive move at: ${defensiveMove.x},${defensiveMove.y}`);
                            try {
                                const result = await ns.go.makeMove(defensiveMove.x, defensiveMove.y);
                                if (result === "gameOver") break;
                                moveHistory.push({
                                    move: defensiveMove,
                                    pattern: null,
                                    success: true
                                });
                                moveMade = true;
                            } catch (err) {
                                if (err.toString().includes("game is over")) {
                                    ns.print("Game is over, starting new game");
                                    break;
                                }
                                ns.print(`Defensive move failed: ${err}`);
                            }
                        }
                    }
                    
                    // Make strategic moves with ko rule checking
                    if (!moveMade) {
                        ns.print("Evaluating strategic moves");
                        const scoredMoves = [];
                        const previousBoard = getPreviousBoardState(moveHistory, board);
                        
                        for (let x = 0; x < board.length; x++) {
                            for (let y = 0; y < board.length; y++) {
                                if (validMoves[x][y] && isValidMove({x, y}, board, validMoves, previousBoard)) {
                                    const score = evaluateDefensiveScore(ns, board, x, y);
                                    if (score > 0) {
                                        scoredMoves.push({x, y, score});
                                    }
                                }
                            }
                        }
                        
                        scoredMoves.sort((a, b) => b.score - a.score);
                        
                        if (scoredMoves.length > 0 && scoredMoves[0].score >= 8) {
                            const bestMove = scoredMoves[0];
                            ns.print(`Making strategic move at: ${bestMove.x},${bestMove.y} (score: ${bestMove.score})`);
                            try {
                                const result = await ns.go.makeMove(bestMove.x, bestMove.y);
                                if (result === "gameOver") break;
                                moveHistory.push({
                                    move: bestMove,
                                    board: board.map(row => [...row]),  // Store board state
                                    pattern: null,
                                    success: true
                                });
                                moveMade = true;
                            } catch (err) {
                                if (err.toString().includes("game is over")) {
                                    ns.print("Game is over, starting new game");
                                    break;
                                }
                                ns.print(`Strategic move failed: ${err}`);
                            }
                        } else {
                            ns.print("No valuable moves found, passing turn");
                            try {
                                await ns.go.passTurn();
                            } catch (err) {
                                if (err.toString().includes("game is over")) {
                                    ns.print("Game is over, starting new game");
                                    break;
                                }
                                throw err;
                            }
                        }
                    }
                    
                    // Wait for opponent's move
                    ns.print("Waiting for opponent's move");
                    try {
                        const opponentResult = await ns.go.opponentNextTurn();
                        if (opponentResult === "gameOver") {
                            ns.print("Game Over after opponent's move");
                            break;
                        }
                    } catch (err) {
                        if (err.toString().includes("game is over")) {
                            ns.print("Game is over, starting new game");
                            break;
                        }
                        throw err;
                    }
                    
                    const newBoard = ns.go.getBoardState();
                    lastOpponentMove = findLastMove(board, newBoard);
                    if (lastOpponentMove) {
                        ns.print(`Opponent moved to: ${lastOpponentMove.x},${lastOpponentMove.y}`);
                    }
                    
                    await ns.sleep(50);
                } catch (err) {
                    if (err.toString().includes("game is over")) {
                        ns.print("Game is over, starting new game");
                        break;
                    }
                    ns.print(`ERROR in game loop: ${err}`);
                    break;
                }
            }
            
            // Post-game analysis
            const finalBoard = ns.go.getBoardState();
            const gameResult = analyzeGameResult(ns, finalBoard, opponent);
            updatePatternDatabase(opponent, moveHistory, gameResult);
            await saveOpponentData(ns, opponentData);
            
            ns.print(`Game completed. Result: ${gameResult.isWin ? 'Win' : 'Loss'}`);
            await ns.sleep(1000);
            
        } catch (err) {
            ns.print(`ERROR in main loop: ${err}`);
            await ns.sleep(1000);
        }
    }
}

function analyzeOpponentMove(ns, board, move, opponent) {
    const pattern = extractPattern(board, move.x, move.y, OPPONENT_MEMORY.PATTERN_SIZE);
    const gamePhase = determineGamePhase(board);
    const context = getMoveContext(board, move);
    
    return {
        pattern,
        gamePhase,
        context,
        predictedResponses: predictLikelyResponses(opponent, pattern, gamePhase)
    };
}

function extractPattern(board, x, y, size) {
    const pattern = [];
    const radius = Math.floor(size / 2);
    
    for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
            const nx = x + dx;
            const ny = y + dy;
            if (isValidPosition(nx, ny, board.length)) {
                pattern.push({
                    relativePos: {x: dx, y: dy},
                    value: board[nx][ny]
                });
            }
        }
    }
    return pattern;
}

function determineGamePhase(board) {
    const moveCount = countMoves(board);
    const totalSpaces = board.length * board.length;
    
    if (moveCount < totalSpaces * 0.2) return 'opening';
    if (moveCount < totalSpaces * 0.6) return 'midgame';
    return 'endgame';
}

function getMoveContext(board, move) {
    return {
        isCorner: isCornerMove(move, board.length),
        isEdge: isEdgeMove(move, board.length),
        nearbyStones: countNearbyStones(board, move),
        liberties: countLiberties(board, move),
        connectsGroups: checksConnectivity(board, move),
        threatensTerritory: checksTerritoryThreat(board, move)
    };
}

function predictLikelyResponses(opponent, pattern, gamePhase) {
    const patternKey = generatePatternKey(pattern);
    const opponentData = opponentPatterns.movePatterns[opponent];
    
    if (!opponentData || !opponentData.has(patternKey)) return [];
    
    const patternData = opponentData.get(patternKey);
    return patternData.responses
        .sort((a, b) => b.successRate - a.successRate)
        .slice(0, 3); // Top 3 most successful responses
}

function findBestResponse(ns, board, analysis, opponent) {
    const responses = analysis.predictedResponses;
    const validMoves = getValidMoves(board);
    
    // Filter responses by current valid moves
    const possibleMoves = responses.filter(response => 
        isValidMove(response.move, board, validMoves)
    );
    
    if (possibleMoves.length === 0) return null;
    
    // Score each possible move
    const scoredMoves = possibleMoves.map(move => ({
        move,
        score: evaluateResponseMove(ns, board, move, analysis)
    }));
    
    // Return the highest scoring move
    return scoredMoves.reduce((best, current) => 
        current.score > best.score ? current : best
    ).move;
}

function evaluateResponseMove(ns, board, move, analysis) {
    let score = move.successRate * 2;
    
    // Add territory control score
    score += evaluateTerritoryControl(ns, board, move) * 1.5;
    
    // Add shape strength score
    score += evaluateShapeStrength(board, move);
    
    // Add tactical advantage score
    score += evaluateTacticalAdvantage(ns, board, move);
    
    return score;
}

async function executeMove(ns, move) {
    return await ns.go.makeMove(move.x, move.y);
}

async function waitForOpponentMove(ns) {
    await ns.go.opponentNextTurn();
    const board = ns.go.getBoardState();
    return findLastOpponentMove(board);
}

function findLastOpponentMove(board) {
    // Implementation to find the opponent's last move by comparing board states
}

async function loadOpponentData(ns) {
    try {
        const data = await ns.read('opponent_patterns.txt');
        return data ? JSON.parse(data) : {};
    } catch (err) {
        return {};
    }
}

async function saveOpponentData(ns, data) {
    await ns.write('opponent_patterns.txt', JSON.stringify(data), 'w');
}

// Utility functions
function isValidPosition(x, y, size) {
    return x >= 0 && x < size && y >= 0 && y < size;
}

function isValidMove(move, board, validMoves, previousBoard = null) {
    // Basic position validation
    if (!move || 
        move.x < 0 || move.x >= board.length || 
        move.y < 0 || move.y >= board.length || 
        board[move.x][move.y] !== '.') {
        return false;
    }
    
    // Make a copy of the board to simulate the move
    const testBoard = board.map(row => [...row]);
    testBoard[move.x][move.y] = 'X';
    
    // Check for ko rule violation
    if (previousBoard && wouldRepeatBoardState(testBoard, previousBoard)) {
        return false;
    }
    
    // Check if the move would have liberties or capture enemy stones
    return hasLiberties(testBoard, move.x, move.y) || capturesEnemyStones(board, move);
}

function wouldRepeatBoardState(newBoard, previousBoard) {
    if (!previousBoard) return false;
    
    for (let x = 0; x < newBoard.length; x++) {
        for (let y = 0; y < newBoard.length; y++) {
            if (newBoard[x][y] !== previousBoard[x][y]) {
                return false;
            }
        }
    }
    return true;
}

function hasLiberties(board, x, y, visited = new Set()) {
    const key = `${x},${y}`;
    if (visited.has(key)) return false;
    visited.add(key);
    
    const neighbors = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1]
    ];
    
    for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < board.length && ny >= 0 && ny < board.length) {
            // If there's an empty space next to us, we have liberties
            if (board[nx][ny] === '.') {
                return true;
            }
            // If there's a friendly stone that has liberties, we're connected to it
            if (board[nx][ny] === 'X' && hasLiberties(board, nx, ny, visited)) {
                return true;
            }
        }
    }
    
    return false;
}

function capturesEnemyStones(board, move) {
    const neighbors = [[move.x-1,move.y], [move.x+1,move.y], [move.x,move.y-1], [move.x,move.y+1]];
    
    for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < board.length && ny >= 0 && ny < board.length) {
            if (board[nx][ny] === 'O' && !hasLiberties(board, nx, ny, new Set(), move)) {
                return true;
            }
        }
    }
    
    return false;
}

function generatePatternKey(pattern) {
    return pattern.map(p => 
        `${p.relativePos.x},${p.relativePos.y}:${p.value}`
    ).join('|');
}

function countMoves(board) {
    return board.flat().filter(cell => cell !== '.').length;
}

function evaluateTerritoryControl(ns, board, move) {
    const controlled = ns.go.analysis.getControlledEmptyNodes();
    // Implementation to evaluate territory control
    return 0; // Placeholder
}

function evaluateShapeStrength(board, move) {
    // Implementation to evaluate shape strength
    return 0; // Placeholder
}

function evaluateTacticalAdvantage(ns, board, move) {
    // Implementation to evaluate tactical advantage
    return 0; // Placeholder
}

function selectOpponent(ns) {
    // Select opponent based on learning data success rates
    const opponentStats = opponentPatterns.movePatterns;
    
    if (!Object.keys(opponentStats).length) {
        // If no data, randomly select
        return OPPONENTS[Math.floor(Math.random() * OPPONENTS.length)];
    }
    
    // Calculate win rates for each opponent
    const winRates = OPPONENTS.map(opponent => {
        const stats = opponentStats[opponent] || { wins: 0, total: 0 };
        return {
            opponent,
            winRate: stats.total ? (stats.wins / stats.total) : 0
        };
    });
    
    // Prioritize opponents with lower win rates (more room for learning)
    const sortedOpponents = winRates.sort((a, b) => a.winRate - b.winRate);
    
    // 80% chance to select from bottom half (harder opponents)
    const index = Math.random() < 0.8 ? 
        Math.floor(Math.random() * (sortedOpponents.length / 2)) :
        Math.floor(Math.random() * sortedOpponents.length);
    
    return sortedOpponents[index].opponent;
}

function selectBoardSize(ns) {
    // Start with larger boards by default
    const stats = opponentPatterns.movePatterns;
    const totalGames = Object.values(stats).reduce((sum, opponent) => 
        sum + (opponent.total || 0), 0);
    const totalWins = Object.values(stats).reduce((sum, opponent) => 
        sum + (opponent.wins || 0), 0);
    
    const winRate = totalGames ? (totalWins / totalGames) : 0;
    
    // Prefer larger boards
    if (winRate < 0.3) return BOARD_SIZES[2];  // 9x9
    if (winRate < 0.4) return BOARD_SIZES[2];  // 9x9
    if (winRate < 0.5) return BOARD_SIZES[3];  // 13x13
    
    // Randomly select from larger boards with preference for 13x13
    const index = Math.random() < 0.7 ? 3 : 2;  // 70% chance for 13x13, 30% for 9x9
    
    return BOARD_SIZES[index];
}

function findDefensiveMove(ns, board, validMoves) {
    // Score all valid moves based on defensive value
    const scoredMoves = [];
    
    for (let x = 0; x < board.length; x++) {
        for (let y = 0; y < board.length; y++) {
            if (!validMoves[x][y]) continue;
            
            const score = evaluateDefensiveScore(ns, board, x, y);
            if (score > 0) {
                scoredMoves.push({ x, y, score });
            }
        }
    }
    
    // Sort by score and return highest scoring move
    if (scoredMoves.length > 0) {
        scoredMoves.sort((a, b) => b.score - a.score);
        return scoredMoves[0];
    }
    return null;
}

function evaluateDefensiveScore(ns, board, x, y) {
    let score = 0;
    const neighbors = [
        [x-1, y], [x+1, y], [x, y-1], [x, y+1],
        [x-1, y-1], [x-1, y+1], [x+1, y-1], [x+1, y+1]
    ];
    
    // Count friendly and enemy stones nearby
    let friendlyCount = 0;
    let enemyCount = 0;
    let emptyCount = 0;
    
    for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < board.length && ny >= 0 && ny < board.length) {
            if (board[nx][ny] === 'X') friendlyCount++;
            else if (board[nx][ny] === 'O') enemyCount++;
            else emptyCount++;
        }
    }
    
    // Only consider moves that have strategic value
    let hasStrategicValue = false;
    
    // Check for eye formation/protection
    if (couldFormEye(board, x, y)) {
        score += 10;
        hasStrategicValue = true;
    }
    if (protectsExistingEye(board, x, y)) {
        score += 20;
        hasStrategicValue = true;
    }
    
    // Check for urgent defensive needs
    if (enemyCount >= 2) {
        score += 8;
        hasStrategicValue = true;
    }
    
    // Check for connecting groups
    if (connectsGroupsWithEyes(board, x, y)) {
        score += 12;
        hasStrategicValue = true;
    }
    
    // Check for territory expansion
    if (protectsTerritory(board, x, y)) {
        score += 5;
        hasStrategicValue = true;
    }
    
    // If no strategic value, return negative score to discourage the move
    if (!hasStrategicValue) {
        return -1;
    }
    
    return score;
}

function couldFormEye(board, x, y) {
    const neighbors = [[x-1,y], [x+1,y], [x,y-1], [x,y+1]];
    let friendlyCount = 0;
    let diagonalFriendlyCount = 0;
    
    // Check direct neighbors
    for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < board.length && ny >= 0 && ny < board.length) {
            if (board[nx][ny] === 'X') friendlyCount++;
        }
    }
    
    // Check diagonal neighbors
    const diagonals = [[x-1,y-1], [x-1,y+1], [x+1,y-1], [x+1,y+1]];
    for (const [nx, ny] of diagonals) {
        if (nx >= 0 && nx < board.length && ny >= 0 && ny < board.length) {
            if (board[nx][ny] === 'X') diagonalFriendlyCount++;
        }
    }
    
    // Strong eye potential if we have 3+ direct neighbors and some diagonal support
    return friendlyCount >= 2 && diagonalFriendlyCount >= 1;
}

function isPartialEye(board, x, y) {
    const neighbors = [[x-1,y], [x+1,y], [x,y-1], [x,y+1]];
    let friendlyCount = 0;
    let emptyCount = 0;
    
    for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < board.length && ny >= 0 && ny < board.length) {
            if (board[nx][ny] === 'X') friendlyCount++;
            else if (board[nx][ny] === '.') emptyCount++;
        }
    }
    
    // Partial eye if we have 2-3 friendly stones and room to complete
    return friendlyCount >= 2 && emptyCount > 0;
}

function protectsExistingEye(board, x, y) {
    const neighbors = [[x-1,y], [x+1,y], [x,y-1], [x,y+1]];
    
    for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < board.length && ny >= 0 && ny < board.length) {
            if (isEye(board, nx, ny)) return true;
        }
    }
    return false;
}

function isEye(board, x, y) {
    if (board[x][y] !== '.') return false;
    
    const neighbors = [[x-1,y], [x+1,y], [x,y-1], [x,y+1]];
    let friendlyCount = 0;
    
    for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < board.length && ny >= 0 && ny < board.length) {
            if (board[nx][ny] !== 'X') return false;
            friendlyCount++;
        }
    }
    
    return friendlyCount >= 3;
}

function connectsGroupsWithEyes(board, x, y) {
    const neighbors = [[x-1,y], [x+1,y], [x,y-1], [x,y+1]];
    let connectedGroups = new Set();
    
    for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < board.length && ny >= 0 && ny < board.length) {
            if (board[nx][ny] === 'X') {
                const groupId = findGroupId(board, nx, ny);
                if (hasEyeInGroup(board, groupId)) {
                    connectedGroups.add(groupId);
                }
            }
        }
    }
    
    return connectedGroups.size >= 2;
}

function hasEyeInGroup(board, groupId) {
    const positions = groupId.split('|').map(pos => {
        const [x, y] = pos.split(',').map(Number);
        return {x, y};
    });
    
    for (const pos of positions) {
        const neighbors = [[pos.x-1,pos.y], [pos.x+1,pos.y], [pos.x,pos.y-1], [pos.x,pos.y+1]];
        let isEye = true;
        
        for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < board.length && ny >= 0 && ny < board.length) {
                if (board[nx][ny] !== 'X') {
                    isEye = false;
                    break;
                }
            }
        }
        
        if (isEye) return true;
    }
    
    return false;
}

function analyzeGameResult(ns, board, opponent) {
    const territory = countTerritory(ns, board);
    const networks = countNetworks(board);
    const totalScore = territory + networks;
    
    return {
        isWin: totalScore > 0,
        territory,
        networks,
        totalScore,
        maxTerritory: board.length * board.length,
        efficiency: territory / (board.length * board.length)
    };
}

function updatePatternDatabase(opponent, moveHistory, gameResult) {
    if (!opponentPatterns.movePatterns[opponent]) {
        opponentPatterns.movePatterns[opponent] = new Map();
    }
    
    moveHistory.forEach(move => {
        if (!move.pattern) return;
        
        const patternKey = generatePatternKey(move.pattern);
        const existingData = opponentPatterns.movePatterns[opponent].get(patternKey) || {
            count: 0,
            wins: 0,
            totalTerritory: 0,
            responses: new Map()
        };
        
        existingData.count++;
        if (gameResult.isWin) existingData.wins++;
        existingData.totalTerritory += gameResult.territory;
        
        // Update response success rate
        if (move.response) {
            const responseKey = `${move.response.x},${move.response.y}`;
            const responseData = existingData.responses.get(responseKey) || {
                count: 0,
                success: 0
            };
            responseData.count++;
            if (move.success) responseData.success++;
            existingData.responses.set(responseKey, responseData);
        }
        
        opponentPatterns.movePatterns[opponent].set(patternKey, existingData);
    });
}

// Utility functions for getMoveContext
function isCornerMove(move, size) {
    return (move.x === 0 || move.x === size - 1) && 
           (move.y === 0 || move.y === size - 1);
}

function isEdgeMove(move, size) {
    return move.x === 0 || move.x === size - 1 || 
           move.y === 0 || move.y === size - 1;
}

function countNearbyStones(board, move) {
    const adjacent = getAdjacentPoints(move.x, move.y, board);
    return {
        friendly: adjacent.filter(p => board[p.x][p.y] === 'X').length,
        enemy: adjacent.filter(p => board[p.x][p.y] === 'O').length
    };
}

function countLiberties(board, move) {
    const adjacent = getAdjacentPoints(move.x, move.y, board);
    return adjacent.filter(p => board[p.x][p.y] === '.').length;
}

function checksConnectivity(board, move) {
    const adjacent = getAdjacentPoints(move.x, move.y, board);
    const friendlyStones = adjacent.filter(p => board[p.x][p.y] === 'X');
    
    // Check if move connects two or more friendly groups
    if (friendlyStones.length >= 2) {
        const groups = new Set(friendlyStones.map(stone => 
            findGroupId(board, stone.x, stone.y)
        ));
        return groups.size >= 2;
    }
    return false;
}

function checksTerritoryThreat(board, move) {
    const adjacent = getAdjacentPoints(move.x, move.y, board);
    const diagonal = getDiagonalPoints(move.x, move.y, board);
    
    // Check if move threatens to enclose territory
    const friendlyStones = [...adjacent, ...diagonal]
        .filter(p => board[p.x][p.y] === 'X');
    
    return friendlyStones.length >= 3 && 
           couldFormTerritory(board, move, friendlyStones);
}

// Helper functions
function getAdjacentPoints(x, y, board) {
    const points = [];
    const directions = [[0,1], [1,0], [0,-1], [-1,0]];
    
    for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        if (isValidPosition(nx, ny, board.length)) {
            points.push({x: nx, y: ny});
        }
    }
    return points;
}

function getDiagonalPoints(x, y, board) {
    const points = [];
    const directions = [[1,1], [1,-1], [-1,1], [-1,-1]];
    
    for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        if (isValidPosition(nx, ny, board.length)) {
            points.push({x: nx, y: ny});
        }
    }
    return points;
}

function findGroupId(board, x, y, visited = new Set()) {
    const key = `${x},${y}`;
    if (visited.has(key)) return '';
    visited.add(key);
    
    let groupId = key;
    const stone = board[x][y];
    const neighbors = [[x-1,y], [x+1,y], [x,y-1], [x,y+1]];
    
    for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < board.length && ny >= 0 && ny < board.length) {
            if (board[nx][ny] === stone) {
                const subGroup = findGroupId(board, nx, ny, visited);
                if (subGroup) {
                    groupId += '|' + subGroup;
                }
            }
        }
    }
    
    return groupId;
}

function couldFormTerritory(board, move, friendlyStones) {
    // Check if stones could potentially enclose an area
    const emptySpaces = getAdjacentPoints(move.x, move.y, board)
        .filter(p => board[p.x][p.y] === '.');
        
    return emptySpaces.some(space => 
        isEnclosable(board, space.x, space.y, new Set())
    );
}

function isEnclosable(board, x, y, visited) {
    const key = `${x},${y}`;
    if (visited.has(key)) return true;
    visited.add(key);
    
    const adjacent = getAdjacentPoints(x, y, board);
    
    // If we find an edge or enemy stone, space cannot be enclosed
    if (adjacent.some(p => 
        !isValidPosition(p.x, p.y, board.length) || 
        board[p.x][p.y] === 'O'
    )) return false;
    
    // Check all empty adjacent points
    return adjacent
        .filter(p => board[p.x][p.y] === '.')
        .every(p => isEnclosable(board, p.x, p.y, visited));
}

// Add these remaining utility functions

function countTerritory(ns, board) {
    const controlled = ns.go.analysis.getControlledEmptyNodes();
    let territory = 0;
    
    for (let x = 0; x < board.length; x++) {
        for (let y = 0; y < board.length; y++) {
            if (controlled[x][y] === 'X') territory++;
            else if (controlled[x][y] === 'O') territory--;
        }
    }
    
    return territory;
}

function countNetworks(board) {
    let networks = 0;
    const visited = new Set();
    
    // Find all friendly groups
    for (let x = 0; x < board.length; x++) {
        for (let y = 0; y < board.length; y++) {
            if (board[x][y] === 'X' && !visited.has(`${x},${y}`)) {
                const groupSize = findConnectedGroup(board, x, y, visited);
                if (groupSize >= 3) networks++; // Consider groups of 3+ stones as networks
            }
        }
    }
    
    return networks;
}

function findConnectedGroup(board, x, y, visited) {
    const key = `${x},${y}`;
    if (visited.has(key)) return 0;
    visited.add(key);
    
    let size = 1;
    const adjacent = getAdjacentPoints(x, y, board);
    
    for (const point of adjacent) {
        if (board[point.x][point.y] === 'X') {
            size += findConnectedGroup(board, point.x, point.y, visited);
        }
    }
    
    return size;
}

function findLastMove(oldBoard, newBoard) {
    if (!oldBoard || !newBoard) return null;
    
    for (let x = 0; x < oldBoard.length; x++) {
        for (let y = 0; y < oldBoard.length; y++) {
            if (oldBoard[x][y] !== newBoard[x][y] && newBoard[x][y] === 'O') {
                return { x, y };
            }
        }
    }
    return null;
}

// Add this new function to determine valid moves
function getValidMoves(board) {
    const validMoves = Array(board.length).fill().map(() => 
        Array(board.length).fill(false)
    );
    
    // Only mark moves as valid if they won't result in self-capture
    for (let x = 0; x < board.length; x++) {
        for (let y = 0; y < board.length; y++) {
            if (board[x][y] === '.' && 
                isValidMove({x, y}, board, validMoves)) {
                validMoves[x][y] = true;
            }
        }
    }
    
    return validMoves;
}

function protectsTerritory(board, x, y) {
    // Check if this move helps protect or expand our territory
    const directions = [
        [1, 0], [-1, 0], [0, 1], [0, -1],
        [1, 1], [1, -1], [-1, 1], [-1, -1]
    ];
    
    let territoryValue = 0;
    
    // Check each direction for territory potential
    for (const [dx, dy] of directions) {
        let nx = x + dx;
        let ny = y + dy;
        let friendlyCount = 0;
        let emptyCount = 0;
        let maxDepth = 3; // Look up to 3 spaces away
        
        while (maxDepth > 0 && nx >= 0 && nx < board.length && ny >= 0 && ny < board.length) {
            if (board[nx][ny] === 'X') {
                friendlyCount++;
            } else if (board[nx][ny] === '.') {
                emptyCount++;
            } else {
                break; // Stop at enemy stones
            }
            nx += dx;
            ny += dy;
            maxDepth--;
        }
        
        // Value moves that help enclose territory
        if (friendlyCount >= 1 && emptyCount > 0) {
            territoryValue += friendlyCount + (emptyCount * 0.5);
        }
    }
    
    // Check if move helps create a box formation
    if (formsPotentialTerritory(board, x, y)) {
        territoryValue += 5;
    }
    
    return territoryValue > 3; // Return true if significant territory value
}

function formsPotentialTerritory(board, x, y) {
    // Check for box-like formations that could become territory
    const patterns = [
        [[1,0], [0,1], [1,1]],  // Bottom-right box
        [[-1,0], [0,1], [-1,1]], // Bottom-left box
        [[1,0], [0,-1], [1,-1]], // Top-right box
        [[-1,0], [0,-1], [-1,-1]] // Top-left box
    ];
    
    for (const pattern of patterns) {
        let friendlyCount = 0;
        let emptyCount = 0;
        
        for (const [dx, dy] of pattern) {
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < board.length && ny >= 0 && ny < board.length) {
                if (board[nx][ny] === 'X') {
                    friendlyCount++;
                } else if (board[nx][ny] === '.') {
                    emptyCount++;
                } else {
                    friendlyCount = 0; // Reset if we find an enemy stone
                    break;
                }
            }
        }
        
        // If we have at least 2 friendly stones and some empty space
        if (friendlyCount >= 2 && emptyCount > 0) {
            return true;
        }
    }
    
    return false;
}

function getPreviousBoardState(moveHistory, currentBoard) {
    if (moveHistory.length === 0) return null;
    return moveHistory[moveHistory.length - 1].board;
}