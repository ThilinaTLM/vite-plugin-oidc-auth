import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import * as client from "openid-client";
import type { Plugin, ViteDevServer } from "vite";

import {
  getDefaultOidcPluginOptions,
  getEnvOidcPluginOptions,
} from "./config.js";
import { createErrorPage, createSuccessPage } from "./templates.js";
import type { CachedTokenData, OidcPluginOptions } from "./types.js";
import { openBrowser, readCachedToken, writeCachedToken } from "./utils.js";

function validateCachedToken(cacheFile: string): string | null {
  const cachedData = readCachedToken(cacheFile);
  if (!cachedData) {
    return null;
  }

  const now = Date.now();
  const bufferMs = 30 * 1000; // 30 seconds buffer

  if (now >= cachedData.expires_at - bufferMs) {
    console.log("🔄 [OIDC Auth] Cached token has expired");
    return null;
  }

  console.log("✅ [OIDC Auth] Using cached token");
  return cachedData.access_token;
}

function oidcPlugin(
  options: OidcPluginOptions = getDefaultOidcPluginOptions()
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
            "⚠️  [OIDC Auth] Plugin will be disabled due to configuration error"
          );
          return;
        }
      }

      console.log(
        `⚙️  [OIDC Auth] Plugin initialized with auto-browser: ${
          options.openBrowser ? "enabled" : "disabled"
        }`
      );

      if (!config.define) {
        config.define = {};
      }
      config.define["import.meta.env.VITE_API_TOKEN"] = JSON.stringify(
        process.env.VITE_API_TOKEN || null
      );
      return config;
    },

    configureServer(devServer: ViteDevServer) {
      if (!options.oidcOptions) {
        console.warn(
          "⚠️  [OIDC Auth] Plugin disabled due to missing configuration"
        );
        return;
      }

      const server = devServer;
      const cacheFile = options.cacheFile || ".oidc-cache.json";

      const cachedToken = validateCachedToken(cacheFile);
      if (cachedToken) {
        process.env.VITE_API_TOKEN = cachedToken;
        if (server?.config.define) {
          server.config.define["import.meta.env.VITE_API_TOKEN"] =
            JSON.stringify(cachedToken);
        }
        console.log("🔑 [OIDC Auth] Using cached token:", cachedToken);
        return;
      }

      console.log(
        "🔄 [OIDC Auth] No valid cached token found, starting SSO flow"
      );

      return new Promise<void>((resolve) => {
        const { port, hostname } = new URL(
          options.oidcOptions?.redirectUri || ""
        );

        const codeVerifier = client.randomPKCECodeVerifier();
        const expectedState = client.randomState();
        const expectedNonce = client.randomNonce();
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
                    expectedState,
                    expectedNonce,
                  }
                );

                process.env.VITE_API_TOKEN = tokens.access_token;

                if (server?.config.define) {
                  server.config.define["import.meta.env.VITE_API_TOKEN"] =
                    JSON.stringify(tokens.access_token);
                }

                const expired_at =
                  Date.now() + (tokens.expires_in || 0) * 1000;

                const tokenData: CachedTokenData = {
                  access_token: tokens.access_token,
                  refresh_token: tokens.refresh_token,
                  expires_at: expired_at,
                  token_type: tokens.token_type,
                };
                writeCachedToken(cacheFile, tokenData);

                console.log(
                  "✅ [OIDC Auth] Access token obtained successfully!"
                );
                console.log("🔑 [OIDC Auth] Token:", tokens.access_token);
                console.log("💾 [OIDC Auth] Token cached for future use");
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(createSuccessPage());
                resolve();
              } catch (error) {
                console.error(
                  "❌ [OIDC Auth] Error obtaining access token:",
                  error
                );
                res.writeHead(500, { "Content-Type": "text/html" });
                res.end(createErrorPage());
                resolve();
              } finally {
                if (serverTimeout) {
                  clearTimeout(serverTimeout);
                }
                tempHttpServer.close();
              }
            } else {
              res
                .writeHead(400)
                .end("Bad Request: No authorization code received");
            }
          }
        );

        tempHttpServer.on("error", (error) => {
          console.error(
            "❌ [OIDC Auth] Failed to start authentication server:",
            error
          );
          resolve();
        });

        let serverTimeout: NodeJS.Timeout | null = null;

        tempHttpServer.listen(parseInt(port, 10), hostname, async () => {
          console.log(
            `🚀 [OIDC Auth] Starting authentication server on ${hostname}:${port}`
          );

          const timeoutSeconds = options.serverTimeout || 30;
          serverTimeout = setTimeout(() => {
            console.log(
              `⏱️  [OIDC Auth] Server timeout reached (${timeoutSeconds}s). Closing authentication server.`
            );
            console.log(
              "❌ [OIDC Auth] Authentication was not completed within the timeout period"
            );
            tempHttpServer.close();
            resolve();
          }, timeoutSeconds * 1000);

          try {
            const discoveryUrl = new URL(
              options.oidcOptions?.discoveryUrl || ""
            );
            const issuerPath = discoveryUrl.pathname.endsWith(
              "/.well-known/openid-configuration"
            )
              ? discoveryUrl.pathname.replace(
                  "/.well-known/openid-configuration",
                  ""
                )
              : discoveryUrl.pathname;
            const issuerUrl = new URL(discoveryUrl.origin + issuerPath);

            console.log(
              `🔍 [OIDC Auth] Discovering OIDC configuration from: ${issuerUrl.href}`
            );

            config = await client.discovery(
              issuerUrl,
              options.oidcOptions?.clientId || "",
              options.oidcOptions?.clientSecret || ""
            );

            codeChallenge =
              await client.calculatePKCECodeChallenge(codeVerifier);

            const authorizationUrl = client.buildAuthorizationUrl(config, {
              redirect_uri: options.oidcOptions?.redirectUri || "",
              scope: options.oidcOptions?.scope || "",
              code_challenge: codeChallenge,
              code_challenge_method: "S256",
              state: expectedState,
              nonce: expectedNonce,
            });

            console.log(
              `🔒 [OIDC Auth] Authentication URL generated successfully`
            );
            console.log(`🌐 [OIDC Auth] ${authorizationUrl.href}`);
            console.log(
              `⏰ [OIDC Auth] Server will timeout in ${timeoutSeconds} seconds`
            );

            if (options.openBrowser) {
              console.log(`🚀 [OIDC Auth] Opening browser automatically...`);
              openBrowser(authorizationUrl.href);
            } else {
              console.log(
                `📋 [OIDC Auth] Please open the above URL in your browser to authenticate`
              );
            }
          } catch (error) {
            console.error(
              "❌ [OIDC Auth] Error setting up OIDC client:",
              error
            );
            if (serverTimeout) {
              clearTimeout(serverTimeout);
            }
            tempHttpServer.close();
            resolve();
          }
        });
      });
    },
  };
}

export default oidcPlugin;
