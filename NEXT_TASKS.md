# Next Tasks

## Current Follow-Up Plan

### 1. Run the app end-to-end locally
Verify the real flow in browser against live auth and Convex:

- Create order
- Copy/share invite
- Join from second account
- Add preferences
- Lock
- Settle
- Reopen history

Acceptance criteria:

- The full flow works locally end-to-end.
- Any failures, regressions, or UX gaps are documented.
- Browser verification covers real auth plus Convex, not mocked data.

### 2. Tighten backend behavior with tests
Add Convex-focused automated coverage for:

- Join deduping
- Host-only actions
- Inactive member exclusion
- Multi-currency split math

Acceptance criteria:

- These behaviors are covered by tests.
- The tests pass consistently.

### 3. Do a UI parity pass against the Figma file
Close the remaining design gaps, especially around:

- Spacing
- Typography
- Screen-state parity
- Order room screens
- Settlement states

Acceptance criteria:

- Core screens align with the intended visual language.
- Remaining parity gaps are small enough for review.

### 4. Add basic product hardening
Improve resilience and user feedback for:

- Empty states
- Error states
- Loading states
- Toast feedback for copy/save/remove actions
- Guardrails around invalid totals
- Guardrails around locked/settled transitions

Acceptance criteria:

- Common edge cases do not fail silently.
- State transitions are harder to misuse.
- User feedback is visible for critical actions.

### 5. Prepare the PR
Prepare review materials that include:

- Summary of the new routes
- Summary of the schema changes
- Summary of the user flow
- Screenshots
- Note that browser verification was done against real auth plus Convex

Acceptance criteria:

- PR description is ready for review.
- Reviewers have enough context to understand scope and validation.

## Deferred Until Current Flow Is Verified

These are likely v1.1 items, but should not start until the current flow is verified in browser:

- Mark paid
- Better host controls
- Optional notifications
