# E2E Test Plan: Admin Payment Management

## Overview

Comprehensive test plan for verifying the admin dashboard payment approval workflow, including bug fixes validation and performance checks.

## Test Environment

- **Backend URL:** http://localhost:3001
- **Frontend URL:** http://localhost:5173
- **Test Framework:** Playwright
- **Test User:** admin@example.com / ChangeMe_Test123!
- **Database:** Supabase (local test data)

## Bug Fixes to Verify

### BUG #1: UUID Validation

**Issue:** Invalid card IDs could be submitted causing database errors
**Fix:** Frontend and backend now validate UUID format before processing
**Tests:**

- Verify UUID validation in card selection
- Confirm invalid UUIDs are rejected with clear error messages
- Test edge cases (empty strings, malformed UUIDs, null values)

### BUG #2: Description Column

**Issue:** Missing `description` column in database schema
**Fix:** Column added to `bingo_sessions` table
**Tests:**

- Verify description field displays in session details
- Test description field in session creation form
- Confirm description persists correctly

### PHASE 2: Query Performance Optimization

**Issue:** Admin dashboard queries were slow (99.5% improvement achieved)
**Fix:** Optimized foreign key indexes and RLS policies
**Tests:**

- Measure dashboard load time (<3 seconds expected)
- Verify statistics load quickly
- Test with large datasets (100+ payments)

## Test Scenarios

### 1. Authentication & Access Control

#### TC-AUTH-01: Admin Login

**Priority:** P0 (Critical)
**Steps:**

1. Navigate to /auth
2. Enter admin credentials
3. Click "Iniciar Sesión"
   **Expected:** Redirect to dashboard, admin user authenticated

#### TC-AUTH-02: Non-Admin Access Denied

**Priority:** P1 (High)
**Steps:**

1. Login as player user
2. Attempt to access /admin/payments
   **Expected:** Access denied or redirect to home

#### TC-AUTH-03: Unauthenticated Access

**Priority:** P1 (High)
**Steps:**

1. Clear session storage
2. Navigate to /admin/payments
   **Expected:** Redirect to /auth

### 2. Dashboard Display

#### TC-DASH-01: Display Pending Payments List

**Priority:** P0 (Critical)
**Steps:**

1. Login as admin
2. Navigate to admin dashboard
3. Verify pending payments tab is active
   **Expected:**

- List of pending payments displayed
- Payment cards show: player email, method, amount, date
- Cards are expandable

#### TC-DASH-02: Empty State Display

**Priority:** P2 (Medium)
**Steps:**

1. Login as admin
2. Filter to show only "Rechazados" (if none exist)
   **Expected:**

- Empty state message: "📭 No hay pagos rechazados"
- No payment cards visible

#### TC-DASH-03: Status Tabs with Counts

**Priority:** P1 (High)
**Steps:**

1. Login as admin
2. Observe tab labels
   **Expected:**

- "Todos" tab shows total count
- "Pendientes" shows pending count
- "Aprobados" shows approved count
- "Rechazados" shows rejected count
- Counts update in real-time

#### TC-DASH-04: Search Functionality

**Priority:** P2 (Medium)
**Steps:**

1. Login as admin
2. Enter player email in search bar
3. Verify filtered results
   **Expected:**

- Only matching payments displayed
- Search is case-insensitive
- Clear search shows all payments

### 3. Payment Approval Flow

#### TC-APPROVE-01: Approve Payment - Happy Path

**Priority:** P0 (Critical)
**Preconditions:** At least 1 pending payment exists
**Steps:**

1. Login as admin
2. Expand a pending payment card
3. Click "Aprobar Pago" button
4. (Optional) Add admin notes
5. Click "Confirmar Aprobación"
   **Expected:**

- Success message displayed: "Pago aprobado exitosamente"
- Payment status changes to "approved"
- Selected cards are assigned to player
- Audit log created
- Payment removed from pending list

#### TC-APPROVE-02: Approve Payment with Admin Notes

**Priority:** P1 (High)
**Steps:**

1. Login as admin
2. Expand pending payment
3. Click "Aprobar Pago"
4. Enter admin notes: "Verified via bank statement"
5. Click "Confirmar Aprobación"
   **Expected:**

- Approval succeeds
- Admin notes saved and visible in payment details
- Notes displayed in approved payment card

#### TC-APPROVE-03: Cancel Approval

**Priority:** P2 (Medium)
**Steps:**

1. Login as admin
2. Expand pending payment
3. Click "Aprobar Pago"
4. Click "Cancelar"
   **Expected:**

- Admin notes input hidden
- Payment remains pending
- No database changes

#### TC-APPROVE-04: Approve Already Processed Payment

**Priority:** P1 (High)
**Steps:**

1. Open payment in two browser tabs
2. Approve in first tab
3. Attempt approval in second tab
   **Expected:**

- Second approval fails with error
- Error message: "Payment already processed" or similar
- No duplicate card assignment

### 4. Payment Rejection Flow

#### TC-REJECT-01: Reject Payment - Happy Path

**Priority:** P0 (Critical)
**Preconditions:** At least 1 pending payment exists
**Steps:**

1. Login as admin
2. Expand pending payment
3. Click "Rechazar Pago"
4. Enter rejection reason: "Referencia incorrecta"
5. Click "Confirmar Rechazo"
   **Expected:**

- Success message: "Pago rechazado"
- Payment status changes to "rejected"
- Rejection reason saved as admin notes
- Cards NOT assigned to player
- Payment removed from pending list

#### TC-REJECT-02: Reject Without Reason

**Priority:** P1 (High)
**Steps:**

1. Login as admin
2. Expand pending payment
3. Click "Rechazar Pago"
4. Leave reason field empty
5. Click "Confirmar Rechazo"
   **Expected:**

- Button remains disabled OR
- Error message: "Admin notes are required for rejection"
- Payment remains pending

#### TC-REJECT-03: Cancel Rejection

**Priority:** P2 (Medium)
**Steps:**

1. Login as admin
2. Expand pending payment
3. Click "Rechazar Pago"
4. Enter reason
5. Click "Cancelar"
   **Expected:**

- Rejection input hidden
- Payment remains pending
- No database changes

### 5. Payment Details Display

#### TC-DETAILS-01: Expand Payment Card

**Priority:** P1 (High)
**Steps:**

1. Login as admin
2. Click on payment card to expand
   **Expected:**

- Card expands smoothly
- Displays sections:
  - Player Info (email, nickname)
  - Session Info (date, pattern, card price)
  - Payment Data (method-specific fields)
  - Selected Cards (card count and IDs)

#### TC-DETAILS-02: Payment Method Details

**Priority:** P1 (High)
**Steps:**

1. Expand payment for each method type
   **Expected:**

- **Pago Móvil:** referencia, banco, monto, fecha, telefono
- **Zelle:** emailOrPhone, confirmationNumber, monto, fecha
- **USDT Binance:** txId, monto, fecha, wallet
- **Bizum:** telefono, codigoOperacion, monto, fecha
- **Efectivo:** nota

#### TC-DETAILS-03: Selected Cards Display

**Priority:** P1 (High)
**Steps:**

1. Expand payment with multiple cards
   **Expected:**

- Card count displayed: "X cartones"
- Card badges numbered: "Cartón 1", "Cartón 2", etc.
- Each card ID is a valid UUID

#### TC-DETAILS-04: Approved Payment Details

**Priority:** P1 (High)
**Steps:**

1. Filter to "Aprobados"
2. Expand approved payment
   **Expected:**

- Green success banner: "Aprobado el: [date]"
- Shows "Aprobado por: [admin ID]"
- Admin notes visible if any
- Action buttons NOT displayed

#### TC-DETAILS-05: Rejected Payment Details

**Priority:** P1 (High)
**Steps:**

1. Filter to "Rechazados"
2. Expand rejected payment
   **Expected:**

- Red rejection banner: "Rechazado el: [date]"
- Admin notes (rejection reason) visible
- Action buttons NOT displayed

### 6. Real-Time Updates

#### TC-REALTIME-01: Payment Status Update

**Priority:** P1 (High)
**Steps:**

1. Open dashboard in two tabs
2. Approve payment in first tab
3. Observe second tab
   **Expected:**

- Second tab updates automatically
- Payment moved from pending to approved
- Count badges update

#### TC-REALTIME-02: New Payment Notification

**Priority:** P2 (Medium)
**Steps:**

1. Admin has dashboard open
2. Player submits new payment
3. Observe admin dashboard
   **Expected:**

- New payment appears in pending list
- Pending count increments
- No page refresh required

### 7. UUID Validation (BUG #1 Fix)

#### TC-UUID-01: Valid UUID Card IDs

**Priority:** P0 (Critical)
**Steps:**

1. Submit payment with valid UUID card IDs
2. Admin approves payment
   **Expected:**

- Approval succeeds
- Cards assigned correctly
- No errors in console

#### TC-UUID-02: Invalid UUID Rejected (Frontend)

**Priority:** P0 (Critical)
**Steps:**

1. Attempt to submit payment with invalid card ID
   **Expected:**

- Frontend validation catches error
- User sees error message
- Payment not submitted to backend

#### TC-UUID-03: Invalid UUID Rejected (Backend)

**Priority:** P0 (Critical)
**Steps:**

1. Send API request with malformed UUID
   **Expected:**

- Backend returns 400 error
- Error message: "Invalid UUID format" or similar
- No database corruption

### 8. Performance Testing (PHASE 2 Optimization)

#### TC-PERF-01: Dashboard Load Time

**Priority:** P1 (High)
**Steps:**

1. Login as admin
2. Measure time to load dashboard
   **Expected:**

- Initial load < 3 seconds
- All payments visible
- No loading spinners after 3s

#### TC-PERF-02: Large Dataset Performance

**Priority:** P2 (Medium)
**Preconditions:** Database has 100+ payments
**Steps:**

1. Login as admin
2. Load dashboard
3. Filter by status
4. Search payments
   **Expected:**

- All operations < 1 second
- Smooth scrolling
- No UI lag

#### TC-PERF-03: Query Optimization Validation

**Priority:** P1 (High)
**Steps:**

1. Open browser DevTools Network tab
2. Load admin dashboard
3. Check API response times
   **Expected:**

- `/api/payments/pending` responds < 500ms
- Supabase query with JOIN < 200ms
- No N+1 query issues

### 9. Error Handling

#### TC-ERROR-01: Network Failure During Approval

**Priority:** P1 (High)
**Steps:**

1. Start approval process
2. Disconnect network
3. Click "Confirmar Aprobación"
   **Expected:**

- Error message displayed
- Payment remains pending
- User can retry after network restored

#### TC-ERROR-02: Session Expired

**Priority:** P1 (High)
**Steps:**

1. Login as admin
2. Wait for session to expire
3. Attempt to approve payment
   **Expected:**

- Error: "Authentication required"
- Redirect to login page
- Payment unchanged

#### TC-ERROR-03: Invalid Payment ID

**Priority:** P2 (Medium)
**Steps:**

1. Manually navigate to /api/payments/invalid-uuid/approve
   **Expected:**

- 404 error
- Error message: "Payment not found"

### 10. Audit Trail Verification

#### TC-AUDIT-01: Approval Logged

**Priority:** P1 (High)
**Steps:**

1. Approve a payment
2. Check `payment_audit_log` table
   **Expected:**

- Audit entry created
- Fields: payment_id, action='approved', admin_id, timestamp

#### TC-AUDIT-02: Rejection Logged

**Priority:** P1 (High)
**Steps:**

1. Reject a payment
2. Check `payment_audit_log` table
   **Expected:**

- Audit entry created
- Fields: payment_id, action='rejected', admin_id, notes, timestamp

## Test Data Requirements

### Existing Test Users

- **Admin:** admin@example.com / ChangeMe_Test123!
- **Player 1:** player@example.com / ChangeMe_Test123!
- **Player 2:** player2@example.com / ChangeMe_Test456!

### Test Data Setup

Each test run should have:

1. At least 3 pending payments (different payment methods)
2. At least 1 approved payment (for display testing)
3. At least 1 rejected payment (for display testing)
4. At least 1 active session with available cards
5. Valid UUID card IDs for all payments

### Test Data Cleanup

After test completion:

- Mark test payments as 'test_data'
- Do NOT delete to preserve audit trail
- Option to archive old test data (>30 days)

## Acceptance Criteria

### Critical (P0) - Must Pass 100%

- All authentication tests pass
- Approve payment happy path works
- Reject payment happy path works
- UUID validation prevents invalid data
- Real-time updates function correctly

### High (P1) - Must Pass >95%

- Admin notes save correctly
- Payment details display accurately
- Error handling works as expected
- Performance meets targets (<3s load)

### Medium (P2) - Must Pass >90%

- Search and filter work correctly
- Empty states display properly
- Cancel actions work
- Large dataset performance acceptable

## Test Execution Strategy

### Sequential Execution

Tests should run sequentially (not parallel) to avoid:

- Database race conditions
- Payment status conflicts
- Audit log corruption

### Test Isolation

Each test should:

- Use independent test data
- Clean up after itself (mark as test)
- Not depend on other tests' results

### Screenshot Strategy

Capture screenshots:

- On test failure (automatic)
- After each critical action (approve/reject)
- Before and after state changes

### Retry Strategy

- Critical tests: Retry 2 times on failure
- Non-critical tests: No retry in local dev
- CI/CD: Retry 1 time for all tests

## Success Metrics

### Test Coverage

- **Target:** >80% code coverage for admin payment routes
- **Includes:** All endpoints, middleware, error handlers
- **Excludes:** Legacy code, deprecated features

### Execution Time

- **Target:** <5 minutes for full test suite
- **Individual test:** <30 seconds max
- **Setup/teardown:** <10 seconds per test

### Reliability

- **Target:** 99% pass rate (no flaky tests)
- **Flaky test definition:** Fails 1+ times in 100 runs
- **Action on flaky test:** Quarantine and fix immediately

## Known Limitations

1. **Real-time Testing:** Requires two browser contexts (complex)
2. **Performance Testing:** Results vary by machine specs
3. **Audit Log:** Cannot fully test trigger execution in E2E
4. **Race Conditions:** Difficult to reproduce consistently
5. **Network Simulation:** Limited Playwright network mocking

## Future Enhancements

1. **Visual Regression Testing:** Compare UI snapshots
2. **Accessibility Testing:** WCAG 2.1 AA compliance
3. **Mobile Testing:** Responsive design validation
4. **Load Testing:** Concurrent admin actions
5. **Integration with CI/CD:** Automated test runs on PR

## References

- [Playwright Docs](https://playwright.dev/docs/intro)
- [Supabase Testing Guide](https://supabase.com/docs/guides/testing)
- [CLAUDE.md](../../CLAUDE.md) - Project context
- [ADMIN-DASHBOARD-FIX-2025-10-29.md](../../ADMIN-DASHBOARD-FIX-2025-10-29.md) - Bug fixes
