# vite-plugin-oidc-auth

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

Contributions are welcome! Please feel free to submit a Pull Request.
