import dotenv from "dotenv";
import type { OidcOptions, OidcPluginOptions } from "./types.js";

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `[OIDC Auth] Environment variable ${key} is not set. This plugin requires OIDC configuration in development mode.`
    );
  }
  return value;
}

export function getEnvOidcPluginOptions(envFilePath?: string): OidcOptions {
  try {
    if (envFilePath) {
      dotenv.config({
        path: envFilePath,
      });
    } else {
      dotenv.config({
        path: ".env",
      });
      dotenv.config({
        path: ".env.local",
        override: true,
      });
    }
    return {
      discoveryUrl: getEnv("OIDC_DISCOVERY_URL"),
      clientId: getEnv("OIDC_CLIENT_ID"),
      clientSecret: getEnv("OIDC_CLIENT_SECRET"),
      redirectUri: getEnv("OIDC_REDIRECT_URI"),
      scope: getEnv("OIDC_SCOPE"),
    };
  } catch (error) {
    console.error(
      "❌ [OIDC Auth] Failed to load OIDC configuration:",
      error instanceof Error ? error.message : "Unknown error"
    );
    console.log(
      "💡 [OIDC Auth] Make sure you have the required environment variables set in your .env file"
    );
    throw error;
  }
}

export function getDefaultOidcPluginOptions(): OidcPluginOptions {
  return {
    openBrowser: true,
    cacheFile: ".oidc-cache",
  };
}
