import { exec } from "node:child_process";

export function openBrowser(url: string): void {
	const platform = process.platform;
	let command: string;

	switch (platform) {
		case "darwin":
			command = `open "${url}"`;
			break;
		case "win32":
			command = `start "" "${url}"`;
			break;
		default:
			command = `xdg-open "${url}"`;
	}

	exec(command, (error) => {
		if (error) {
			console.warn(
				`⚠️  [OIDC Auth] Failed to open browser automatically: ${error.message}`,
			);
		}
	});
}
