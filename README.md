# vite-plugin-oidc-auth

[![CI](https://github.com/ThilinaTLM/vite-plugin-oidc-auth/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/ThilinaTLM/vite-plugin-oidc-auth/actions/workflows/ci.yml)
[![Release](https://github.com/ThilinaTLM/vite-plugin-oidc-auth/actions/workflows/release.yml/badge.svg)](https://github.com/ThilinaTLM/vite-plugin-oidc-auth/actions/workflows/release.yml)

A Vite plugin that provides OIDC (OpenID Connect) authentication during development. This plugin automatically handles the OAuth flow and injects the access token into your development environment.

## Features

- 🔐 Automatic OIDC authentication flow
- 🚀 Auto-opens browser for authentication (configurable)
- 🔑 Injects access token as `import.meta.env.VITE_API_TOKEN`
- ⚡ Development-only plugin (doesn't affect production builds)
- 🎯 PKCE support for secure authentication
- 📁 Flexible environment variable configuration

## Installation

```bash
npm install vite-plugin-oidc-auth
# or
yarn add vite-plugin-oidc-auth
# or
pnpm add vite-plugin-oidc-auth
```

## Usage

### Basic Setup

1. Add the plugin to your `vite.config.js`:

```js
import { defineConfig } from 'vite'
import oidcAuth from 'vite-plugin-oidc-auth'

export default defineConfig({
  plugins: [
    oidcAuth()
  ]
})
```

2. Create a `.env.local` file with your OIDC configuration:

```env
OIDC_DISCOVERY_URL=https://your-provider.com/.well-known/openid-configuration
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret
OIDC_REDIRECT_URI=http://localhost:3001/callback
OIDC_SCOPE=openid profile email
```

3. Start your development server:

```bash
npm run dev
```

The plugin will automatically open your browser to authenticate. After successful authentication, the access token will be available as `import.meta.env.VITE_API_TOKEN` in your application.

### Configuration Options

```js
import oidcAuth from 'vite-plugin-oidc-auth'

export default defineConfig({
  plugins: [
    oidcAuth({
      openBrowser: false, // Disable auto-opening browser
      envFilePath: '.env.development', // Custom env file path
      oidcOptions: {
        // Override environment variables
        discoveryUrl: 'https://custom-provider.com/.well-known/openid-configuration',
        clientId: 'custom-client-id',
        clientSecret: 'custom-client-secret',
        redirectUri: 'http://localhost:3001/callback',
        scope: 'openid profile email'
      }
    })
  ]
})
```

### Using the Token in Your App

```js
// Access the token in your application
const token = import.meta.env.VITE_API_TOKEN

// Use it in API calls
fetch('/api/data', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OIDC_DISCOVERY_URL` | Yes | OIDC discovery endpoint URL |
| `OIDC_CLIENT_ID` | Yes | OAuth client ID |
| `OIDC_CLIENT_SECRET` | Yes | OAuth client secret |
| `OIDC_REDIRECT_URI` | Yes | Redirect URI for OAuth callback |
| `OIDC_SCOPE` | Yes | OAuth scopes (e.g., "openid profile email") |

## How It Works

1. When you start the dev server, the plugin creates a temporary HTTP server on the redirect URI
2. It generates PKCE challenge codes for secure authentication
3. Opens your browser to the OIDC provider's authorization endpoint
4. After authentication, the provider redirects to the callback server
5. The plugin exchanges the authorization code for an access token
6. The token is injected into your Vite environment as `VITE_API_TOKEN`

## Development Mode Only

This plugin only runs during development (`vite dev`) and is automatically disabled for production builds. This ensures your authentication flow doesn't interfere with your production application.

## TypeScript Support

The plugin includes full TypeScript support with exported types:

```ts
import oidcAuth, { OidcOptions, OidcPluginOptions } from 'vite-plugin-oidc-auth'

const options: OidcPluginOptions = {
  openBrowser: true,
  oidcOptions: {
    discoveryUrl: 'https://provider.com/.well-known/openid-configuration',
    clientId: 'client-id',
    clientSecret: 'client-secret',
    redirectUri: 'http://localhost:3001/callback',
    scope: 'openid profile'
  }
}

export default defineConfig({
  plugins: [oidcAuth(options)]
})
```

## License

MIT

## Contributing

Contributions are welcome! Use Node.js 24 and pnpm 11.17.0, then run:

```bash
pnpm install --frozen-lockfile
pnpm check # formatting, lint, and TypeScript
pnpm test
pnpm build
```

CI runs these checks and an npm tarball smoke test on pull requests and pushes to `main`, with read-only repository permissions and no publishing credentials for PRs. Actions are SHA-pinned to reviewed stable releases, with weekly Dependabot updates for Actions. Workflow and release tooling changes have `@ThilinaTLM` as code owner.

Maintainers must configure GitHub protection externally: require **`Check, test, build, and package (Node 24)`** on `main`, require PR reviews and code-owner approval, and restrict creation, updates, and deletion of release tags to maintainers with a `v*` tag ruleset.

## Releases

Releases run from stable or prerelease SemVer tags, not pushes to `main`; `+build` metadata is not supported. Update `package.json` to an unpublished version, update the lockfile if needed, and merge the reviewed change after CI passes. The workflow requires the tagged commit to be in `main`'s history, and the tag without `v` must exactly match `package.json`'s version:

```bash
# From the reviewed main commit, after fetching/pulling latest changes:
git tag v1.2.3
git push origin v1.2.3
```

Use the actual package version in place of `1.2.3`. Stable tags (for example, `v1.2.3`) publish to npm's `latest` dist-tag; prereleases (for example, `v1.3.0-rc.1`) publish to `next`. The release workflow verifies the tag, runs `pnpm check`, `pnpm test`, and `pnpm build`, packs and smoke-tests the package, publishes the verified tarball with provenance, and attaches it to a GitHub release. Never move an already-published tag or reuse a published npm version.

### Maintainer setup: npm trusted publishing

Configure this externally before pushing a release tag; repository files alone cannot establish npm trust. Follow the current [npm trusted publisher documentation](https://docs.npmjs.com/trusted-publishers/). In the npm settings for `vite-plugin-oidc-auth`, add a GitHub Actions trusted publisher with:

| Setting | Value |
| --- | --- |
| Organization or user | `ThilinaTLM` |
| Repository | `vite-plugin-oidc-auth` |
| Workflow filename | `release.yml` (not the full path) |
| Environment name | Leave empty; the publishing job currently has no environment |
| Allowed actions | Explicitly allow **`npm publish`** for this automatic direct-publish workflow |

New configurations default to stage-only publishing as of September 3, 2026; that is insufficient for this workflow. Complete the first successful publish within **2 days** of creating the configuration, or delete the expired configuration and recreate it.

The workflow uses Node.js 24, npm **>= 11.5.1**, GitHub-hosted runners, and `id-token: write` for OIDC. Keep the repository and npm package public for provenance; self-hosted runners are not supported for trusted publishing. No `NPM_TOKEN` or `NODE_AUTH_TOKEN` secret is needed: npm exchanges the workflow's OIDC identity for short-lived credentials, and publication uses `--provenance --access public`.

If the package does not yet exist on npm, bootstrap its first publication manually with an authorized maintainer account and 2FA before configuring the package's trusted publisher; do not add a long-lived publishing token to CI. After verifying a successful OIDC release and its provenance on npm, select **Require two-factor authentication and disallow tokens** in npm's publishing access settings and revoke obsolete publishing tokens. If adding a GitHub environment later, update both the publishing job and npm's trusted publisher to use the exact same environment name.
