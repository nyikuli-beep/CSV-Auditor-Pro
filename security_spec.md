# Firestore Security Specification

This specification documents the validation invariants and the "Dirty Dozen" exploit vectors used to audit and harden the CSV Auditor Pro Firestore security rules.

## 1. Data Invariants

1. **User Profiles (`/users/{userId}`)**:
   - Only the authenticated user matching `{userId}` can create or edit their profile.
   - Users cannot self-escalate or change their workspace `role` unless verified via specific criteria (roles are restricted).
   - Only validated emails can create profiles.

2. **Spreadsheet Files (`/files/{fileId}`)**:
   - Files are owned by specific users. Non-owners are restricted unless they have active tenancy workspace membership.
   - The CSV file must match validation requirements: strict headers format, status must be one of `pending`, `auditing`, `completed`, `failed`.
   - Quality score must be between 0 and 100.
   - Size must be under 25MB (26214400 bytes).

3. **Audit Activities (`/activities/{activityId}`)**:
   - Any signed-in workspace user can read or create activity entries.
   - Update and delete operations are completely disabled (append-only ledger).

4. **Team Members (`/members/{memberId}`)**:
   - Read/write available to registered workspace users.
   - Prevent modifying core ownership fields unless authorized.

---

## 2. The "Dirty Dozen" Exploitation Scenarios

Here are the 12 malicious payload profiles that MUST return `PERMISSION_DENIED`:

1. **Self-Escalation Attack**: User `A` attempts to write `role: "Owner"` during creation to gain absolute SaaS workspace credentials.
2. **Identity Spoofing**: User `A` attempts to write a file document with `ownerId: "UserB"` to masquerade as another member.
3. **Ghost Field Poisoning**: User `A` attempts to append a secret field (`isAdminPrivileged: true`) to bypass schema boundaries.
4. **Invalid State Skip**: A standard user attempts to bypass the validation pipeline by updating a pending file directly to `status: "completed"` with a fabricated `score: 100` and no audit issues.
5. **Score Out of Bounds**: Writing a completed spreadsheet record with a `score: 150` or `score: -10`.
6. **Unauthenticated Write**: An anonymous or unauthenticated client attempting to list or fetch files.
7. **Activity Mutability**: Attempting to update or edit an existing compliance log entry in the activity collection.
8. **Malicious ID Poisoning**: Attempting to query or target files using an infected document ID containing special characters (e.g. `{fileId} = "file_#_delete_all_$"`) exceeding length bounds.
9. **Unverified Account Access**: An unverified user with `email_verified == false` attempting to read sensitive audit findings.
10. **Resource Exhaustion Payload**: Attempting to write a file record with `size: 9999999999` to trigger quota leaks.
11. **Malicious Empty List Payload**: Ingesting issues array with invalid empty elements to break front-end render loops.
12. **PII Collection Harvesting**: An authenticated outsider attempting to run a blanket list query to harvest emails of workspace team members.
