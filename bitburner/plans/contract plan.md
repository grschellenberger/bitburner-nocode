# Coding Contract Solver Plan

## Resources
@https://github.com/bitburner-official/bitburner-src/blob/5301f0f378821a2fc091c8fdec7102d2791fa9bf/src/Documentation/doc/basic/codingcontracts.md 
@https://github.com/bitburner-official/bitburner-src/blob/5301f0f378821a2fc091c8fdec7102d2791fa9bf/src/CodingContractGenerator.ts 
@https://github.com/bitburner-official/bitburner-src/blob/5301f0f378821a2fc091c8fdec7102d2791fa9bf/src/data/codingcontracttypes.ts 
@https://github.com/bitburner-official/bitburner-src/blob/stable/markdown/bitburner.codingcontract.md 

## 1. Project Structure
- Create `/contracts` directory on home server
- Create `solutions.txt` to store known solutions
- Create main script `contract-solver.js`
- Create utility script `network-scanner.js`

## 2. Core Components Implementation

### A. Network Scanner
1. Implement recursive network scan function
   - Start from 'home'
   - Track visited servers to avoid loops
   - Return complete list of accessible servers

### B. Contract Finder
1. Create function to scan server for .cct files
2. For each contract found:
   - Get contract type and data
   - Raise info toast with location and type
   - Add to processing queue

### C. Solution Manager
1. Implement solution file operations
   - Read/write to solutions.txt
   - Parse stored solutions
   - Add new solutions when discovered

### D. Contract Handler
1. Create main contract processing function
   - Identify contract type
   - Load appropriate solver
   - Execute solution
   - Handle results

### E. Contract Solvers
1. Implement solver for each contract type
2. Create template for adding new solvers
3. Implement error handling for unknown types

## 3. Main Loop Implementation
1. Initialize logging and directories
2. Every 5 minutes:
   - Scan network for contracts
   - Process found contracts
   - Update solution file
   - Clean up completed contracts

## 4. Error Handling & Logging
1. Implement logging system
   - Contract discovery
   - Solution attempts
   - Results and rewards
   - Errors and failures

## 5. Contract Management
1. Implement contract copying to home
   - For failed attempts
   - For unknown types
2. Track attempted contracts
   - Prevent multiple attempts
   - Mark completed contracts

## 6. Testing & Validation
1. Test each solver type
2. Validate network scanning
3. Verify error handling
4. Test continuous operation

## Implementation Order
1. Network scanner utility
2. Basic contract finder
3. Logging system
4. Contract handler framework
5. Individual solvers
6. Solution management
7. Main loop
8. Error handling
9. Contract copying
10. Testing and refinement

## Success Criteria
- Automatically finds and attempts to solve contracts
- Copies unsolved contracts to home
- Maintains log of attempts and results
- Runs continuously without errors
- Successfully handles all known contract types