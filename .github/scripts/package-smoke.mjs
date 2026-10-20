import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [tarball, ...extra] = process.argv.slice(2);
assert.ok(tarball && extra.length === 0, "Expected exactly one npm tarball");
const entries = execFileSync("tar", ["-tzf", resolve(tarball)], {
	encoding: "utf8",
})
	.trim()
	.split("\n");
for (const entry of entries) {
	assert.ok(
		/^package\/(dist\/[^\n]*|package\.json|README\.md|LICEN[CS]E(?:\.md)?)$/.test(
			entry,
		) && !entry.split("/").includes(".."),
		`Unexpected package entry: ${entry}`,
	);
}
for (const required of [
	"package.json",
	"README.md",
	"dist/index.js",
	"dist/index.d.ts",
]) {
	assert.ok(entries.includes(`package/${required}`), `Missing ${required}`);
}

// Stay below the workspace so the packed module resolves the installed dependencies.
const directory = await mkdtemp(join(process.cwd(), ".package-smoke-"));
try {
	execFileSync("tar", ["-xzf", resolve(tarball), "-C", directory]);
	const root = join(directory, "package");
	const manifest = JSON.parse(
		await readFile(join(root, "package.json"), "utf8"),
	);
	assert.equal(manifest.name, "vite-plugin-oidc-auth");
	assert.equal(manifest.exports["."].import, "./dist/index.js");
	assert.equal(manifest.exports["."].types, "./dist/index.d.ts");
	const entry = await import(pathToFileURL(join(root, "dist/index.js")).href);
	assert.equal(
		typeof entry.default,
		"function",
		"Expected a default plugin factory",
	);
	console.log(
		`Package smoke test passed: ${manifest.name}@${manifest.version}`,
	);
} finally {
	await rm(directory, { recursive: true, force: true });
}
