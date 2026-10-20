import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { verifyReleaseTag } from "../scripts/verify-release-tag.mjs";

for (const version of [
	"0.0.0",
	"1.2.3",
	"10.20.30",
	"1.2.3-alpha.1",
	"1.2.3-0",
	"1.2.3-01alpha.x-y",
]) {
	test(`accepts SemVer ${version} and Git tag refs`, () => {
		assert.equal(verifyReleaseTag(`v${version}`, version), `v${version}`);
		assert.equal(
			verifyReleaseTag(`refs/tags/v${version}`, version),
			`v${version}`,
		);
	});
}

for (const tag of [
	"1.2.3",
	"v1.2",
	"v1.2.3.4",
	"v01.2.3",
	"v1.02.3",
	"v1.2.03",
	"v1.2.3-01",
	"v1.2.3-alpha.01",
	"v1.2.3-",
	"v1.2.3+",
	"v1.2.3-alpha..1",
	"v1.2.3+build..1",
	"v1.2.3-ä",
	"v1.2.3+build_1",
	"v1.2.3\n",
	" v1.2.3",
	"refs/heads/v1.2.3",
]) {
	test(`rejects invalid tag ${JSON.stringify(tag)} before version equality`, () => {
		assert.throws(
			() => verifyReleaseTag(tag, tag.replace(/^v/, "")),
			/not a valid v-prefixed SemVer tag/,
		);
	});
}

test("requires a tag and a package version", () => {
	assert.throws(() => verifyReleaseTag("", "1.2.3"), /Missing release tag/);
	for (const version of [undefined, null, "", 123]) {
		assert.throws(
			() => verifyReleaseTag("v1.2.3", version),
			/package.json does not declare a version/,
		);
	}
});

for (const version of ["1.2.3+build.001", "1.2.3-rc.1+build.001"]) {
	test(`rejects npm-incompatible build metadata in ${version} even with an exact version match`, () => {
		for (const prefix of ["v", "refs/tags/v"]) {
			assert.throws(
				() => verifyReleaseTag(`${prefix}${version}`, version),
				/build metadata, which is not supported for npm releases/,
			);
		}
	});
}

test("requires exact version equality, including prerelease", () => {
	for (const tag of ["v1.2.4", "v1.2.3-rc.1"]) {
		assert.throws(
			() => verifyReleaseTag(tag, "1.2.3"),
			/does not match package version 1.2.3. Expected v1.2.3/,
		);
	}
});

const script = fileURLToPath(
	new URL("../scripts/verify-release-tag.mjs", import.meta.url),
);
const { version } = JSON.parse(
	readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);

function run(args, tag = "") {
	return spawnSync(process.execPath, [script, ...args], {
		cwd: tmpdir(),
		env: { ...process.env, GITHUB_REF_NAME: tag },
		encoding: "utf8",
	});
}

test("CLI reads package relative to the script, with an explicit tag taking precedence", () => {
	const result = run(["--", `v${version}`], "v999.0.0");
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /matches package version/);
});

test("CLI accepts GITHUB_REF_NAME and fails on missing or invalid tags", () => {
	const success = run([], `refs/tags/v${version}`);
	assert.equal(success.status, 0, success.stderr);
	for (const tag of ["", "not-semver", "v999.0.0", `v${version}+build.001`]) {
		const result = run([], tag);
		assert.equal(result.status, 1);
		assert.doesNotMatch(result.stdout, /matches package version/);
	}
});
