/** 
 * Solver for "Compression III: LZ Compression" contract type
 * Find the minimum length LZ compression of the input string
 * @param {string} data - String to compress
 * @returns {string} Compressed string
 */
export async function solve(data) {
    if (!data) return '';
    if (data.length === 1) return '1' + data;

    // Create two 10x10 state arrays
    let curState = Array.from(Array(10), () => Array(10).fill(null));
    let newState = Array.from(Array(10), () => Array(10));

    // Helper to set state with random selection for equal lengths
    function setState(state, i, j, str) {
        const current = state[i][j];
        if (current === null || str.length < current.length) {
            state[i][j] = str;
        } else if (str.length === current.length && Math.random() < 0.5) {
            state[i][j] = str;
        }
    }

    // Initial state: empty string with literal length 1
    curState[0][1] = "";

    // Process each character
    for (let i = 1; i < data.length; ++i) {
        // Reset new state
        for (const row of newState) {
            row.fill(null);
        }
        
        // Add sleep every few operations to prevent freezing
        if (i % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        const c = data[i];

        // Handle literals
        for (let length = 1; length <= 9; ++length) {
            const string = curState[0][length];
            if (string === null) continue;

            if (length < 9) {
                // Extend current literal
                setState(newState, 0, length + 1, string);
            } else {
                // Start new literal
                setState(newState, 0, 1, string + "9" + data.substring(i - 9, i) + "0");
            }

            // Try starting new backreference
            for (let offset = 1; offset <= Math.min(9, i); ++offset) {
                if (data[i - offset] === c) {
                    setState(newState, offset, 1, string + length + data.substring(i - length, i));
                }
            }
        }

        // Handle backreferences
        for (let offset = 1; offset <= 9; ++offset) {
            for (let length = 1; length <= 9; ++length) {
                const string = curState[offset][length];
                if (string === null) continue;

                if (data[i - offset] === c) {
                    if (length < 9) {
                        // Extend current backreference
                        setState(newState, offset, length + 1, string);
                    } else {
                        // Start new backreference
                        setState(newState, offset, 1, string + "9" + offset + "0");
                    }
                }

                // Start new literal
                setState(newState, 0, 1, string + length + offset);

                // Try new backreference
                for (let newOffset = 1; newOffset <= Math.min(9, i); ++newOffset) {
                    if (data[i - newOffset] === c) {
                        setState(newState, newOffset, 1, string + length + offset + "0");
                    }
                }
            }
        }

        // Swap states
        [curState, newState] = [newState, curState];
    }

    // Find best result from final state
    let result = null;

    // Check literals
    for (let len = 1; len <= 9; ++len) {
        let string = curState[0][len];
        if (string === null) continue;

        string += len + data.substring(data.length - len);
        if (result === null || string.length < result.length) {
            result = string;
        } else if (string.length === result.length && Math.random() < 0.5) {
            result = string;
        }
    }

    // Check backreferences
    for (let offset = 1; offset <= 9; ++offset) {
        for (let len = 1; len <= 9; ++len) {
            let string = curState[offset][len];
            if (string === null) continue;

            string += len + "" + offset;
            if (result === null || string.length < result.length) {
                result = string;
            } else if (string.length === result.length && Math.random() < 0.5) {
                result = string;
            }
        }
    }

    return result ?? "";
} 