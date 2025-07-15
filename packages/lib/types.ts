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
