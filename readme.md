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

**Additional routes:** User-profile endpoints, single-contact update/delete endpoints, company endpoints, internship-offer endpoints, and other auth actions are **not fully verified** from the files provided. See [Routes requiring confirmation](#routes-requiring-confirmation); do not assume paths or payloads until checked.

## Authentication

### Register — `POST /api/auth/register`

Creates a user. The precise required body and response depend on `routes/register` and its controller; verify before wiring the final form. User model fields discussed in development include:

- `FirstName`, `LastName`, `Login`, `Email`, `Password`
- Optional/profile fields such as `Degree`, `Major`, `GraduationYear`

**Never send or expose plaintext passwords beyond the registration/login request; never store them in frontend logs.** Passwords should be hashed by the backend.

### Login — `POST /api/auth/login`

The login controller accepts a username **or** email in the `login` field, with `password` as the password field (verify the exact casing from the current route/controller).

```json
{
  "login": "exampleuser",
  "password": "your-password"
}
```

Extract the returned JWT from the login response and include it as a Bearer token on protected requests. **Verify the exact response property containing the token** in the current login controller (for example, `token`).

### Authenticated user — `GET /api/auth/me` (verify in code)

Previously discussed as a protected endpoint. Confirm that the route is still mounted and check the returned user profile shape before using it.

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

## Common errors

| Status | What it generally means |
|---|---|
| `200` | Successful GET/PATCH/DELETE |
| `201` | Created successfully |
| `400` | Invalid ID, invalid status, missing required field, or invalid input |
| `401` | Bearer token missing; invalid authenticated ID checks may also return 401 |
| `403` | Invalid or expired JWT with current middleware |
| `404` | Record not found for this user, or unmatched route |
| `409` | Possible duplicate constraint violation if a controller handles unique indexes (not confirmed for all routes) |
| `500` | Backend/server error |

Error responses are not perfectly uniform across controllers. Some use `{ "error": "..." }`, while the JWT middleware uses `{ "message": "..." }`. The sample fetch helper checks both.

## Recommended frontend data flow

1. Register or log in. Read the JWT and authenticated user details from the actual login response.
2. Attach `Authorization: Bearer <token>` to every protected request.
3. Dashboard page: request `/applications/stats`, `/applications/recent`, and `/dashboard/followups` in parallel.
4. Applications page: use `/applications` with filters/pagination; create/edit/delete through POST/PATCH/DELETE.
5. Application details: use `/applications/:id` and `/applications/:id/contacts`.
6. Contacts directory: use `/contacts?q=...&page=...&limit=...`.
7. After creating, editing, or deleting applications/contacts, refetch affected dashboard and list data. The API does **not** push updates to an open frontend automatically.
8. On JWT expiration/auth errors, clear stale session state and ask the user to log in again.

## Routes requiring confirmation

Before advertising these as stable frontend endpoints, check the implementation in the repository:

- `routes/userProfile.js`: exact profile read/update/delete paths, methods, bodies, and response shapes.
- `routes/contact.js` and its controller: exact single-contact update/delete endpoints, success response envelopes, and whether `CompanyId` is accepted.
- `routes/register.js`, `routes/login.js`: exact login/register request and response properties; verify `/api/auth/me` mounting.
- Company and internship-offer routes: Mongoose models may exist without corresponding API endpoints. **Do not assume CRUD routes are available.**
- Dashboard follow-ups and global contacts route registrations: confirm the corresponding routes are mounted in the server entry point on the branch/deployment being used.

## Testing checklist (Bruno)

- [ ] Login returns a JWT; authenticated requests succeed with `Authorization: Bearer {{token}}`.
- [ ] GET `/api/applications/stats` changes after application create/update/delete.
- [ ] GET `/api/applications/recent` lists the newest updated applications first (after legacy date migration).
- [ ] GET `/api/dashboard/followups` returns upcoming contacts in date order.
- [ ] GET `/api/contacts?q=...` searches across applications.
- [ ] GET `/api/applications/:id/contacts` returns only that application's contacts.
- [ ] User A cannot access User B's records.
- [ ] Missing and expired JWTs are rejected.
- [ ] Deleting an application removes its related contacts.

---

**Maintenance:** Update this README when route paths, request field allowlists, response shapes, or model field types change. The implementation in `routes/`, `controllers/`, and `models/` remains the source of truth.

