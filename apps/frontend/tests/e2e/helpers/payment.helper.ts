import { Page } from '@playwright/test';
import { PaymentMethod, PaymentStatus } from '@bingo/shared-types';

/**
 * Payment Test Helper Functions
 * Provides utilities for setting up and managing test payment data
 */

export interface TestPaymentData {
  playerId: string;
  sessionId: string;
  cardIds: string[];
  paymentMethod: PaymentMethod;
  amount: number;
  status: PaymentStatus;
}

export interface TestSession {
  id: string;
  date_time: string;
  winning_pattern: string;
  card_price: number;
  description?: string;
  status: string;
}

export interface TestCard {
  id: string;
  session_id: string;
  player_id: string | null;
  numbers: number[][];
}

export class PaymentHelper {
  constructor(private page: Page) {}

  private backendUrl = 'http://localhost:3001';

  /**
   * Get authentication token from localStorage
   */
  async getAuthToken(): Promise<string> {
    const session = await this.page.evaluate(() => {
      const data = localStorage.getItem(Object.keys(localStorage).find((k) => /^sb-.*-auth-token$/.test(k)) ?? '');
      return data ? JSON.parse(data) : null;
    });

    if (!session?.access_token) {
      throw new Error('No authentication token found');
    }

    return session.access_token;
  }

  /**
   * Create a test session with cards via backend API
   */
  async createTestSession(
    adminToken: string,
    sessionData: Partial<TestSession> = {}
  ): Promise<TestSession> {
    const defaultDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow

    const payload = {
      date_time: sessionData.date_time || defaultDate.toISOString(),
      winning_pattern: sessionData.winning_pattern || 'horizontal', // FIXED: Changed from 'LINEA_HORIZONTAL'
      card_price: sessionData.card_price || 10,
      description: sessionData.description || 'Test Session for E2E',
      status: sessionData.status || 'scheduled',
      max_cards_per_player: 5,
    };

    const response = await this.page.request.post(`${this.backendUrl}/api/admin/sessions`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      data: payload,
    });

    if (!response.ok()) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Failed to create test session: ${JSON.stringify(error)}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Create test cards for a session via backend API
   */
  async createTestCards(
    adminToken: string,
    sessionId: string,
    cardCount: number = 3
  ): Promise<TestCard[]> {
    const response = await this.page.request.post(
      `${this.backendUrl}/api/admin/sessions/${sessionId}/cards`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        data: {
          count: cardCount,
        },
      }
    );

    if (!response.ok()) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Failed to create test cards: ${JSON.stringify(error)}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Create a test payment transaction via backend API
   */
  async createTestPayment(
    playerToken: string,
    paymentData: {
      sessionId: string;
      cardIds: string[];
      paymentMethod: PaymentMethod;
      amount: number;
    }
  ): Promise<any> {
    // Generate payment data based on method
    const paymentMethodData = this.generatePaymentMethodData(
      paymentData.paymentMethod,
      paymentData.amount
    );

    const response = await this.page.request.post(`${this.backendUrl}/api/payments/request`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${playerToken}`,
      },
      data: {
        sessionId: paymentData.sessionId,
        cardIds: paymentData.cardIds,
        paymentMethod: paymentData.paymentMethod,
        paymentData: paymentMethodData,
      },
    });

    if (!response.ok()) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Failed to create test payment: ${JSON.stringify(error)}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Generate mock payment data for each payment method
   */
  private generatePaymentMethodData(method: PaymentMethod, amount: number): any {
    const today = new Date().toISOString().split('T')[0];

    switch (method) {
      case PaymentMethod.PAGO_MOVIL:
        return {
          referencia: `PM${Date.now()}`,
          banco: 'Banesco',
          monto: amount,
          fecha: today,
          telefono: '04128219894',
        };

      case PaymentMethod.ZELLE:
        return {
          emailOrPhone: 'test@example.com',
          confirmationNumber: `Z${Date.now()}`,
          monto: amount,
          fecha: today,
        };

      case PaymentMethod.USDT_BINANCE:
        return {
          txId: `0x${Date.now()}abcdef`,
          monto: amount,
          fecha: today,
          wallet: '0xTestWallet123',
        };

      case PaymentMethod.BIZUM:
        return {
          telefono: '604993451',
          codigoOperacion: `BZ${Date.now()}`,
          monto: amount,
          fecha: today,
        };

      case PaymentMethod.EFECTIVO:
        return {
          nota: `Test payment ${Date.now()}`,
        };

      default:
        throw new Error(`Unknown payment method: ${method}`);
    }
  }

  /**
   * Approve a payment via backend API (for setup/cleanup)
   */
  async approvePayment(adminToken: string, paymentId: string, adminNotes?: string): Promise<any> {
    const response = await this.page.request.patch(
      `${this.backendUrl}/api/payments/${paymentId}/approve`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        data: { adminNotes },
      }
    );

    if (!response.ok()) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Failed to approve payment: ${JSON.stringify(error)}`);
    }

    return await response.json();
  }

  /**
   * Reject a payment via backend API (for setup/cleanup)
   */
  async rejectPayment(adminToken: string, paymentId: string, adminNotes: string): Promise<any> {
    const response = await this.page.request.patch(
      `${this.backendUrl}/api/payments/${paymentId}/reject`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        data: { adminNotes },
      }
    );

    if (!response.ok()) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Failed to reject payment: ${JSON.stringify(error)}`);
    }

    return await response.json();
  }

  /**
   * Get all payments via backend API
   */
  async getAllPayments(adminToken: string): Promise<any[]> {
    const response = await this.page.request.get(`${this.backendUrl}/api/payments`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    if (!response.ok()) {
      throw new Error('Failed to fetch payments');
    }

    const result = await response.json();
    return result.data || [];
  }

  /**
   * Clean up test payments (mark as test data)
   * NOTE: We don't delete to preserve audit trail
   */
  async markPaymentsAsTest(adminToken: string, paymentIds: string[]): Promise<void> {
    for (const paymentId of paymentIds) {
      try {
        await this.rejectPayment(adminToken, paymentId, '[TEST_DATA] Marked for cleanup');
      } catch (error) {
        console.warn(`Could not mark payment ${paymentId} as test:`, error);
      }
    }
  }

  /**
   * Navigate to admin dashboard
   * Waits for admin role to be verified to avoid "Acceso Denegado" race condition
   */
  async goToAdminDashboard() {
    await this.page.goto('/admin/payments');
    await this.page.waitForLoadState('networkidle');

    // Wait for admin dashboard to load OR access denied message
    // This handles the race condition where profile hasn't loaded yet
    await Promise.race([
      // Option 1: Admin dashboard loaded successfully
      this.page
        .getByRole('heading', { name: /panel de administración/i })
        .waitFor({ state: 'visible', timeout: 10000 }),
      // Option 2: Access denied (means profile didn't load in time)
      this.page.getByText(/acceso denegado/i).waitFor({ state: 'visible', timeout: 10000 }),
    ]);

    // If we see "Acceso Denegado", wait a bit more and reload
    const accessDenied = await this.page
      .getByText(/acceso denegado/i)
      .isVisible()
      .catch(() => false);
    if (accessDenied) {
      console.warn('Access denied detected - waiting for profile to load and retrying...');
      await this.page.waitForTimeout(2000);
      await this.page.reload();
      await this.page.waitForLoadState('networkidle');
      // Wait for dashboard heading again
      await this.page
        .getByRole('heading', { name: /panel de administración/i })
        .waitFor({ state: 'visible', timeout: 10000 });
    }
  }

  /**
   * Wait for payment list to load
   * Uses web-first assertions for reliability (Playwright best practice)
   */
  async waitForPaymentList() {
    // Wait for either the dashboard container OR the empty state message
    // This is more resilient than CSS selectors
    try {
      // First, wait for the page to be fully loaded
      await this.page.waitForLoadState('networkidle', { timeout: 5000 });

      // Then wait for either a payment card OR the empty state
      await Promise.race([
        // Option 1: Wait for payment cards to appear
        this.page
          .locator('div')
          .filter({ hasText: /player@example.com|admin@example.com|PENDING/ })
          .first()
          .waitFor({ state: 'visible', timeout: 5000 }),
        // Option 2: Wait for empty state message
        this.page
          .getByText(/no hay pagos|no hay sesiones/i)
          .waitFor({ state: 'visible', timeout: 5000 }),
      ]);
    } catch (error) {
      // If neither appears, check if we're still loading
      const isLoading = await this.page
        .getByText('Cargando')
        .isVisible()
        .catch(() => false);
      if (isLoading) {
        // Wait a bit more for loading to complete
        await this.page.waitForTimeout(2000);
      }
      // Don't throw - let the test continue and fail with better error message
    }
  }

  /**
   * Get payment card by player email
   */
  getPaymentCard(playerEmail: string) {
    return this.page.locator('div.bg-white.rounded-lg.shadow-md').filter({ hasText: playerEmail });
  }

  /**
   * Expand payment card by clicking on it
   */
  async expandPaymentCard(playerEmail: string) {
    const card = this.getPaymentCard(playerEmail);
    // Click on the header section which is the clickable area
    const header = card.locator('.cursor-pointer').first();
    await header.click();
    await this.page.waitForTimeout(500); // Wait for expansion animation
  }

  /**
   * Click approve button on expanded card
   */
  async clickApproveButton() {
    const approveBtn = this.page.getByRole('button', { name: 'Aprobar Pago' });
    await approveBtn.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Enter admin notes for approval
   */
  async enterAdminNotes(notes: string) {
    const textarea = this.page.getByPlaceholder('Notas del administrador (opcional)');
    await textarea.fill(notes);
  }

  /**
   * Confirm approval action
   */
  async confirmApproval() {
    const confirmBtn = this.page.getByRole('button', { name: 'Confirmar Aprobación' });
    await confirmBtn.click();
  }

  /**
   * Click reject button on expanded card
   */
  async clickRejectButton() {
    const rejectBtn = this.page.getByRole('button', { name: 'Rechazar Pago' });
    await rejectBtn.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Enter rejection reason
   */
  async enterRejectReason(reason: string) {
    const textarea = this.page.getByPlaceholder('Razón del rechazo (obligatorio)');
    await textarea.fill(reason);
  }

  /**
   * Confirm rejection action
   */
  async confirmRejection() {
    const confirmBtn = this.page.getByRole('button', { name: 'Confirmar Rechazo' });
    await confirmBtn.click();
  }

  /**
   * Click cancel button in approval/rejection flow
   */
  async clickCancel() {
    const cancelBtn = this.page.getByRole('button', { name: 'Cancelar' });
    await cancelBtn.click();
  }

  /**
   * Get success message
   */
  getSuccessMessage() {
    return this.page.locator('.bg-green-50');
  }

  /**
   * Get error message
   */
  getErrorMessage() {
    return this.page.locator('.bg-red-50');
  }

  /**
   * Switch to a specific status tab
   */
  async switchToTab(tabName: 'Todos' | 'Pendientes' | 'Aprobados' | 'Rechazados') {
    const tab = this.page.getByRole('button', { name: new RegExp(tabName, 'i') });
    await tab.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Search for payments by player email
   */
  async searchPayments(searchTerm: string) {
    const searchInput = this.page.getByPlaceholder(/buscar por email/i);
    await searchInput.fill(searchTerm);
    await this.page.waitForTimeout(500); // Debounce time
  }

  /**
   * Get badge count for a tab
   */
  async getTabBadgeCount(
    tabName: 'Todos' | 'Pendientes' | 'Aprobados' | 'Rechazados'
  ): Promise<number> {
    const tab = this.page.getByRole('button', { name: new RegExp(tabName, 'i') });
    const badge = tab.locator('span.rounded-full');
    const text = await badge.textContent();
    return parseInt(text || '0', 10);
  }

  /**
   * Check if payment card is visible
   */
  async isPaymentVisible(playerEmail: string): Promise<boolean> {
    const card = this.getPaymentCard(playerEmail);
    return await card.isVisible().catch(() => false);
  }

  /**
   * Validate UUID format (basic check)
   */
  isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Get all card IDs from expanded payment details
   */
  async getSelectedCardIds(): Promise<string[]> {
    const cardBadges = this.page.locator('span.bg-blue-100.text-blue-800');
    const count = await cardBadges.count();
    const ids: string[] = [];

    for (let i = 0; i < count; i++) {
      const text = await cardBadges.nth(i).textContent();
      if (text) {
        ids.push(text.trim());
      }
    }

    return ids;
  }

  /**
   * Measure page load time
   */
  async measureLoadTime(): Promise<number> {
    const startTime = Date.now();
    await this.waitForPaymentList();
    const endTime = Date.now();
    return endTime - startTime;
  }
}

/**
 * Test data constants
 */
export const TEST_PAYMENT_METHODS = [
  PaymentMethod.PAGO_MOVIL,
  PaymentMethod.ZELLE,
  PaymentMethod.USDT_BINANCE,
  PaymentMethod.BIZUM,
  PaymentMethod.EFECTIVO,
];

export const TEST_AMOUNTS = {
  SINGLE_CARD: 10,
  THREE_CARDS: 30,
  FIVE_CARDS: 50,
};
