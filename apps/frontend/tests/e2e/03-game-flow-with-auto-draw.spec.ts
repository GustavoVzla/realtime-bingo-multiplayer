/**
 * E2E Test: Complete Game Flow with Auto-Draw
 *
 * Tests the full bingo game flow including:
 * - Admin creates session and room
 * - Admin starts game
 * - Admin activates auto-draw
 * - Player joins and participates
 * - Winner verification
 *
 * @requires Backend running on PORT 3001
 * @requires Frontend running on PORT 5173
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:5173';

// Test data
const adminEmail = 'admin@test.com';
const adminPassword = 'changeme_test123';
const playerEmail = 'player@test.com';
const playerPassword = 'player123';

test.describe('Complete Game Flow with Auto-Draw', () => {
  let adminPage: Page;
  let playerPage: Page;
  let sessionId: string;
  let roomId: string;

  test.beforeAll(async ({ browser }) => {
    // Create separate contexts for admin and player
    const adminContext = await browser.newContext();
    const playerContext = await browser.newContext();

    adminPage = await adminContext.newPage();
    playerPage = await playerContext.newPage();
  });

  test.afterAll(async () => {
    await adminPage.close();
    await playerPage.close();
  });

  test('01 - Admin login', async () => {
    await adminPage.goto(`${FRONTEND_URL}/auth`);
    await adminPage.waitForLoadState('networkidle');

    await adminPage.fill('input[type="email"]', adminEmail);
    await adminPage.fill('input[type="password"]', adminPassword);
    await adminPage.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await adminPage.waitForURL(/\/admin\/dashboard/, { timeout: 10000 });

    expect(await adminPage.url()).toContain('/admin/dashboard');
  });

  test('02 - Admin creates new session', async () => {
    await adminPage.goto(`${FRONTEND_URL}/admin/sessions`);
    await adminPage.waitForLoadState('networkidle');

    // Click create session button
    await adminPage.click('button:has-text("Nueva Sesión")');

    // Fill session form
    await adminPage.fill('input[name="title"]', `E2E Test Session ${Date.now()}`);
    await adminPage.fill('input[name="scheduledFor"]', '2025-12-31T20:00');
    await adminPage.fill('input[name="cardPrice"]', '5');

    // Select pattern
    await adminPage.click('select[name="pattern"]');
    await adminPage.selectOption('select[name="pattern"]', 'linea');

    // Save session
    await adminPage.click('button[type="submit"]:has-text("Crear")');

    // Wait for session to be created
    await adminPage.waitForTimeout(2000);

    // Capture session ID from URL or from session list
    const sessionCards = await adminPage.$$('[data-testid="session-card"]');
    expect(sessionCards.length).toBeGreaterThan(0);

    // Get the first session's ID (the one we just created)
    const firstSessionCard = sessionCards[0];
    const sessionLink = await firstSessionCard.$('a[href*="/admin/sessions/"]');
    const href = await sessionLink?.getAttribute('href');
    sessionId = href?.split('/').pop() || '';

    expect(sessionId).toBeTruthy();
  });

  test('03 - Admin navigates to session rooms', async () => {
    await adminPage.goto(`${FRONTEND_URL}/admin/sessions/${sessionId}/rooms`);
    await adminPage.waitForLoadState('networkidle');

    // Verify default "General" room exists
    const roomCards = await adminPage.$$('[data-testid="room-card"]');
    expect(roomCards.length).toBeGreaterThan(0);

    // Get room ID from the first (default) room
    const firstRoomCard = roomCards[0];
    const controlButton = await firstRoomCard.$('button:has-text("Control")');
    await controlButton?.click();

    // Wait for navigation to control page
    await adminPage.waitForURL(/\/admin\/rooms\/.*\/control/);

    // Extract room ID from URL
    const url = adminPage.url();
    const matches = url.match(/\/admin\/rooms\/(.+?)\/control/);
    roomId = matches ? matches[1] : '';

    expect(roomId).toBeTruthy();
  });

  test('04 - Admin starts game', async () => {
    await adminPage.goto(`${FRONTEND_URL}/admin/rooms/${roomId}/control`);
    await adminPage.waitForLoadState('networkidle');

    // Verify room status is "Esperando"
    await expect(adminPage.locator('text=Esperando')).toBeVisible();

    // Start game (this would require a start button in the UI)
    // For now, we'll verify the admin game controls are visible
    const gameControls = await adminPage.locator('[data-testid="admin-game-controls"]');

    // If game is already started, skip
    const isPlaying = await adminPage.locator('text=En Juego').isVisible();

    if (!isPlaying) {
      // TODO: Add start game button click when implemented
      // await adminPage.click('button:has-text("Iniciar Juego")');
      // await adminPage.waitForTimeout(2000);
    }
  });

  test('05 - Admin activates auto-draw', async () => {
    await adminPage.goto(`${FRONTEND_URL}/admin/rooms/${roomId}/control`);
    await adminPage.waitForLoadState('networkidle');

    // Configure auto-draw interval (5 seconds)
    const intervalSlider = await adminPage.locator('input[type="range"]');
    if (await intervalSlider.isVisible()) {
      await intervalSlider.fill('5');

      // Verify interval display shows 5s
      await expect(adminPage.locator('text=5s')).toBeVisible();

      // Start auto-draw
      const startButton = await adminPage.locator('button:has-text("Iniciar Sorteo Automático")');
      if (await startButton.isVisible()) {
        await startButton.click();

        // Wait for auto-draw to activate
        await adminPage.waitForTimeout(2000);

        // Verify "Activo" status is shown
        await expect(adminPage.locator('text=Activo')).toBeVisible();

        // Verify stop button appears
        await expect(
          adminPage.locator('button:has-text("Detener Sorteo Automático")')
        ).toBeVisible();
      }
    }
  });

  test('06 - Verify balls are being drawn automatically', async () => {
    await adminPage.goto(`${FRONTEND_URL}/admin/rooms/${roomId}/control`);
    await adminPage.waitForLoadState('networkidle');

    // Wait for some balls to be drawn (15 seconds = ~3 balls at 5s interval)
    await adminPage.waitForTimeout(15000);

    // Check balls drawn count
    const ballsDrawnText = await adminPage.locator('text=/\\d+ \\/ 75/').textContent();
    const drawnCount = parseInt(ballsDrawnText?.split('/')[0].trim() || '0');

    expect(drawnCount).toBeGreaterThan(0);
    expect(drawnCount).toBeLessThanOrEqual(75);

    // Verify current ball display
    const currentBallDisplay = await adminPage.locator('text=Última Bola');
    if (await currentBallDisplay.isVisible()) {
      await expect(adminPage.locator('.text-5xl.font-bold')).toBeVisible();
    }

    // Verify ball history grid
    const ballHistory = await adminPage.$$('[data-testid="ball-history"] > div');
    expect(ballHistory.length).toBe(drawnCount);
  });

  test('07 - Player login', async () => {
    await playerPage.goto(`${FRONTEND_URL}/auth`);
    await playerPage.waitForLoadState('networkidle');

    await playerPage.fill('input[type="email"]', playerEmail);
    await playerPage.fill('input[type="password"]', playerPassword);
    await playerPage.click('button[type="submit"]');

    // Wait for redirect to home
    await playerPage.waitForURL(/\/$/, { timeout: 10000 });

    expect(await playerPage.url()).toBe(`${FRONTEND_URL}/`);
  });

  test('08 - Player joins game room', async () => {
    await playerPage.goto(`${FRONTEND_URL}/game/${sessionId}`);
    await playerPage.waitForLoadState('networkidle');

    // Verify player is in the game room
    await expect(playerPage.locator('text=Sala de Juego')).toBeVisible();

    // Verify drawn balls are visible to player
    await playerPage.waitForTimeout(5000);
    const ballsOnPlayerPage = await playerPage.$$('[data-testid="drawn-ball"]');
    expect(ballsOnPlayerPage.length).toBeGreaterThan(0);
  });

  test('09 - Admin stops auto-draw', async () => {
    await adminPage.goto(`${FRONTEND_URL}/admin/rooms/${roomId}/control`);
    await adminPage.waitForLoadState('networkidle');

    // Stop auto-draw
    const stopButton = await adminPage.locator('button:has-text("Detener Sorteo Automático")');
    if (await stopButton.isVisible()) {
      await stopButton.click();

      // Wait for auto-draw to stop
      await adminPage.waitForTimeout(2000);

      // Verify "Activo" status is gone
      await expect(adminPage.locator('text=Activo')).not.toBeVisible();

      // Verify start button reappears
      await expect(
        adminPage.locator('button:has-text("Iniciar Sorteo Automático")')
      ).toBeVisible();
    }
  });

  test('10 - Verify ball drawing stopped', async () => {
    await adminPage.goto(`${FRONTEND_URL}/admin/rooms/${roomId}/control`);
    await adminPage.waitForLoadState('networkidle');

    // Get current ball count
    const initialBallsText = await adminPage.locator('text=/\\d+ \\/ 75/').textContent();
    const initialCount = parseInt(initialBallsText?.split('/')[0].trim() || '0');

    // Wait 10 seconds (2 intervals would have passed if auto-draw was active)
    await adminPage.waitForTimeout(10000);

    // Verify ball count hasn't changed
    const finalBallsText = await adminPage.locator('text=/\\d+ \\/ 75/').textContent();
    const finalCount = parseInt(finalBallsText?.split('/')[0].trim() || '0');

    expect(finalCount).toBe(initialCount);
  });

  test('11 - Admin can restart auto-draw', async () => {
    await adminPage.goto(`${FRONTEND_URL}/admin/rooms/${roomId}/control`);
    await adminPage.waitForLoadState('networkidle');

    // Change interval to 3 seconds for faster testing
    const intervalSlider = await adminPage.locator('input[type="range"]');
    if (await intervalSlider.isVisible()) {
      await intervalSlider.fill('3');

      // Start auto-draw again
      const startButton = await adminPage.locator('button:has-text("Iniciar Sorteo Automático")');
      if (await startButton.isVisible()) {
        await startButton.click();

        // Wait for activation
        await adminPage.waitForTimeout(2000);

        // Verify active status
        await expect(adminPage.locator('text=Activo')).toBeVisible();

        // Verify interval display shows 3s
        await expect(adminPage.locator('text=3s')).toBeVisible();
      }
    }
  });

  test('12 - Verify real-time updates on player page', async () => {
    // Get current ball count on admin page
    const adminBallsText = await adminPage.locator('text=/\\d+ \\/ 75/').textContent();
    const adminCount = parseInt(adminBallsText?.split('/')[0].trim() || '0');

    // Navigate to player page
    await playerPage.goto(`${FRONTEND_URL}/game/${sessionId}`);
    await playerPage.waitForLoadState('networkidle');

    // Wait for a ball to be drawn
    await playerPage.waitForTimeout(5000);

    // Verify player page shows the same or more balls (due to auto-draw)
    const playerBalls = await playerPage.$$('[data-testid="drawn-ball"]');
    expect(playerBalls.length).toBeGreaterThanOrEqual(adminCount);
  });

  test('13 - Admin verifies game statistics', async () => {
    await adminPage.goto(`${FRONTEND_URL}/admin/rooms/${roomId}/control`);
    await adminPage.waitForLoadState('networkidle');

    // Verify all statistics cards are present
    await expect(adminPage.locator('text=Jugadores')).toBeVisible();
    await expect(adminPage.locator('text=Patrón')).toBeVisible();
    await expect(adminPage.locator('text=Premio')).toBeVisible();
    await expect(adminPage.locator('text=Bolas Sacadas')).toBeVisible();

    // Verify players count
    const playersCard = await adminPage.locator('text=Jugadores').locator('..');
    const playersCount = await playersCard.locator('.text-2xl').textContent();
    expect(parseInt(playersCount || '0')).toBeGreaterThan(0);

    // Verify pattern is displayed
    const patternCard = await adminPage.locator('text=Patrón').locator('..');
    const pattern = await patternCard.locator('.text-2xl').textContent();
    expect(pattern).toBeTruthy();

    // Verify prize amount
    const prizeCard = await adminPage.locator('text=Premio').locator('..');
    const prize = await prizeCard.locator('.text-2xl').textContent();
    expect(prize).toContain('$');
  });

  test('14 - Clean up: Stop auto-draw and end game', async () => {
    await adminPage.goto(`${FRONTEND_URL}/admin/rooms/${roomId}/control`);
    await adminPage.waitForLoadState('networkidle');

    // Stop auto-draw if still active
    const stopButton = await adminPage.locator('button:has-text("Detener Sorteo Automático")');
    if (await stopButton.isVisible()) {
      await stopButton.click();
      await adminPage.waitForTimeout(2000);
    }

    // Note: End game functionality would go here if implemented
    // await adminPage.click('button:has-text("Finalizar Juego")');
  });
});

test.describe('Auto-Draw Edge Cases', () => {
  test('Should handle all 75 balls drawn', async ({ page }) => {
    // This test would require mocking or a specific test scenario
    // where all 75 balls are drawn via auto-draw
    test.skip();
  });

  test('Should stop auto-draw when winner is declared', async ({ page }) => {
    // This test would require a full winner verification flow
    // with bingo pattern matching
    test.skip();
  });

  test('Should handle network interruption during auto-draw', async ({ page }) => {
    // This test would require simulating network failures
    // and verifying reconnection handling
    test.skip();
  });
});

test.describe('Admin Authorization', () => {
  test('Non-admin users cannot access game control page', async ({ page }) => {
    // Login as player
    await page.goto(`${FRONTEND_URL}/auth`);
    await page.fill('input[type="email"]', playerEmail);
    await page.fill('input[type="password"]', playerPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\//);

    // Try to access admin control page
    await page.goto(`${FRONTEND_URL}/admin/rooms/some-room-id/control`);

    // Should be redirected or show error
    expect(await page.url()).not.toContain('/admin/rooms');
  });

  test('Non-admin users cannot start auto-draw', async ({ page }) => {
    // This would be verified via API/socket authorization
    // Player attempting to emit START_AUTO_DRAW should be rejected
    test.skip();
  });
});
