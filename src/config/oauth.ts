import { OAuth2Client } from 'google-auth-library';

class OAuthConfig {
    static GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

    private client;

    constructor() {
        if (!OAuthConfig.GOOGLE_CLIENT_ID) {
            throw new Error('GOOGLE_CLIENT_ID is not defined in environment variables');
        }

        this.client = new OAuth2Client(OAuthConfig.GOOGLE_CLIENT_ID);
    }

    getClient = () => {
        return this.client;
    }
}

export const oauthConfig = new OAuthConfig();