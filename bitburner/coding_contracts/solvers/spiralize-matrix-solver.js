/** 
 * Solver for "Spiralize Matrix" contract type
 * @param {Array<Array<number>>} data - 2D array representing the matrix
 * @returns {Array<number>} Elements of the matrix in spiral order
 */
export function solve(data) {
    // Input validation
    if (!Array.isArray(data) || !data.length || !Array.isArray(data[0])) {
        throw new Error("Invalid input: expected 2D array");
    }

    const result = [];
    const rows = data.length;
    const cols = data[0].length;
    
    let topRow = 0,
        bottomRow = rows - 1,
        leftCol = 0,
        rightCol = cols - 1;
    
    while (topRow <= bottomRow && leftCol <= rightCol) {
        // Move right: top row
        for (let col = leftCol; col <= rightCol; col++) {
            result.push(data[topRow][col]);
        }
        topRow++;
        
        // Move down: right column
        for (let row = topRow; row <= bottomRow; row++) {
            result.push(data[row][rightCol]);
        }
        rightCol--;
        
        if (topRow <= bottomRow) {
            // Move left: bottom row
            for (let col = rightCol; col >= leftCol; col--) {
                result.push(data[bottomRow][col]);
            }
            bottomRow--;
        }
        
        if (leftCol <= rightCol) {
            // Move up: left column
            for (let row = bottomRow; row >= topRow; row--) {
                result.push(data[row][leftCol]);
            }
            leftCol++;
        }
    }
    
    return result;
} 