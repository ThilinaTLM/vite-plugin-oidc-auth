import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import * as client from "openid-client";
import { jwtDecode } from "jwt-decode";
import type { Plugin, ViteDevServer } from "vite";

import {
  getDefaultOidcPluginOptions,
  getEnvOidcPluginOptions,
} from "./config.js";
import { createErrorPage, createSuccessPage } from "./templates.js";
import type { OidcPluginOptions } from "./types.js";
import { openBrowser } from "./utils.js";

interface CachedTokenData {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  token_type?: string;
}

function getCacheFilePath(cacheFile: string): string {
  return path.resolve(process.cwd(), cacheFile);
}

function readCachedToken(cacheFile: string): CachedTokenData | null {
  try {
    const cacheFilePath = getCacheFilePath(cacheFile);
    if (!fs.existsSync(cacheFilePath)) {
      return null;
    }
    
    const cachedData = fs.readFileSync(cacheFilePath, 'utf8');
    return JSON.parse(cachedData) as CachedTokenData;
  } catch (error) {
    console.warn("⚠️  [OIDC Auth] Failed to read cached token:", error);
    return null;
  }
}

function writeCachedToken(cacheFile: string, tokenData: CachedTokenData): void {
  try {
    const cacheFilePath = getCacheFilePath(cacheFile);
    fs.writeFileSync(cacheFilePath, JSON.stringify(tokenData, null, 2));
  } catch (error) {
    console.warn("⚠️  [OIDC Auth] Failed to write cached token:", error);
  }
}

function isTokenExpired(token: string, bufferSeconds: number = 300): boolean {
  try {
    const decoded = jwtDecode(token);
    if (!decoded.exp) {
      return true;
    }
    
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = decoded.exp - bufferSeconds;
    return now >= expiresAt;
  } catch (error) {
    console.warn("⚠️  [OIDC Auth] Failed to decode token:", error);
    return true;
  }
}

function validateCachedToken(cacheFile: string): string | null {
  const cachedData = readCachedToken(cacheFile);
  if (!cachedData) {
    return null;
  }
  
  if (isTokenExpired(cachedData.access_token)) {
    console.log("🔄 [OIDC Auth] Cached token has expired");
    return null;
  }
  
  console.log("✅ [OIDC Auth] Using cached token");
  return cachedData.access_token;
}

function oidcPlugin(
	options: OidcPluginOptions = getDefaultOidcPluginOptions(),
): Plugin {
	return {
		name: "vite-plugin-oidc-auth",
		apply(_config, { command }) {
			return command === "serve";
		},

		config(config, { command }) {
			if (command !== "serve") return;

			if (!options.oidcOptions) {
				try {
					options.oidcOptions = getEnvOidcPluginOptions(options.envFilePath);
				} catch (_error) {
					console.warn(
						"⚠️  [OIDC Auth] Plugin will be disabled due to configuration error",
					);
					return;
				}
			}

			console.log(
				`⚙️  [OIDC Auth] Plugin initialized with auto-browser: ${
					options.openBrowser ? "enabled" : "disabled"
				}`,
			);

			if (!config.define) {
				config.define = {};
			}
			config.define["import.meta.env.VITE_API_TOKEN"] = JSON.stringify(
				process.env.VITE_API_TOKEN || null,
			);
			return config;
		},

		configureServer(devServer: ViteDevServer) {
			if (!options.oidcOptions) {
				console.warn("⚠️  [OIDC Auth] Plugin disabled due to missing configuration");
				return;
			}

			const server = devServer;
			const cacheFile = options.cacheFile || ".oidc-cache";
			
			const cachedToken = validateCachedToken(cacheFile);
			if (cachedToken) {
				process.env.VITE_API_TOKEN = cachedToken;
				if (server?.config.define) {
					server.config.define["import.meta.env.VITE_API_TOKEN"] = JSON.stringify(cachedToken);
				}
				console.log("🔑 [OIDC Auth] Using cached token:", cachedToken);
				return;
			}

			console.log("🔄 [OIDC Auth] No valid cached token found, starting SSO flow");

			const { port, hostname } = new URL(
				options.oidcOptions?.redirectUri || "",
			);

			const codeVerifier = client.randomPKCECodeVerifier();
			let codeChallenge: string;
			let config: client.Configuration;

			const tempHttpServer = createServer(
				async (req: IncomingMessage, res: ServerResponse) => {
					if (!req.url) {
						res.writeHead(400).end("Bad Request");
						return;
					}

					const currentUrl = new URL(req.url, `http://${req.headers.host}`);

					if (currentUrl.searchParams.has("code")) {
						try {
							const tokens = await client.authorizationCodeGrant(
								config,
								currentUrl,
								{
									pkceCodeVerifier: codeVerifier,
								},
							);

							process.env.VITE_API_TOKEN = tokens.access_token;

							if (server?.config.define) {
								server.config.define["import.meta.env.VITE_API_TOKEN"] =
									JSON.stringify(tokens.access_token);
							}

							const tokenData: CachedTokenData = {
								access_token: tokens.access_token,
								refresh_token: tokens.refresh_token,
								expires_at: tokens.expires_in || 0,
								token_type: tokens.token_type,
							};
							writeCachedToken(cacheFile, tokenData);

							console.log("✅ [OIDC Auth] Access token obtained successfully!");
							console.log("🔑 [OIDC Auth] Token:", tokens.access_token);
							console.log("💾 [OIDC Auth] Token cached for future use");
							res.writeHead(200, { "Content-Type": "text/html" });
							res.end(createSuccessPage());
						} catch (error) {
							console.error(
								"❌ [OIDC Auth] Error obtaining access token:",
								error,
							);
							res.writeHead(500, { "Content-Type": "text/html" });
							res.end(createErrorPage());
						} finally {
							tempHttpServer.close();
						}
					} else {
						res
							.writeHead(400)
							.end("Bad Request: No authorization code received");
					}
				},
			).listen(parseInt(port, 10), hostname, async () => {
				console.log(
					`🚀 [OIDC Auth] Starting authentication server on ${hostname}:${port}`,
				);
				try {
					const discoveryUrl = new URL(options.oidcOptions?.discoveryUrl || "");
					const issuerPath = discoveryUrl.pathname.endsWith(
						"/.well-known/openid-configuration",
					)
						? discoveryUrl.pathname.replace(
								"/.well-known/openid-configuration",
								"",
							)
						: discoveryUrl.pathname;
					const issuerUrl = new URL(discoveryUrl.origin + issuerPath);

					console.log(
						`🔍 [OIDC Auth] Discovering OIDC configuration from: ${issuerUrl.href}`,
					);

					config = await client.discovery(
						issuerUrl,
						options.oidcOptions?.clientId || "",
						options.oidcOptions?.clientSecret || "",
					);

					codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);

					const authorizationUrl = client.buildAuthorizationUrl(config, {
						redirect_uri: options.oidcOptions?.redirectUri || "",
						scope: options.oidcOptions?.scope || "",
						code_challenge: codeChallenge,
						code_challenge_method: "S256",
					});

					console.log(
						`🔒 [OIDC Auth] Authentication URL generated successfully`,
					);
					console.log(`🌐 [OIDC Auth] ${authorizationUrl.href}`);

					if (options.openBrowser) {
						console.log(`🚀 [OIDC Auth] Opening browser automatically...`);
						openBrowser(authorizationUrl.href);
					} else {
						console.log(
							`📋 [OIDC Auth] Please open the above URL in your browser to authenticate`,
						);
					}
				} catch (error) {
					console.error("❌ [OIDC Auth] Error setting up OIDC client:", error);
					tempHttpServer.close();
				}
			});
		},
	};
}

export default oidcPlugin;
