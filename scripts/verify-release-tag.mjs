import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2).filter((arg) => arg !== "--");
const rawTag = args[0] ?? process.env.GITHUB_REF_NAME ?? "";
const tag = rawTag.replace(/^refs\/tags\//, "");

if (!tag) {
	throw new Error(
		"Missing release tag. Pass a tag argument or set GITHUB_REF_NAME.",
	);
}

const packageJson = JSON.parse(
	await readFile(join(repoRoot, "package.json"), "utf8"),
);
if (typeof packageJson.version !== "string" || !packageJson.version) {
	throw new Error("package.json does not declare a version.");
}

const expectedTag = `v${packageJson.version}`;
if (tag !== expectedTag) {
	throw new Error(
		`Release tag ${tag} does not match package version ${packageJson.version}. Expected ${expectedTag}.`,
	);
}

console.log(`Release tag ${tag} matches package version ${packageJson.version}.`);
