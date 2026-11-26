[Internship_Tracker_Backend_README_Updated.md](https://github.com/user-attachments/files/35446313/Internship_Tracker_Backend_README_Updated.md)
# Internship Tracker — Backend API Reference

This README documents the Express/Mongoose API used by the Internship Tracker frontend. It is based on the endpoints and controller implementations shared during development. **Check the sections marked _Verify in code_ before treating this document as a complete API contract.**

## Quick start

Requests and responses use JSON (`Content-Type: application/json`). Most endpoints require a Bearer JWT:

```http
Authorization: Bearer <JWT_FROM_LOGIN>
```

The JWT is returned by login and, based on the current backend configuration, expires after the configured `TOKEN_LIFETIME` (previously 1 hour by default). The authenticated user is taken from the JWT, **not** from the request body. Users may access only their own applications and contacts.

### Frontend fetch helper

```js
const API_BASE = import.meta.env.VITE_API_BASE_URL;

export async function apiFetch(path, { token, ...options } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error || body?.message || `HTTP ${response.status}`);
  }
  return body;
}

// Example (API_BASE already ends with /api):
// const stats = await apiFetch('/applications/stats', { token });
```

Store the token securely for your app's design and clear it on logout or authentication failure. The fetch helper above is a minimal example, not a complete auth/session implementation.

## Endpoint overview

| Method | Path | Purpose | Auth |
|---|---|---|---|
| `GET` | `/api/ping` | API connectivity check | No |
| `POST` | `/api/auth/register` | Register a user | No |
| `POST` | `/api/auth/login` | Login and obtain JWT | No |
| `GET` | `/api/auth/me` | Get authenticated identity **(verify mounted route)** | Yes |
| `GET` | `/api/auth/verify-email` | Confirm registration email using a token | No |
| `POST` | `/api/auth/resend-verification` | Request a replacement email verification link | No |
| `POST` | `/api/auth/forgot-password` | Request a password-reset email | No |
| `POST` | `/api/auth/reset-password` | Change password using a valid reset token | No |
| `GET` | `/api/applications` | List, search, filter, sort and paginate applications | Yes |
| `POST` | `/api/applications` | Create application | Yes |
| `GET` | `/api/applications/stats` | Dashboard application counts | Yes |
| `GET` | `/api/applications/recent` | Dashboard recent applications | Yes |
| `GET` | `/api/applications/:id` | Get one application | Yes |
| `PATCH` | `/api/applications/:id` | Update application | Yes |
| `DELETE` | `/api/applications/:id` | Delete application and its related contacts | Yes |
| `GET` | `/api/applications/:id/contacts` | List contacts for one application | Yes |
| `POST` | `/api/applications/:id/contacts` | Create a contact for one application | Yes |
| `GET` | `/api/contacts` | Global searchable contact directory | Yes |
| `GET` | `/api/dashboard/followups` | Next upcoming contact follow-ups | Yes |
| `GET` | `/api/resources` | List shared career resources; optional category filtering and keyword search | Yes |

**Additional routes:** User-profile endpoints, single-contact update/delete endpoints, company endpoints, internship-offer endpoints, and other auth actions are **not fully verified** from the files provided. See [Routes requiring confirmation](#routes-requiring-confirmation); do not assume paths or payloads until checked.

## Authentication

The backend uses JWT authentication for protected endpoints. Registration creates an account with `IsVerified: false`; the user must verify their email before receiving a login JWT. Transactional emails are sent through Resend.

### Register — `POST /api/auth/register`

Creates an account and sends a verification email. Required JSON body fields are `firstName`, `lastName`, `login`, `email`, and `password`; optional fields are `degree`, `major`, and `graduationYear`. Field names in requests are lowercase/camelCase, while the MongoDB user model uses capitalized names.

```json
{
  "firstName": "Test",
  "lastName": "Student",
  "login": "teststudent01",
  "email": "student@example.com",
  "password": "ExamplePassword123!",
  "degree": "BS",
  "major": "Computer Science",
  "graduationYear": 2027
}
```

The backend hashes the password using the User model's bcrypt pre-save hook, generates a random verification token, saves its SHA-256 hash and a 24-hour expiration, and sends a verification link using Resend.

**Successful response — `201 Created`:**

```json
{
  "message": "User registered. Email verification is required.",
  "user": {
    "id": "<user id>",
    "firstName": "Test",
    "lastName": "Student",
    "email": "student@example.com",
    "isVerified": false
  }
}
```

Missing required fields return `400`; an existing username or email returns `409`. Passwords and verification token hashes must not be included in responses.

### Verify email — `GET /api/auth/verify-email`

Public endpoint. Accepts a `token` query parameter containing the 64-character hexadecimal token from the registration email.

```http
GET /api/auth/verify-email?token=<VERIFICATION_TOKEN>
```

**Success — `200 OK`:**

```json
{
  "message": "Email verified successfully"
}
```

A valid, unexpired token sets `IsVerified` to `true` and removes the stored token hash and expiration. An invalid, expired, or already used token returns `400`:

```json
{
  "error": "Verification link is invalid or expired"
}
```

### Resend verification — `POST /api/auth/resend-verification`

Public endpoint for an account that has not yet verified its email. The new link expires after 24 hours and replaces the previous token.

**Request body:**

```json
{
  "email": "student@example.com"
}
```

**Response — `200 OK`:**

```json
{
  "message": "If this email has an unverified account, a verification link will be sent."
}
```

This response is also returned when no matching unverified account exists, so the endpoint does not explicitly disclose account status. Missing or blank email returns `400`.

### Login — `POST /api/auth/login`

Accepts a username **or** email in `login`, and a password in `password`.

```json
{
  "login": "teststudent01",
  "password": "ExamplePassword123!"
}
```

The backend first checks the username/email and password, then checks `IsVerified` before issuing a JWT. Success returns `200` with `message: "Login successful"`, a `token`, and the user object (with the password omitted). Unknown users or incorrect passwords return `401` with `Invalid login or password`.

If credentials are valid but the email is not verified, the endpoint returns **`403 Forbidden`**:

```json
{
  "error": "Please verify your email before logging in."
}
```

### Authenticated user — `GET /api/auth/me` (verify in code)

Requires a Bearer JWT. Returns the authenticated user, subject to the route being mounted in the current deployment.

## Password Recovery

Password recovery uses temporary reset tokens sent through Resend. The password-reset token is separate from the email verification token and expires **15 minutes** after issuance.

### Forgot password — `POST /api/auth/forgot-password`

Public endpoint. Send the registered email address:

```json
{
  "email": "student@example.com"
}
```

**Response — `200 OK`:**

```json
{
  "message": "If an account exists with this email, a password reset link will be sent."
}
```

For an existing account, the backend generates a random token, stores its SHA-256 hash and 15-minute expiration, and emails a link to the frontend's `/reset-password` page. The same public response is used when the account is not found. A missing or blank email returns `400`.

### Reset password — `POST /api/auth/reset-password`

Public endpoint. Submit the raw token from the password-reset email and a new password of at least eight characters:

```json
{
  "token": "<RESET_TOKEN>",
  "newPassword": "NewExamplePassword123!"
}
```

**Success — `200 OK`:**

```json
{
  "message": "Password reset successfully"
}
```

On success, the existing bcrypt pre-save hook hashes the new password, and the stored password-reset token and expiration are removed. The old password no longer works; subsequent login uses the new password. Reusing an already consumed or expired token returns `400`:

```json
{
  "error": "Password reset link is invalid or expired"
}
```

Malformed tokens or passwords shorter than eight characters also return `400`. The current implementation permits setting a password equal to the existing password.

## Resend Email Configuration

The backend sends account-verification and password-reset messages through `services/sendEmail.js`, using a separate sending-only Resend API key. Existing inbound email forwarding uses `services/resendClient.js` and its own configuration.

**Backend environment variables** (example values only):

```dotenv
RESEND_SENDING_API_KEY=re_your_sending_key
EMAIL_FROM="Internship Tracker <no-reply@mail.lamp.alugo.org>"
FRONTEND_URL=http://localhost:5173
```

`FRONTEND_URL` must be the actual reachable React application URL in a deployed environment. Email links use `/verify-email?token=...` and `/reset-password?token=...`. The separate inbound integration may also use `RESEND_API_KEY` and `RESEND_WEBHOOK_SECRET`. Never commit `.env` or API credentials to Git, and never expose Resend keys in the React frontend.

### Frontend integration notes

| Page / action | Backend request | Required behavior |
|---|---|---|
| Registration | `POST /api/auth/register` | Show a prompt to check the user's email |
| Login | `POST /api/auth/login` | Handle the `403` unverified-email response |
| Verify email page | `GET /api/auth/verify-email?token=...` | Read token from URL, call API, display result |
| Resend verification | `POST /api/auth/resend-verification` | Send `{ "email": "..." }` |
| Forgot password | `POST /api/auth/forgot-password` | Send `{ "email": "..." }` and display generic confirmation |
| Reset password page | `POST /api/auth/reset-password` | Read token from URL, send `token` and `newPassword` |

The frontend should use `URLSearchParams` to encode query parameters, and should not require a JWT for these verification/recovery endpoints. The verification and reset URLs in outgoing emails point to React pages, **not** directly to the API endpoints.

## Applications

### Application fields

| Field | Type | Notes |
|---|---|---|
| `_id` | MongoDB ObjectId/string | Server-generated identifier |
| `UserId` | ObjectId | **Server derives from JWT; do not send** |
| `Company` | string | Required; company name retained alongside optional reference |
| `CompanyId` | ObjectId | Optional company reference in model; **not currently included in `ALLOWED_FIELDS`**, so application create/update requests will ignore it until controller is changed |
| `Role` | string | Required |
| `Location` | string | Optional |
| `Status` | string | `Applied`, `Interviewing`, `Offer`, `Rejected`, `Withdrawn`; default `Applied` |
| `SalaryHourly` | number | Optional; must be >= 0 |
| `DateApplied` | string | Optional; format `YYYY-MM-DD` |
| `JobLink` | string | Optional |
| `Notes` | string | Optional |
| `LastUpdated` | Date/ISO timestamp | Automatically managed by Mongoose after timestamps change; **legacy seed data may contain `YYYY-MM-DD` strings** |

### Create — `POST /api/applications`

```json
{
  "Company": "Google",
  "Role": "Software Engineering Intern",
  "Location": "Mountain View, CA",
  "Status": "Applied",
  "SalaryHourly": 45,
  "DateApplied": "2026-11-12",
  "JobLink": "https://careers.google.com/",
  "Notes": "Applied on careers page"
}
```

- Returns **`201 Created`** with the newly created application document.
- `Company` and `Role` are required.
- `UserId` is assigned by the backend. Do not supply it.

### List/search/filter — `GET /api/applications`

Response shape from the shared controller:

```json
{
  "data": ["<application documents>"],
  "page": 1,
  "limit": 20,
  "total": 12,
  "totalPages": 1
}
```

Query parameters:

| Query | Meaning | Example |
|---|---|---|
| `q` | Partial case-insensitive search in Company, Role, Location, Notes | `?q=engineer` |
| `status` | Comma-separated statuses | `?status=Applied,Interviewing` |
| `company` | Partial company match | `?company=Google` |
| `location` | Partial location match | `?location=Orlando` |
| `minSalary`, `maxSalary` | Hourly pay bounds | `?minSalary=20&maxSalary=50` |
| `appliedFrom`, `appliedTo` | Inclusive `YYYY-MM-DD` bounds | `?appliedFrom=2026-11-01` |
| `sortBy` | `Company`, `Role`, `Status`, `SalaryHourly`, `DateApplied`, `LastUpdated` | `?sortBy=DateApplied` |
| `order` | `asc` or `desc` (default desc) | `?order=asc` |
| `page` | Page number (default 1) | `?page=2` |
| `limit` | Items per page (default 20; max 100) | `?limit=10` |

Filters can be combined, e.g. `/api/applications?status=Interviewing&sortBy=DateApplied&order=desc&page=1&limit=10`.

### Get one — `GET /api/applications/:id`

Returns the application document, or `404` if no owned application has the specified ID. Invalid IDs return `400`.

### Update — `PATCH /api/applications/:id`

Send only the fields you want to modify:

```json
{
  "Status": "Interviewing",
  "Notes": "Technical interview booked"
}
```

Returns the updated application document. Current controller allows only `Company`, `Role`, `Location`, `Status`, `SalaryHourly`, `DateApplied`, `JobLink`, `Notes` to be changed. `LastUpdated` is managed by timestamps; `UserId` cannot be supplied.

### Delete — `DELETE /api/applications/:id`

Removes the user's application **and contacts linked to it** in the current controller. Example response:

```json
{
  "message": "Application deleted.",
  "id": "<application id>",
  "contactsDeleted": 2
}
```

**Current limitation:** This is not a MongoDB cascade-delete constraint or a transaction. Company and internship-offer cleanup is not yet confirmed as part of this operation. The frontend should not assume those records are also removed.

## Dashboard

### Application statistics — `GET /api/applications/stats`

```json
{
  "totalApplications": 12,
  "interviewing": 3,
  "offers": 1,
  "applicationsByStatus": {
    "Applied": 6,
    "Interviewing": 3,
    "Offer": 1,
    "Rejected": 1,
    "Withdrawn": 1
  }
}
```

Counts applications belonging to the authenticated user, grouped by application `Status`. The `offers` count currently uses applications with `Status: "Offer"`; it is **not** a count of documents in the separate `Internships_offers` collection. All status keys should be present, including statuses with zero applications.

### Recent applications — `GET /api/applications/recent`

Returns up to five of the current user's applications, ordered by `LastUpdated` descending.

```json
{
  "data": ["<application documents>"],
  "count": 2
}
```

**Data note:** Mixed string and Date values in old `LastUpdated` records should be migrated before assuming sorting is chronologically correct.

### Upcoming follow-ups — `GET /api/dashboard/followups`

Returns up to five contacts with `NextFollowUp` on or after today's UTC date, ordered by nearest follow-up date first.

```json
{
  "data": ["<contact documents>"],
  "count": 2
}
```

`NextFollowUp` is a `YYYY-MM-DD` string. As currently planned, overdue follow-ups are **excluded** rather than appearing as overdue items. This endpoint uses UTC for the definition of “today”; consider user time zones for production behavior.

## Contacts

Contacts belong to users and currently require an `ApplicationId`. The same contact data is available through an application-specific view and a global directory.

### Contact fields

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId/string | Server-generated |
| `UserId` | ObjectId | From JWT; not client-controlled |
| `ApplicationId` | ObjectId | Required; supplied by nested application URL |
| `CompanyId` | ObjectId | Optional company reference, if accepted by the current contact controller |
| `Name` | string | Required |
| `Role` | string | Optional |
| `Company` | string | Optional company name retained in schema |
| `Email` | string | Optional; lowercase, validated |
| `Phone` | string | Optional |
| `NextFollowUp` | string | Optional; `YYYY-MM-DD` |
| `LastUpdated` | Date/ISO timestamp | Maintained automatically by Mongoose timestamps for newer writes |

### List for an application — `GET /api/applications/:id/contacts`

Gets contacts associated with the given application. **Verify the exact response envelope** against `contactController.js` (it may differ from the global contacts response).

### Create under an application — `POST /api/applications/:id/contacts`

```json
{
  "Name": "Taylor Smith",
  "Role": "University Recruiter",
  "Company": "Google",
  "Email": "taylor@example.com",
  "Phone": "650-555-0100",
  "NextFollowUp": "2026-11-20"
}
```

`ApplicationId` comes from the URL; `UserId` comes from the verified JWT. **Verify whether this controller accepts `CompanyId` and the precise response shape.**

### Global directory — `GET /api/contacts`

Lists only the authenticated user's contacts across all applications, with optional searching and pagination.

```json
{
  "data": ["<contact documents with ApplicationId populated>"],
  "page": 1,
  "limit": 20,
  "total": 8,
  "totalPages": 1
}
```

| Query | Meaning | Example |
|---|---|---|
| `q` | Partial case-insensitive search across Name, Company, Role, Email | `?q=Google` |
| `company` | Filter by company name | `?company=Microsoft` |
| `role` | Filter by contact role | `?role=Recruiter` |
| `page` | Page number (default 1) | `?page=2` |
| `limit` | Items per page (default 20, max 100) | `?limit=10` |

The controller uses `.populate('ApplicationId', 'Company Role Status')`. So an item may include:

```json
{
  "_id": "<contact id>",
  "Name": "Taylor Smith",
  "Company": "Google",
  "ApplicationId": {
    "_id": "<application id>",
    "Company": "Google",
    "Role": "Software Engineering Intern",
    "Status": "Interviewing"
  }
}
```

The object above shows selected fields, not every contact field. The frontend should tolerate an unpopulated/missing application reference for old or inconsistent data, rather than assuming every populated object is present.

## Resources

### Browse, search, and filter — `GET /api/resources`

Returns career-related links from the shared MongoDB `Resources` collection. Resources are **the same for every authenticated user**; the collection does not have a `UserId` and this endpoint does not apply user-specific filtering.

The endpoint is **read-only** for users. Resource records are maintained by the team (for example, using `backend/scripts/seedResources.js`), rather than created or edited from the frontend.

**Authentication:** Requires `Authorization: Bearer <JWT>`.

**Query parameters** (both optional):

| Query | Meaning | Example |
|---|---|---|
| `category` | Exact, case-sensitive match against the resource's `Category` field | `?category=Interview%20Preparation` |
| `q` | Case-insensitive, partial text search across `Title` and `Description` | `?q=resume` |

Both parameters can be combined. When combined, results must match the specified category **and** contain the search text in the title or description. Results are sorted by `Title` in ascending order (A–Z). Without parameters, all resources are returned.

**Supported categories:**

- `Finding Internships`
- `Resumes and Applications`
- `Interview Preparation`
- `Career Development`

**Resource document fields:**

| Field | Type | Notes |
|---|---|---|
| `_id` | MongoDB ObjectId/string | Server-generated identifier |
| `Category` | string | One of the four supported categories |
| `Title` | string | Resource title |
| `Description` | string | Short description of the resource |
| `URL` | string | External website URL |

**Example request:**

```http
GET /api/resources?category=Interview%20Preparation&q=coding
Authorization: Bearer <JWT_FROM_LOGIN>
```

**Example `200 OK` response:**

```json
{
  "resources": [
    {
      "_id": "691b9d4c2f8a103e5c7d9210",
      "Category": "Interview Preparation",
      "Title": "LeetCode",
      "Description": "Practice coding problems for technical interviews.",
      "URL": "https://leetcode.com/"
    }
  ]
}
```

The example `_id` and response document are illustrative. The exact data returned depends on the resources currently seeded in MongoDB.

If nothing matches, the API returns `200 OK` with:

```json
{
  "resources": []
}
```

**Frontend usage** (with `API_BASE` ending in `/api`):

```js
const params = new URLSearchParams();
if (selectedCategory) params.set('category', selectedCategory);
if (searchText.trim()) params.set('q', searchText.trim());

const query = params.toString();
const { resources } = await apiFetch(
  `/resources${query ? `?${query}` : ''}`,
  { token }
);
```

Use plain category names (for example, `Interview Preparation`) with `URLSearchParams`, which performs URL encoding automatically. **Do not pre-encode** spaces as `%20` when entering values in a query-parameter editor or passing them to `URLSearchParams`: double-encoding can cause an empty result. The frontend should render each resource as an external link and should not assume this endpoint is paginated.

**Possible errors:** Missing JWT may return `401`; invalid or expired JWT may return `403`; unexpected database failures return `500` with `{ "message": "Failed to retrieve resources" }`.

## Common errors

| Status | What it generally means |
|---|---|
| `200` | Successful GET/PATCH/DELETE |
| `201` | Created successfully |
| `400` | Invalid ID, invalid status, missing required field, or invalid input |
| `401` | Bearer token missing; invalid authenticated ID checks may also return 401 |
| `403` | Invalid or expired JWT, or valid credentials for an unverified account |
| `404` | Record not found for this user, or unmatched route |
| `409` | Possible duplicate constraint violation if a controller handles unique indexes (not confirmed for all routes) |
| `500` | Backend/server error |

Error responses are not perfectly uniform across controllers. Some use `{ "error": "..." }`, while the JWT middleware uses `{ "message": "..." }`. The sample fetch helper checks both.

### Authentication testing checklist (Bruno)

- [x] Registration sends a verification email through Resend.
- [x] A valid verification token sets `IsVerified: true`; reuse fails.
- [x] Valid credentials for an unverified account return `403`.
- [x] A verified account can log in and receive a JWT.
- [x] Resend-verification issues a working replacement link.
- [x] Forgot-password emails a 15-minute reset link.
- [x] Reset-password changes the stored password and invalidates the used token.
- [x] Logging in with the old password fails; logging in with the new password succeeds.

**Maintenance:** Update this README when route paths, request field allowlists, response shapes, or model field types change. The implementation in `routes/`, `controllers/`, and `models/` remains the source of truth.

