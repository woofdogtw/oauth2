API - OAuth2
============

## Contents

- [Notes](#notes)
- [Roles](#roles)
- [User session APIs](#session)
    - [`POST /api/session/login` Log in](#post_session_login)
    - [`POST /api/session/logout` Log out](#post_session_logout)
    - [`POST /api/session/refresh` Refresh token](#post_session_refresh)
- [User information APIs](#user)
    - [`GET /api/user` Get user information](#get_user)
    - [`PUT /api/user` Update user information](#put_user)
- [User administration APIs](#admin)
    - [`POST /api/user` Create user](#post_admin_user)
    - [`GET /api/user/count` User count](#get_admin_user_count)
    - [`GET /api/user/list` User list](#get_admin_user_list)
    - [`GET /api/user/{userId}` Get user information](#get_admin_user)
    - [`PUT /api/user/{userId}` Update user information](#put_admin_user)
    - [`DELETE /api/user/{userId}` Delete user](#delete_admin_user)
- [Client administration APIs](#client)
    - [`POST /api/client` Create client](#post_client)
    - [`GET /api/client/count` Client count](#get_client_count)
    - [`GET /api/client/list` Client list](#get_client_list)
    - [`GET /api/client/{clientId}` Get client information](#get_client)
    - [`PUT /api/client/{clientId}` Update client information](#put_client)
    - [`DELETE /api/client/{clientId}` Delete client](#delete_client)
    - [`DELETE /api/client/user/{userId}` Delete user clients](#delete_client_user)

## <a id="notes"></a>Notes

All user and client API requests must have a **Authorization** header with a **Bearer** token.

- **Example**

        GET /api/user HTTP/1.1
        Host: localhost
        Authorization: Bearer 766f29fa8691c81b749c0f316a7af4b7d303e45bf4000fe5829365d37caec2a4

All APIs may respond the following status codes:

- **200 OK**: The request is success.
- **400 Bad Request**: The API request has something wrong.
- **401 Unauthorized**: The access token is invalid or expired.
- **403 Forbidden**: The user does not have the permission to operate APIs.
- **500 Internal Server Error**: The server is crash or get an unknown error. You should respond to the system administrators to solve the problem.
- **503 Service Unavailable**: The server has something wrong. Please try again later.

All error responses have the following parameters in JSON format string:

- *string* `code`: The error code.
- *string* `message`: The error message.

- **Example**

        HTTP/1.1 401 Unauthorized
        Access-Control-Allow-Origin: *
        Content-Type: application/json; charset=utf-8
        Content-Length: 67
        ETag: W/"43-Npr+dy47IJFtraEIw6D8mYLw7Ws"
        Date: Sun, 13 Jan 2019 07:46:09 GMT
        Connection: keep-alive

        {"code":"EAUTH","message":"Invalid token: access token is invalid"}

## <a id="roles"></a>Roles

Only three roles are used in this system:

- `admin`: The system administrator.
- `manager`: The system manager who can manage users' information.
- `dev`: The 3rd party developer.

# <a id="session"></a>User session APIs

## <a id="post_session_login"></a>Log in

Log in the system and get the access token.

    POST /api/session/login

#### Additional HTTP Headers

    Content-Type: application/x-www-form-urlencoded

#### Parameters

- *string* `username`: User name.
- *string* `password`: User password.

- **Example**

        username=test&
        password=pass

#### Response

- **200 OK**: The access token. Parameters are:

    - *string* `accessToken`: The access token.
    - *string* `refreshToken`: The refresh token.

    - **Example**

            {
                "accessToken": "766f29fa8691c81b749c0f316a7af4b7d303e45bf4000fe5829365d37caec2a4",
                "refreshToken": "d40dcfb59880f84a153678fe4f62ecada57a8e61efdafb5e5a351fe59db69619"
            }

- **400, 401, 500, 503**: See [Notes](#notes).

## <a id="post_session_logout"></a>Log out

Log out the system.

    POST /api/session/logout

- **200 OK**: (No content)
- **401, 500, 503**: See [Notes](#notes).

## <a id="post_session_refresh"></a>Refresh token

Refresh the access token.

    POST /api/session/refresh

#### Additional HTTP Headers

    Content-Type: application/json

#### Parameters

- *string* `refreshToken`: The refresh token.

- **Example**

        { "refreshToken": "d40dcfb59880f84a153678fe4f62ecada57a8e61efdafb5e5a351fe59db69619" }

#### Response

- **200 OK**: The new access token. Parameters are:

    - *string* `accessToken`: The access token.
    - *string* `refreshToken`: The refresh token.

    - **Example**

            {
                "accessToken": "b811163bd4b64a875d0468e7a8c0ee64679d50b2d740fb896dfd896ed8426a88",
                "refreshToken": "afaac0c9aa128b7cb302922f88abe7c148f802e183cc58c709963384f2cd361d"
            }

- **400, 401, 500, 503**: See [Notes](#notes).

# <a id="user"></a>User information APIs

These APIs can be used by all users.

## <a id="get_user"></a>Get user information

Get user self information.

    GET /api/user

#### Response

- **200 OK**: User information. Parameters are:

    - *string* `userId`: User ID.
    - *string* `email`: User's E-mail address.
    - *string* `created`: Creation time in ISO 8601 format.
    - *string | null* `validated`: Validation time in ISO 8601 format.
    - *object* `roles`: (**present for special roles**) Roles.
    - *string* `name`: Display name.
    - *object* `info`: Other information.

    - **Example**

            {
                "userId": "1546309427053-c2e84RJO",
                "email": "michael-johnson@example.com",
                "created": "2018-12-31T03:26:28.987Z",
                "validated": "2019-01-01T02:26:52.210Z",
                "roles": {
                    "developer": true
                },
                "name": "Michael",
                "info": {
                    "firstName": "Michael",
                    "lastName": "Johnson",
                    "phoneNumber": "0987654321"
                }
            }

- **401, 500, 503**: See [Notes](#notes).

## <a id="put_user"></a>Update user information

Update user self information.

    PUT /api/user

#### Additional HTTP Headers

    Content-Type: application/json; charset=utf-8

#### Parameters

- *string* `password`: (**optional**) User password.
- *string* `name`: (**optional**) The display name.
- *object* `info`: (**optional**) Other information.

- **Note**: You must give at least one parameter.

- **Example**

        {
            "name": "Michael",
            "info": {
                "firstName": "Michael",
                "lastName": "Johnson",
                "address": "123, abc road, def city",
                "phoneNumber": "123456"
            }
        }

#### Response

- **200 OK**: (No content)
- **400, 401, 500, 503**: See [Notes](#notes).

# <a id="admin"></a>User administration APIs

These APIs can be used by system administrators only, for managers except:

- `GET /api/user/count`
- `GET /api/user/list`
- `GET /api/user/{userId}`
- `PUT /api/user/{productId}`: (limited)

## <a id="post_admin_user"></a>Create user

Create a user.

    POST /api/user

#### Additional HTTP Headers

    Content-Type: application/json; charset=utf-8

#### Parameters

- *string* `email`: User's E-mail address.
- *string* `password`: Password.
- *string* `name`: (**optional**) Display name.
- *object* `info`: (**optional**) Other information.

- **Example**

    {
        "email": "michael-johnson@example.com",
        "password": "p@ssw0rD",
        "name": "Michael",
        "info": {
            "firstName": "Michael",
            "lastName": "Johnson",
            "phoneNumber": "0987654321"
        }
    }

#### Response

- **200 OK**: The user ID. Parameters are:

    - *string* `userId`: The ID of the created user.

    - **Example**

            { "userId": "1546309427053-c2e84RJO" }

- **400, 401, 403, 500, 503**: See [Notes](#notes).

## <a id="get_admin_user_count"></a>User count

Get user list count.

    GET /api/user/count?
        email={specifiedEmail}&
        contains={word}

- *string* `email`: (**optional**) To search the account of the specified E-mail address. This is case insensitive and excludes **contains**.
- *string* `contains`: (**optional**) To search accounts that contain the specified word. This is case insensitive.

#### Response

- **200 OK**: User list count. Parameters are:

    - *number* `count`: User list count.

    - **Example**

            { "count": 2 }

- **401, 403, 500, 503**: See [Notes](#notes).

## <a id="get_admin_user_list"></a>User list

Get user list.

    GET /api/user/list?
        num={numberOfPage}&
        p={page}&
        email={specifiedEmail}&
        contains={word}&
        fields={displayFields}&
        sort={sortKeysAndOrders}

- *number* `num`: (**optional**) Number of items to list in each page. Default is **100**.
- *number* `p`: (**optional**) Page number. **0** to list all items. Positive number to list items page by page. Default is **1**.
- *string* `email`: (**optional**) To search the account of the specified E-mail address. This is case insensitive and excludes **contains**.
- *string* `contains`: (**optional**) To search accounts that contain the specified word. This is case insensitive.
- *string* `fields`: (**optional**) To display more data fields with comma separated format. **expired**, **disabled** can be used. For example, `fields=expired,disabled`.
- *string* `sort`: (**optional**) To sort the result. Format is `key:<asc|desc>`. The key can be **email**, **created**, **validated**, **name**. Default is **email:asc**.

#### Response

- **200 OK**: An empty array or an array that contains all users' information. Parameters are:

    - *string* `userId`: User ID.
    - *string* `email`: User's E-mail address.
    - *string* `created`: Creation time in ISO 8601 format.
    - *string | null* `validated`: Validation time in ISO 8601 format.
    - *string | null* `expired`: (**optional**) Expired time in ISO 8601 format.
    - *boolean* `disabled`: (**optional**) This account is disabled.
    - *object* `roles`: Roles.
    - *string* `name`: Display name.
    - *object* `info`: Other information.

    - **Example**

            [
                {
                    "userId": "1546226788987-x51FTVPD",
                    "email": "admin@example.com",
                    "created": "2018-12-31T03:26:28.987Z",
                    "validated": "2018-12-31T09:43:12.237Z",
                    "expired": null,
                    "disabled": false,
                    "roles": {
                        "admin": true
                    },
                    "name": "System administrator",
                    "info": {
                        "phoneNumber": "1234567890"
                    }
                },
                {
                    "userId": "1546309427053-c2e84RJO",
                    "email": "michael-johnson@example.com",
                    "created": "2019-01-01T02:23:47.053Z",
                    "validated": "2019-01-01T02:26:52.210Z",
                    "expired": null,
                    "disabled": false,
                    "roles": {},
                    "name": "Michael",
                    "info": {
                        "firstName": "Michael",
                        "lastName": "Johnson",
                        "phoneNumber": "0987654321"
                    }
                }
            ]

- **400, 401, 403, 500, 503**: See [Notes](#notes).

## <a id="get_admin_user"></a>Get user information

Get the specified user information.

    GET /api/user/{userId}

- *string* `userId`: The specified user ID to get user information.

#### Response

- **200 OK**: User information. Parameters are:

    - *string* `userId`: User ID that is associated with the access token.
    - *string* `email`: User's E-mail address.
    - *string* `created`: Creation time.
    - *string | null* `validated`: Validation time.
    - *string | null* `expired`: Expired time.
    - *boolean* `disabled`: This account is disabled.
    - *object* `roles`: Roles.
    - *string* `name`: Display name.
    - *object* `info`: Other information.

    - **Example**

            {
                "userId": "1546309427053-c2e84RJO",
                "email": "michael-johnson@example.com",
                "created": "2019-01-01T02:23:47.053Z",
                "validated": "2019-01-01T02:26:52.210Z",
                "expired": null,
                "disabled": false,
                "roles": {},
                "name": "Michael",
                "info": {
                    "firstName": "Michael",
                    "lastName": "Johnson",
                    "phoneNumber": "0987654321"
                }
            }

- **401, 403, 500, 503**: See [Notes](#notes).
- **404 Not Found**: The specified user does not exist.

## <a id="put_admin_user"></a>Update user information

Update the specified user information.

    PUT /api/user/{userId}

- *string* `userId`: The specified user ID to update user information.

#### Additional HTTP Headers

    Content-Type: application/json; charset=utf-8

#### Parameters

- *string* `validated`: (**optional for admin**) The validation date time in ISO 8601 format. The **expired** field will be set to **null**.
- *boolean* `disabled`: (**optional**) **true** to disable the user and **false** to enable the user.
- *object* `roles`: (**optional**) Roles. The content must be booleans.
- *string* `password`: (**optional for admin**) User password.
- *string* `name`: (**optional for admin**) The display name.
- *object* `info`: (**optional for admin**) Other information. You must provide full of fields, or all fields will be replaced with the new value.

- **Note**: You must give at least one parameter.

- **Example**

        {
            "roles": {
                "developer": true
            }
            "info": {
                "firstName": "Michael",
                "lastName": "Johnson",
                "address": "123, abc road, def city",
                "phoneNumber": "123456"
            }
        }

#### Response

- **200 OK**: (No content)
- **400, 401, 403, 500, 503**: See [Notes](#notes).
- **404 Not Found**: The specified user does not exist.

## <a id="delete_admin_user"></a>Delete user

Delete a user.

    DELETE /api/user/{userId}

- *string* `userId`: The specified user ID to delete.

#### Response

- **200 OK**: (No content)
- **401, 403, 500, 503**: See [Notes](#notes).
- **404 Not Found**: The specified user does not exist.

# <a id="client"></a>Client administration APIs

These APIs can be used by system administrators and developers only except:

- `DELETE /api/client/user/{userId}`: for administrators.

## <a id="post_client"></a>Create client

Create a client.

    POST /api/client

#### Additional HTTP Headers

    Content-Type: application/json; charset=utf-8

#### Parameters

- *string[]* `redirectUris`: Allowed redirect URIs.
- *string[]* `scopes`: Allowed scopes.
- *string[]* `grants`: Allowed grants. Default only **authorization\_code** and **refresh\_token** are allowed.
    - `authorization_code`: To allow this client to use authorization code grant flow.
    - `password`: To allow this client to use resource owner password credentials grant flow.
    - `client_credentials`: To allow this client to use client credentials grant flow.
    - `refresh_token`: To allow this client to refresh tokens.
- *string* `userId`: (**optional for administrators**) Assign to the specified user.
- *string* `name`: Client name.
- *string* `image`: (**optional**) The URI of the client icon.

#### Response

- **200 OK**: The client ID. Parameters are:

    - *string* `clientId`: The ID of the created client.

    - **Example**

            { "clientId": "1546346328318-zyAnDK9I" }

- **400, 401, 403, 500, 503**: See [Notes](#notes).

## <a id="get_client_count"></a>Client count

Get client list count.

    GET /api/client/count?
        user={userId}

- *string* `user`: (**optional for administrators**) The specified user ID.

- **Note**: Administrators can get all clients and developers can only get their own clients.

#### Response

- **200 OK**: Client list count. Parameters are:

    - *number* `count`: Client list count.

    - **Example**

            { "count": 2 }

- **401, 403, 500, 503**: See [Notes](#notes).

## <a id="get_client_list"></a>Client list

Get client list.

    GET /api/client/list?
        user={userId}&
        num={numberOfPage}&
        p={page}

- *string* `user`: (**optional for administrators**) The specified user ID.
- *number* `num`: (**optional**) Number of items to list in each page. Default is **100**.
- *number* `p`: (**optional**) Page number. **0** to list all items. Positive number to list items page by page. Default is **1**.

- **Note**: Administrators can get all clients and developers can only get their own clients.

#### Response

- **200 OK**: An empty array or an array that contains all clients' information. Parameters are:

    - *string* `id`: Client ID.
    - *string* `created`: Creation time in ISO 8601 format.
    - *string* `clientSecret`: Client secret.
    - *string[]* `redirectUris`: Allowed redirect URIs.
    - *string[] | null* `scopes`: Allowed scopes. **null** means that authorization is useless for this client and this kind of clients cannot be added by RESTful APIs.
    - *string[]* `grants`: Allowed grants.
    - *string* `userId`: (**optional for administrators**) User ID that is associated with the client.
    - *string* `name`: Client name.
    - *string* `image`: The URI of the client icon.

    - **Example**

            [
                {
                    "id": "1546346328318-zyAnDK9I",
                    "created": "2019-01-01T12:38:48.318Z",
                    "clientSecret": "G3LCtKsJvB3nrkA4CnIH3IUVF+BKMHXHTXbzgNF6REU",
                    "redirectUris": [ "https://localhost/oauth2/desktop" ],
                    "scopes": [ "user.rw", "client.rw" ],
                    "grants": [ "authorization_code", "refresh_token" ],
                    "name": "OAuth2 App",
                    "image": "https://localhost/oauth2/app.png"
                },
                {
                    "id": "1546347862366-1HTBqdPg",
                    "created": "2019-01-01T13:04:22.366Z",
                    "clientSecret": "MRSNwW+N8txpLNlvGo2urUFdZZZKSgUZhbN/dx04SWg",
                    "redirectUris": [ "https://exmaple.com/oauth2/redirect/uri" ],
                    "scopes": [ "user.rw", "client.rw" ],
                    "grants": [ "client_credentials" ],
                    "name": "OAuth2 Web",
                    "image": "https://example.com/oauth2/web.png"
                }
            ]

- **400, 401, 403, 500, 503**: See [Notes](#notes).

## <a id="get_client"></a>Get client information

Get the specified client information.

    GET /api/client/{clientId}

- *string* `clientId`: The specified client ID to get client information.

#### Response

- **200 OK**: An object that contains the client information. See [Client administration APIs - Client list](#get_client_list).
- **401, 403, 500, 503**: See [Notes](#notes).
- **404 Not Found**: The specified client does not exist.

## <a id="put_client"></a>Update client information

Update the specified client information.

    PUT /api/client/{clientId}

- *string* `clientId`: The specified client ID to update client information.

#### Additional HTTP Headers

    Content-Type: application/json; charset=utf-8

#### Parameters

- *string* `clientSecret`: (**optional**) Client secret.
- *string[]* `redirectUris`: (**optional**) Allowed redirect URIs.
- *string[]* `scopes`: (**optional**) Allowed scopes.
- *string* `name`: (**optional**) Client name.
- *string* `image`: (**optional**) The URI of the client icon.

- **Note**: You must give at least one parameter.

- **Example**

        { "name": "New client name" }

#### Response

- **200 OK**: (No content)
- **400, 401, 403, 500, 503**: See [Notes](#notes).
- **404 Not Found**: The specified client does not exist.

## <a id="delete_client"></a>Delete client

Delete a client.

    DELETE /api/client/{clientId}

- *string* `clientId`: The specified client ID to delete.

#### Response

- **200 OK**: (No content)
- **401, 403, 500, 503**: See [Notes](#notes).
- **404 Not Found**: The specified client does not exist.

## <a id="delete_client_user"></a>Delete user clients

Delete all clients of the specified user.

    DELETE /api/client/user/{userId}

- *string* `userId`: The specified user ID.

#### Response

- **200 OK**: (No content)
- **401, 403, 500, 503**: See [Notes](#notes).
- **404 Not Found**: The specified user does not exist.
