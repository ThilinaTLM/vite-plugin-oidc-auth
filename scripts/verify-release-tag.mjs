import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// SemVer 2.0.0: numeric identifiers cannot have leading zeroes, except in
// build metadata. Prerelease identifiers must contain a non-digit otherwise.
const numeric = "(?:0|[1-9][0-9]*)";
const prerelease = `(?:${numeric}|[0-9]*[A-Za-z-][0-9A-Za-z-]*)`;
const semverTag = new RegExp(
	`^v${numeric}\\.${numeric}\\.${numeric}(?:-${prerelease}(?:\\.${prerelease})*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$`,
);

export function verifyReleaseTag(rawTag, version) {
	const tag = rawTag.replace(/^refs\/tags\//, "");
	if (!tag) {
		throw new Error(
			"Missing release tag. Pass a tag argument or set GITHUB_REF_NAME.",
		);
	}

	// Compare the complete match as `$` also matches before a final newline.
	if (tag.match(semverTag)?.[0] !== tag) {
		throw new Error(`Release tag ${tag} is not a valid v-prefixed SemVer tag.`);
	}
	// npm strips build metadata from versions and tarball names. Reject it
	// rather than publishing an artifact that differs from the release tag.
	if (tag.includes("+")) {
		throw new Error(
			`Release tag ${tag} contains build metadata, which is not supported for npm releases. Use a stable or prerelease version without +metadata.`,
		);
	}
	if (typeof version !== "string" || !version) {
		throw new Error("package.json does not declare a version.");
	}
	const expectedTag = `v${version}`;
	if (tag !== expectedTag) {
		throw new Error(
			`Release tag ${tag} does not match package version ${version}. Expected ${expectedTag}.`,
		);
	}
	return tag;
}

async function main() {
	const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
	const args = process.argv.slice(2).filter((arg) => arg !== "--");
	const rawTag = args[0] ?? process.env.GITHUB_REF_NAME ?? "";
	const packageJson = JSON.parse(
		await readFile(join(repoRoot, "package.json"), "utf8"),
	);
	const tag = verifyReleaseTag(rawTag, packageJson.version);
	console.log(
		`Release tag ${tag} matches package version ${packageJson.version}.`,
	);
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
	await main();
}
