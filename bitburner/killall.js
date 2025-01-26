export function GetAllServers(ns, root = 'home', found = []) {
	found.push(root);
	for (const server of ns.scan(root))
		if (!found.includes(server)) GetAllServers(ns, server, found);
	return found;
}
export async function main(ns) {
	for (var server of GetAllServers(ns)) {
		ns.killall(server, true);
	}
	ns.toast('WARN: Killed all scripts!', 'warning');
}