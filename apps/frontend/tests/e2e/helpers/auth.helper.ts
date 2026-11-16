import { Page } from '@playwright/test';

/**
 * Authentication Helper Functions
 * Provides reusable auth flows for Playwright tests
 */

export interface TestUser {
  email: string;
  password: string;
  nickname?: string;
  role?: 'admin' | 'player';
}

export class AuthHelper {
  constructor(private page: Page) {}

  /**
   * Navigate to auth page
   */
  async goToAuthPage() {
    await this.page.goto('/auth');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Sign up a new player user
   */
  async signupPlayer(user: TestUser) {
    await this.goToAuthPage();

    // Switch to signup - look for link instead of tab button
    const signupLink = this.page.getByRole('button', { name: /regístrate aquí|regístrate/i });
    await signupLink.click();
    await this.page.waitForTimeout(500);

    // Fill signup form
    await this.page.getByLabel(/email/i).fill(user.email);
    if (user.nickname) {
      await this.page.getByLabel(/apodo|nickname/i).fill(user.nickname);
    }
    await this.page
      .getByLabel(/^contraseña|^password/i)
      .first()
      .fill(user.password);
    await this.page.getByLabel(/confirmar.*contraseña|confirm.*password/i).fill(user.password);

    // Accept terms
    await this.page.getByLabel(/acepto.*términos|accept.*terms/i).check();

    // Submit form
    await this.page.getByRole('button', { name: /crear cuenta|create account/i }).click();

    // Wait for redirect or error
    await this.page.waitForTimeout(2000);
  }

  /**
   * Login with existing credentials
   * @param credentials - User email and password
   * @param expectSuccess - Whether to expect successful login (default: true)
   */
  async login(credentials: Pick<TestUser, 'email' | 'password'>, expectSuccess: boolean = true) {
    await this.goToAuthPage();

    // Fill login form
    await this.page.getByLabel(/email/i).fill(credentials.email);
    await this.page.getByLabel(/contraseña|password/i).fill(credentials.password);

    // Submit
    await this.page.getByRole('button', { name: /iniciar sesión|login/i }).click();

    if (expectSuccess) {
      // Wait for auth token to be saved in localStorage (critical for test stability)
      await this.page.waitForFunction(
        () => {
          const token = localStorage.getItem(Object.keys(localStorage).find((k) => /^sb-.*-auth-token$/.test(k)) ?? '');
          if (!token) return false;
          try {
            const parsed = JSON.parse(token);
            return !!parsed?.access_token;
          } catch {
            return false;
          }
        },
        { timeout: 5000 }
      );

      // Additional wait for navigation/app to stabilize
      await this.page.waitForTimeout(1000);
    } else {
      // For failed login, just wait for error message to appear
      await this.page.waitForTimeout(2000);
    }
  }

  /**
   * Login as admin user
   * Uses existing admin from database
   */
  async loginAsAdmin() {
    await this.login({
      email: 'admin@example.com',
      password: 'ChangeMe_Test123!',
    });

    // Additional wait to ensure post-login navigation completes
    // This prevents race conditions when tests navigate to admin routes
    await this.page.waitForTimeout(1500);
  }

  /**
   * Login as player user
   * Uses existing player from database
   */
  async loginAsPlayer() {
    await this.login({
      email: 'player@example.com',
      password: 'ChangeMe_Test123!',
    });
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn(): Promise<boolean> {
    const url = this.page.url();
    return !url.includes('/auth');
  }

  /**
   * Logout current user
   */
  async logout() {
    // Open profile dropdown first
    try {
      const profileButton = this.page
        .locator('button')
        .filter({ hasText: /jugador|admin|usuario/i })
        .first();
      await profileButton.click();
      await this.page.waitForTimeout(500);

      // Now click the logout button in the dropdown
      const logoutButton = this.page.getByRole('button', { name: /cerrar sesión|logout/i });
      await logoutButton.click();
      await this.page.waitForTimeout(1000);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  /**
   * Get current user info from localStorage
   */
  async getCurrentUser(): Promise<any> {
    const session = await this.page.evaluate(() => {
      const data = localStorage.getItem(Object.keys(localStorage).find((k) => /^sb-.*-auth-token$/.test(k)) ?? '');
      return data ? JSON.parse(data) : null;
    });
    return session?.user || null;
  }

  /**
   * Clear authentication state
   */
  async clearAuth() {
    // Navigate to app first to establish security context for localStorage access
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');

    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await this.page.context().clearCookies();
  }
}

/**
 * Test users available in database
 */
export const TEST_USERS = {
  admin1: {
    email: 'admin@example.com',
    password: 'ChangeMe_Test123!',
    nickname: 'Admin Principal',
    role: 'admin' as const,
  },
  player1: {
    email: 'player@example.com',
    password: 'ChangeMe_Test123!',
    nickname: 'Jugador 1',
    role: 'player' as const,
  },
  player2: {
    email: 'player2@example.com',
    password: 'ChangeMe_Test456!',
    nickname: 'Jugador 2',
    role: 'player' as const,
  },
} as const;
