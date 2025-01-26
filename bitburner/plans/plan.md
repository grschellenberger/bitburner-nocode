Refined Plan for Hacking Script Suite

Objective:
Create a suite of scripts to automate hacking operations in Bitburner, focusing on optimizing resource usage and maximizing profits from target servers.

Components:
1. Hack Script
2. Grow Script
3. Weaken Script
4. Controller Script

General Requirements:
- Use the Bitburner API and available functions to implement the scripts.
- Ensure all timing calculations round up to the nearest second to prevent overlap.
- Manage resources by executing scripts only on purchased servers.
- Log errors for review and dynamically update targets after each batch.

Task List:

1. **Hack Script**
   - [ ] Create a script that accepts a delay parameter in milliseconds.
   - [ ] Implement logic to wait for the specified delay.
   - [ ] Execute the hack function on the target server.
   - [ ] Exit the script after execution.
   - [ ] Log any errors encountered during execution.
   - [ ] Return the amount of money gained from the hack.

2. **Grow Script**
   - [ ] Create a script that accepts a delay parameter in milliseconds.
   - [ ] Implement logic to wait for the specified delay.
   - [ ] Execute the grow function on the target server.
   - [ ] Exit the script after execution.
   - [ ] Log any errors encountered during execution.
   - [ ] Return the amount of money added by the grow.

3. **Weaken Script**
   - [ ] Create a script that accepts a delay parameter in milliseconds.
   - [ ] Implement logic to wait for the specified delay.
   - [ ] Execute the weaken function on the target server.
   - [ ] Exit the script after execution.
   - [ ] Log any errors encountered during execution.
   - [ ] Return the security level of the server after the weaken.

4. **Controller Script**
   - [ ] Identify all non-player servers and filter those with more than 0 max money and root access.
   - [ ] Prioritize weakening any servers that are not at their minimum security level.
     - [ ] Execute weaken scripts on these servers.
     - [ ] Ensure that weaken scripts run until the server reaches its minimum security level.
   - [ ] Once servers are at minimum security, prioritize growing servers not at their maximum money value.
     - [ ] Execute grow scripts followed by weaken scripts to maintain minimum security.
     - [ ] Ensure the grow script completes, then the weaken script completes exactly 1 second later.
   - [ ] After all servers are at max money and min security, calculate the money per second for each server using the formula: (CurrentMoney * HackChance) / (WeakenTime + 2000ms).
   - [ ] Select the top 3 servers based on the highest money per second.
   - [ ] Execute the batch against these top 3 servers individually with the following timing:
     - [ ] Hack script completes, then 1 second later weaken script.
     - [ ] Weaken script completes, then 1 second later grow script.
     - [ ] Grow script completes, then 1 second later weaken script.
   - [ ] Manage server resources by executing scripts only on purchased servers to host the scripts.
     - [ ] If the host server does not have the files required, it should copy them from the home server. All the scripts are stored in the "infect" directory on the home server, which can be copied to the host server used to execute the scripts using the function ns.scp("infect/hack-once.js", host, "home").
     - [ ] The controller script will be executed on the home server, and will use all the player purchased servers as hosts for the scripts it executes. It should not execute the scripts on the home server itself.
   - [ ] Log any errors encountered during execution.
   - [ ] After each batch, update the target list based on the latest server conditions.
   - [ ] Implement a loop to continuously execute batches with a 3-second delay between them.

5. **Testing and Validation**
   - [ ] Proofread and edit scripts for accuracy and efficiency.
   - [ ] Test scripts in the Bitburner game environment.
   - [ ] Validate that the scripts meet the objectives and perform as expected.


Original Plan:
I would like to create a group of scripts with the following functionality:
1. A script that begins on a delay, then executes a hack function, then exits.
2. A script that begins on a delay, then executes a grow function, then exits.
3. A script that begins on a delay, then executes a weaken function, then exits.
4. A controller script that will execute the other scripts in a loop, with a delay between each execution.
 - The controller script will be the main script, and will be responsible for executing the other scripts in a loop, with a delay between each execution.
 - The other scripts will be responsible for executing the hack, grow, and weaken functions, respectively.
 - The controller script will be responsible for executing the other scripts in a loop, with a delay between each execution.   
 - The controller script will be responsible for checking the current level of the target server, and will only execute the other scripts if the target server is at or below the current hacking level.
 - The controller script should prioritize weakening all servers that can be hacked first. When all servers are at their minimum security level, it should then run batches of hack, grow, and weaken functions in batches. 
 - The controller script should calculate the time it will take to execute the hack, weaken and grow functions, adding a delay at the start of each script to ensure that the other scripts are executed in the correct order.
 - The ideal order of execution for the hack, weaken and grow scripts is: hack, weaken, grow, weaken. This will keep the security level at its lowest possible value during hack and grow functions.
 - The controller script should be able to handle multiple servers, and should be able to execute the other scripts in a loop, with a delay between each execution.
 - The controller script should only hack 10% of a server's maximum money, and should grow back to the maximum money after the hack is complete.
 - The controller should be executing these batches against the top 3 servers in the target list, based on the estimated money per second that can be earned.

