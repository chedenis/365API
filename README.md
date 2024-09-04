# 365API

Here's the documentation for your API that you can add to your README file. It covers the login/registration flow, the use of JWT tokens, and the routes for managing `PendingClub` and `Club` entities.

---

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

---

This documentation should give a clear and structured view of how your API works, how to authenticate, and how to interact with `PendingClub` and `Club` resources. You can add this directly to your README file.

Let me know if you need further tweaks or adjustments!
