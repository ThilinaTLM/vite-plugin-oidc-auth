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
  cacheFile?: string;
};

export type CachedTokenData = {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  token_type?: string;
}
