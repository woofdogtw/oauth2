# OAuth2 Server

This is an OAuth2 authentication server with login authentication and grant pages.

## Features

- Supports the following grant flows:
    - Authorization code grant flow.

- Support database:
    - MongoDB
    - SQLite

- Provides user authentication with browser.

- Provides APIs:
    - Form log-in/log-out.
    - User management.
    - Client management.

## Todo list

- Remove expired users, authorization codes, tokens.
- Cursor support for large paging.
- OAuth with PKCE.
- Official implicit grant flow support.
- Scope management.
- Configuration file support.

## Test

Please launch MongoDB before running tests.

    $ set NODE_ENV=test
    $ npm test

You can edit `configs/oauth2/test.json5` to change default configurations:

- `oauth2.db.mongodb.url`: **mongodb://localhost:27017**
- `oauth2.db.mongodb.db`: **oauth2\_test**
- `oauth2.db.sqlite3.path`: **oauth2\_test.db** in the source code root directory.
