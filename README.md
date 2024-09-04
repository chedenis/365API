# 365API

## API Documentation

### Authentication Flow

#### 1. **Login/Register**

- When a user logs in or registers, they authenticate as a `ClubAuth`. Based on whether the club has been promoted, the system will return either a reference to a `PendingClub` or a `Club`.

- Upon successful login or registration, the API will return a JWT token, which must be used for all authenticated requests.

##### Example Response (Login/Register):

```json
{
  "_id": "clubAuthId123",
  "email": "club@example.com",
  "pendingClub": "pendingClubId123",
  "club": null, // If not promoted yet
  "token": "JWT_TOKEN" // Use this for authenticated requests
}
```

#### 2. **Using the JWT Token**

- Store the JWT token securely in your frontend (e.g., local storage or session storage).
- For all subsequent requests that require authentication, include the JWT token in the `Authorization` header.

##### Example Header:

```http
Authorization: Bearer JWT_TOKEN
```

---

### Club and PendingClub Routes

#### 1. **Read Own Club or PendingClub** (Authenticated)

- Route: `GET /read`
- This route retrieves the data of the authenticated club, whether it’s a `PendingClub` or a promoted `Club`.

##### Example Request:

```http
GET /read
Authorization: Bearer JWT_TOKEN
```

##### Example Response:

```json
{
  "_id": "pendingClubId123",
  "name": "My Pending Club",
  "email": "club@example.com",
  "status": "In Progress"
}
```

#### 2. **Read Any Club or PendingClub by ID** (Public)

- Route: `GET /read/:id`
- This route allows public access to read any club or pending club by providing its ID.

##### Example Request:

```http
GET /read/clubOrPendingClubId123
```

##### Example Response:

```json
{
  "_id": "clubId123",
  "name": "Club XYZ",
  "email": "contact@clubxyz.com",
  "location": "123 Main St, City",
  "status": "Active"
}
```

#### 3. **Create PendingClub** (Public)

- Route: `POST /create`
- This route is used to create a new `PendingClub` when a club registers.

##### Example Request:

```http
POST /create
Content-Type: application/json
{
  "name": "New Club",
  "email": "club@example.com",
  "status": "In Progress"
}
```

##### Example Response:

```json
{
  "message": "Pending club created successfully",
  "pendingClub": {
    "_id": "pendingClubId123",
    "name": "New Club",
    "email": "club@example.com"
  }
}
```

#### 4. **Update Club or PendingClub** (Authenticated)

- Route: `PUT /update`
- This route allows the authenticated club to update its own data (either a `PendingClub` or a promoted `Club`).

##### Example Request:

```http
PUT /update
Authorization: Bearer JWT_TOKEN
Content-Type: application/json
{
  "name": "Updated Club Name",
  "email": "updatedemail@example.com"
}
```

##### Example Response:

```json
{
  "message": "Club updated successfully",
  "club": {
    "_id": "clubId123",
    "name": "Updated Club Name",
    "email": "updatedemail@example.com"
  }
}
```

#### 5. **Promote PendingClub to Club** (Authenticated)

- Route: `POST /promote`
- When a club is ready to be promoted, this route promotes the `PendingClub` to a full `Club`, creates the `Club`, and updates the `ClubAuth` reference.

##### Example Request:

```http
POST /promote
Authorization: Bearer JWT_TOKEN
```

##### Example Response:

```json
{
  "message": "Pending Club promoted to Club successfully",
  "club": {
    "_id": "clubId123",
    "name": "Promoted Club",
    "email": "club@example.com"
  }
}
```

#### 6. **Delete Club or PendingClub** (Authenticated)

- Route: `DELETE /delete`
- This route allows the authenticated club to delete its own `PendingClub` or `Club`.

##### Example Request:

```http
DELETE /delete
Authorization: Bearer JWT_TOKEN
```

##### Example Response:

```json
{
  "message": "Club deleted successfully"
}
```

#### 7. **List All PendingClubs** (Restricted to Admin Users)

- Route: `GET /pending`
- This route lists all pending clubs. It is restricted to authorized users whose email addresses are listed in the environment variable `AUTHORIZED_EMAILS`.

##### Example Request:

```http
GET /pending
Authorization: Bearer JWT_TOKEN
```

##### Example Response:

```json
[
  {
    "_id": "pendingClubId123",
    "name": "Pending Club A",
    "email": "clubA@example.com",
    "status": "In Progress"
  },
  {
    "_id": "pendingClubId124",
    "name": "Pending Club B",
    "email": "clubB@example.com",
    "status": "Ready"
  }
]
```

#### 8. **List All Clubs** (Public)

- Route: `GET /clubs`
- This route allows public access to list all promoted clubs.

##### Example Request:

```http
GET /clubs
```

##### Example Response:

```json
[
  {
    "_id": "clubId123",
    "name": "Club XYZ",
    "email": "contact@clubxyz.com",
    "location": "123 Main St, City",
    "status": "Active"
  },
  {
    "_id": "clubId124",
    "name": "Club ABC",
    "email": "contact@clubabc.com",
    "location": "456 Elm St, City",
    "status": "Active"
  }
]
```

---

### Authentication Details

- All authenticated routes require a valid JWT token to be included in the `Authorization` header.
- Example format for authenticated requests:

```http
Authorization: Bearer JWT_TOKEN
```

---

### Environment Variables

- The `AUTHORIZED_EMAILS` environment variable stores the list of admin users allowed to list pending clubs. The format is a comma-separated string.

##### Example `.env` File:

```plaintext
PORT=5000
MONGO_URI=
JWT_SECRET=
MAPBOX_API_TOKEN=

# CORS configuration for development
DEV_CORS_ORIGINS=http://localhost:8081,http://10.0.2.2:8081,http://localhost:3001

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=

SESSION_SECRET=

AUTHORIZED_EMAILS=email2@example.com,email3@example.com

```

## Club Authentication Routes

### 1. **Register a Club (Local Strategy)**

#### Endpoint:

- **URL**: `/api/club-auth/register`
- **Method**: `POST`
- **Description**: Register a new club using email and password. This creates a new `ClubAuth` and a `PendingClub`.

#### Request Body:

```json
{
  "email": "club@example.com",
  "password": "Password123",
  "clubDetails": {
    "clubName": "New Club",
    "status": "Not Ready"
  }
}
```

- **email**: The email address for the club (used for login).
- **password**: The club’s password (will be hashed and stored securely).
- **clubDetails**: Initial details for the `PendingClub` (e.g., club name and status).

#### Response (Success):

```json
{
  "message": "Club registered successfully",
  "clubAuth": {
    "id": "newClubAuthId",
    "email": "club@example.com",
    "pendingClub": "pendingClubId123"
  }
}
```

- **message**: Confirmation message.
- **clubAuth**: The created `ClubAuth` with the `pendingClub` reference.

#### Response (Error):

```json
{
  "error": "Club with this email already exists"
}
```

---

### 2. **Login a Club (Local Strategy)**

#### Endpoint:

- **URL**: `/api/club-auth/login`
- **Method**: `POST`
- **Description**: Login a club using email and password. If successful, the club is authenticated, and the session is started.

#### Request Body:

```json
{
  "email": "club@example.com",
  "password": "Password123"
}
```

- **email**: The email address used to register the club.
- **password**: The club’s password.

#### Response (Success):

```json
{
  "message": "Club logged in successfully",
  "clubAuth": {
    "id": "clubAuthId123",
    "email": "club@example.com",
    "pendingClub": "pendingClubId123",
    "club": null // If the club is still pending
  }
}
```

- **message**: Confirmation message.
- **clubAuth**: The authenticated `ClubAuth` object, including the pending or promoted club.

#### Response (Error):

```json
{
  "error": "Invalid credentials"
}
```

---

### 3. **Google OAuth Login/Register**

#### Endpoint:

- **URL**: `/api/club-auth/google`
- **Method**: `GET`
- **Description**: Redirects the user to Google for OAuth login or registration.

#### Usage:

- Clicking on a "Login with Google" button will redirect the user to this endpoint.

#### Example (Frontend):

```javascript
const loginWithGoogle = () => {
  window.location.href = "/api/club-auth/google";
};
```

#### Callback Endpoint:

- **URL**: `/api/club-auth/google/callback`
- **Method**: `GET`
- **Description**: This is the endpoint that Google redirects back to after authentication. The backend handles this, and the user is logged in or registered.

---

### 4. **Facebook OAuth Login/Register**

#### Endpoint:

- **URL**: `/api/club-auth/facebook`
- **Method**: `GET`
- **Description**: Redirects the user to Facebook for OAuth login or registration.

#### Usage:

- Clicking on a "Login with Facebook" button will redirect the user to this endpoint.

#### Example (Frontend):

```javascript
const loginWithFacebook = () => {
  window.location.href = "/api/club-auth/facebook";
};
```

#### Callback Endpoint:

- **URL**: `/api/club-auth/facebook/callback`
- **Method**: `GET`
- **Description**: This is the endpoint that Facebook redirects back to after authentication. The backend handles this, and the user is logged in or registered.

---

### 5. **Logout a Club**

#### Endpoint:

- **URL**: `/api/club-auth/logout`
- **Method**: `GET`
- **Description**: Logs out the currently authenticated club.

#### Response (Success):

```json
{
  "message": "Logged out successfully"
}
```

---

### Session Management:

- **Session Persistence**: Passport handles the session after login, keeping the user logged in across requests until the session expires or the user logs out.
- **Session Expiration**: The session duration is configurable, typically set to expire after a certain period or when the browser is closed.

### Error Handling:

- The endpoints return proper error messages when registration or login fails, such as when a club already exists or when credentials are invalid.

---

### Example Workflow:

1. **Register**:

   - The user fills out the registration form (email, password, and club details) and submits it to the `/register` endpoint.
   - The club is created, and the user is logged in automatically.

2. **Login**:

   - The user enters their email and password to log in via the `/login` endpoint.
   - On successful login, the session starts, and the user is authenticated.

3. **Google/Facebook OAuth**:

   - The user clicks a "Login with Google/Facebook" button, which redirects them to the respective OAuth provider.
   - After authentication, the user is redirected back to your app and logged in or registered.

4. **Logout**:
   - The user clicks "Logout," which calls the `/logout` route to end the session.

---
