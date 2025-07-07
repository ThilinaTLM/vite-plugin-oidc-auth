import type { Plugin, ViteDevServer } from "vite";
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { exec } from "node:child_process";
import * as client from "openid-client";
import dotenv from "dotenv";

export type OidcOptions = {
  discoveryUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string;
};

export type OidcPluginOptions = {
  oidcOptions?: OidcOptions;
  openBrowser?: boolean;
  envFilePath?: string;
};

function openBrowser(url: string): void {
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

function oidcPlugin(
  options: OidcPluginOptions = getDefaultOidcPluginOptions()
): Plugin {
  if (!options.oidcOptions) {
    try {
      options.oidcOptions = getEnvOidcPluginOptions(options.envFilePath);
    } catch (error) {
      console.warn(
        "⚠️  [OIDC Auth] Plugin will be disabled due to configuration error"
      );
      return {
        name: "vite-plugin-oidc-auth",
        apply: () => false,
      };
    }
  }

  console.log(
    `⚙️  [OIDC Auth] Plugin initialized with auto-browser: ${
      options.openBrowser ? "enabled" : "disabled"
    }`
  );

  let server: ViteDevServer | null = null;

  return {
    name: "vite-plugin-oidc-auth",
    apply(_config, { command }) {
      return command === "serve";
    },

    config(config, { command }) {
      if (command !== "serve") return;

      if (!config.define) {
        config.define = {};
      }
      config.define["import.meta.env.VITE_API_TOKEN"] = JSON.stringify(
        process.env.VITE_API_TOKEN || null
      );
      return config;
    },

    configureServer(devServer: ViteDevServer) {
      server = devServer;
      const { port, hostname } = new URL(
        options.oidcOptions?.redirectUri || ""
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
                }
              );

              process.env.VITE_API_TOKEN = tokens.access_token;

              if (server && server.config.define) {
                server.config.define["import.meta.env.VITE_API_TOKEN"] =
                  JSON.stringify(tokens.access_token);
              }

              console.log("✅ [OIDC Auth] Access token obtained successfully!");
              console.log("🔑 [OIDC Auth] Token:", tokens.access_token);
              res.writeHead(200, { "Content-Type": "text/html" });
              res.end(
                "<h1>🎉 Authentication successful! You can close this window and return to your development environment.</h1>"
              );
            } catch (error) {
              console.error(
                "❌ [OIDC Auth] Error obtaining access token:",
                error
              );
              res.writeHead(500, { "Content-Type": "text/html" });
              res.end(
                "<h1>❌ Authentication failed. Please check the console for details.</h1>"
              );
            } finally {
              tempHttpServer.close();
            }
          } else {
            res
              .writeHead(400)
              .end("Bad Request: No authorization code received");
          }
        }
      ).listen(parseInt(port, 10), hostname, async () => {
        console.log(
          `🚀 [OIDC Auth] Starting authentication server on ${hostname}:${port}`
        );
        try {
          const discoveryUrl = new URL(options.oidcOptions?.discoveryUrl || "");
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

          codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);

          const authorizationUrl = client.buildAuthorizationUrl(config, {
            redirect_uri: options.oidcOptions?.redirectUri || "",
            scope: options.oidcOptions?.scope || "",
            code_challenge: codeChallenge,
            code_challenge_method: "S256",
          });

          console.log(
            `🔒 [OIDC Auth] Authentication URL generated successfully`
          );
          console.log(`🌐 [OIDC Auth] ${authorizationUrl.href}`);

          if (options.openBrowser) {
            console.log(`🚀 [OIDC Auth] Opening browser automatically...`);
            openBrowser(authorizationUrl.href);
          } else {
            console.log(
              `📋 [OIDC Auth] Please open the above URL in your browser to authenticate`
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

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `[OIDC Auth] Environment variable ${key} is not set. This plugin requires OIDC configuration in development mode.`
    );
  }
  return value;
}

function getEnvOidcPluginOptions(envFilePath?: string): OidcOptions {
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

function getDefaultOidcPluginOptions(): OidcPluginOptions {
  return {
    openBrowser: true,
  };
}

export default oidcPlugin;
