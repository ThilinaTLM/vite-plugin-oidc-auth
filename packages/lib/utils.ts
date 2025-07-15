import { exec } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { CachedTokenData } from "./types";

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
        `⚠️  [OIDC Auth] Failed to open browser automatically: ${error.message}`
      );
    }
  });
}

function getCacheFilePath(cacheFile: string): string {
  return path.resolve(process.cwd(), cacheFile);
}

export function readCachedToken(cacheFile: string): CachedTokenData | null {
  try {
    const cacheFilePath = getCacheFilePath(cacheFile);
    if (!fs.existsSync(cacheFilePath)) {
      return null;
    }

    const cachedData = fs.readFileSync(cacheFilePath, "utf8");
    return JSON.parse(cachedData) as CachedTokenData;
  } catch (error) {
    console.warn("⚠️  [OIDC Auth] Failed to read cached token:", error);
    return null;
  }
}

export function writeCachedToken(
  cacheFile: string,
  tokenData: CachedTokenData
): void {
  try {
    const cacheFilePath = getCacheFilePath(cacheFile);
    fs.writeFileSync(cacheFilePath, JSON.stringify(tokenData, null, 2));
  } catch (error) {
    console.warn("⚠️  [OIDC Auth] Failed to write cached token:", error);
  }
}
