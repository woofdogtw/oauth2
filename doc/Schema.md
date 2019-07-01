# Schema - OAuth2

## User

    user: {
        userId: string,                 // (unique) user ID
        email: string,                  // (unique) E-mail address
        created: Date,                  // creation time
        validated: Date | null,         // validation time
        expired: Date | null,           // expired time to prevent malicious attack
        disabled: boolean,              // mark this account disabled
        roles: object,                  // roles with booleans
        password: string,               // hashed password
        salt: string,                   // salt for password hash
        name: string,                   // display name
        info: object                    // other information such as address, telephone number, ...
    }

## Client

    client: {
        id: string,                     // (unique) client ID
        created: Date,                  // creation time
        clientSecret: string,           // client secret
        redirectUris: string[],         // allowed redirect URIs
        scopes: string[] | null,        // allowed scopes. `null` means administrator client
        grants: string[],               // allowed grant types
        userId: string,                 // developer's user ID corresponding to the `user` collection
        name: string,                   // client name
        image: string                   // image URL
    }

## Authorization Code

    authCode: {
        code: string,                   // (unique) authorization code
        expiresAt: Date,                // expiration date time
        redirectUri: string,            // allowed redirect URIs
        scope: string,                  // (optional) authorized scope(s)
        client: {
            id: string,                 // client ID corresponding to `client` collection
        },
        user: {
            userId: string              // associated user ID corresponding to `users` collection
        }
    }

## Token

    token: {
        accessToken: string,            // (unique) access token
        accessTokenExpiresAt: Date,     // expiration date time
        refreshToken: string,           // (optional) refresh token
        refreshTokenExpiresAt: Date,    // (optional) expiration date time
        scope: string,                  // (optional) authorized scope(s)
        client: {
            id: string,                 // client ID corresponding to `client` collection
        },
        user: {
            userId: string              // associated user ID corresponding to `users` collection
        }
    }

## Access Token (for key-value DB)

    accessToken: {
        accessToken: string,            // (unique) access token
        accessTokenExpiresAt: Date,     // expiration date time
        scope: string,                  // (optional) authorized scope(s)
        client: {
            id: string,                 // client ID corresponding to `client` collection
        },
        user: {
            userId: string              // associated user ID corresponding to `users` collection
        }
    }

## Refresh Token (for key-value DB)

    refreshToken: {
        refreshToken: string,           // (unique) refresh token
        refreshTokenExpiresAt: Date,    // expiration date time
        scope: string,                  // (optional) authorized scope(s)
        client: {
            id: string,                 // client ID corresponding to `client` collection
        },
        user: {
            userId: string              // associated user ID corresponding to `users` collection
        }
    }
