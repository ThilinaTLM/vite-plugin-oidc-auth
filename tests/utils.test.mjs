import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { test } from "node:test";
import { getDefaultOidcPluginOptions } from "../packages/lib/config.ts";
import { readCachedToken, writeCachedToken } from "../packages/lib/utils.ts";

function cachePath(t) {
	const directory = mkdtempSync(join(tmpdir(), "oidc-cache-test-"));
	t.after(() => rmSync(directory, { recursive: true, force: true }));
	return join(directory, "token.json");
}

test("default plugin options are stable and returned as independent objects", () => {
	const options = getDefaultOidcPluginOptions();
	assert.deepEqual(options, {
		openBrowser: true,
		cacheFile: ".oidc-cache.json",
		serverTimeout: 30,
	});
	options.cacheFile = "changed.json";
	assert.equal(getDefaultOidcPluginOptions().cacheFile, ".oidc-cache.json");
});

test("missing cache returns null without warning", (t) => {
	const warn = t.mock.method(console, "warn", () => {});
	assert.equal(readCachedToken(cachePath(t)), null);
	assert.equal(warn.mock.callCount(), 0);
});

test("token cache round-trips JSON using a path relative to cwd", (t) => {
	const file = relative(process.cwd(), cachePath(t));
	const token = {
		access_token: "test-access-token",
		refresh_token: "test-refresh-token",
		expires_at: 1700000000,
	};
	writeCachedToken(file, token);
	assert.deepEqual(readCachedToken(file), token);
	assert.deepEqual(JSON.parse(readFileSync(file, "utf8")), token);
});

test("writing the cache replaces the old token", (t) => {
	const file = cachePath(t);
	writeCachedToken(file, { access_token: "old", expires_at: 1700000000 });
	writeCachedToken(file, { access_token: "new", expires_at: 1700003600 });
	assert.deepEqual(readCachedToken(file), {
		access_token: "new",
		expires_at: 1700003600,
	});
});

test("malformed cache JSON warns and returns null", (t) => {
	const file = cachePath(t);
	writeFileSync(file, "not json");
	const warn = t.mock.method(console, "warn", () => {});
	assert.equal(readCachedToken(file), null);
	assert.equal(warn.mock.callCount(), 1);
	assert.match(warn.mock.calls[0].arguments[0], /Failed to read cached token/);
});

test("cache write errors warn instead of throwing", (t) => {
	const file = join(cachePath(t), "missing-directory", "token.json");
	const warn = t.mock.method(console, "warn", () => {});
	assert.doesNotThrow(() =>
		writeCachedToken(file, { access_token: "test", expires_at: 1700000000 }),
	);
	assert.equal(warn.mock.callCount(), 1);
	assert.match(warn.mock.calls[0].arguments[0], /Failed to write cached token/);
});
