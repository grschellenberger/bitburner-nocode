/** @param {NS} ns */
/** 
 * Solver for "Find All Valid Math Expressions" contract type
 * Find all expressions that evaluate to target by adding +, -, * between numbers
 * @param {Array} data - [nums, target] where nums is string of numbers and target is desired result
 * @param {NS} ns - Netscript API
 * @returns {Array<string>} Array of valid expressions
 */
export async function solve(data, ns) {
    const num = data[0];
    const target = data[1];
    let operationCount = 0;

    // Adjust sleep frequency based on input length
    const sleepTime = num.length > 8 ? 50 : 0;
    const sleepFrequency = num.length > 8 ? 50 : 100;

    async function helper(res, path, num, target, pos, evaluated, multed) {
        // Yield to game engine more frequently with longer sleep for big inputs
        if (++operationCount % sleepFrequency === 0) {
            await ns.sleep(sleepTime);
        }

        if (pos === num.length) {
            if (target === evaluated) {
                res.push(path);
            }
            return;
        }

        for (let i = pos; i < num.length; ++i) {
            if (i != pos && num[pos] == '0') {
                break;
            }
            const cur = parseInt(num.substring(pos, i + 1));
            if (pos === 0) {
                await helper(res, path + cur, num, target, i + 1, cur, cur);
            } else {
                await helper(res, path + '+' + cur, num, target, i + 1, evaluated + cur, cur);
                await helper(res, path + '-' + cur, num, target, i + 1, evaluated - cur, -cur);
                await helper(res, path + '*' + cur, num, target, i + 1, evaluated - multed + multed * cur, multed * cur);
            }
        }
    }

    if (num == null || num.length === 0) {
        return [];
    }
    const result = [];
    await helper(result, '', num, target, 0, 0, 0);
    return result;
} 