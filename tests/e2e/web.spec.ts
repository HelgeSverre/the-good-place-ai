import { test, expect } from '@playwright/test';

test.describe('The Good Place Simulator - Web Interface', () => {
  test.describe('Homepage', () => {
    test('loads the homepage', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveTitle('The Good Place Simulator');
    });

    test('displays the header with title', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('h1')).toContainText('The Good Place');
      await expect(page.locator('h1')).toContainText('Simulator');
    });

    test('shows connection status indicator', async ({ page }) => {
      await page.goto('/');
      // Wait for connection status to appear
      await expect(page.getByText(/Connected|Disconnected/)).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('API Endpoints', () => {
    test('GET /api/characters returns character list', async ({ request }) => {
      const response = await request.get('/api/characters');
      expect(response.ok()).toBeTruthy();

      const characters = await response.json();
      expect(Array.isArray(characters)).toBe(true);
      expect(characters.length).toBeGreaterThan(0);

      // Verify character structure
      const firstChar = characters[0];
      expect(firstChar).toHaveProperty('name');
      expect(firstChar).toHaveProperty('shortName');
      expect(firstChar).toHaveProperty('color');
    });

    test('GET /api/scenarios returns scenario list', async ({ request }) => {
      const response = await request.get('/api/scenarios');
      expect(response.ok()).toBeTruthy();

      const scenarios = await response.json();
      expect(Array.isArray(scenarios)).toBe(true);
      expect(scenarios.length).toBeGreaterThan(0);

      // Verify scenario structure
      const firstScenario = scenarios[0];
      expect(firstScenario).toHaveProperty('id');
      expect(firstScenario).toHaveProperty('name');
      expect(firstScenario).toHaveProperty('type');
      expect(firstScenario).toHaveProperty('requiredCharacters');
    });

    test('POST /api/scene creates a new session', async ({ request }) => {
      const response = await request.post('/api/scene');
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data).toHaveProperty('sessionId');
      expect(data.sessionId).toMatch(/^scene-\d+-[a-z0-9]+$/);
    });

    test('GET /api/scene/:id returns session state', async ({ request }) => {
      // First create a session
      const createResponse = await request.post('/api/scene');
      const { sessionId } = await createResponse.json();

      // Then get its state
      const response = await request.get(`/api/scene/${sessionId}`);
      expect(response.ok()).toBeTruthy();

      const state = await response.json();
      expect(state).toHaveProperty('sessionId', sessionId);
      expect(state).toHaveProperty('status', 'idle');
    });

    test('GET /api/scene/:invalid returns 404', async ({ request }) => {
      const response = await request.get('/api/scene/invalid-session-id');
      expect(response.status()).toBe(404);
    });
  });

  test.describe('UI Components', () => {
    test('displays scenario selector', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByText('Scenarios')).toBeVisible({ timeout: 10000 });
    });

    test('displays character roster', async ({ page }) => {
      await page.goto('/');
      // Use heading role to be more specific
      await expect(page.getByRole('heading', { name: 'Characters' })).toBeVisible({ timeout: 10000 });
    });

    test('loads scenarios into selector', async ({ page }) => {
      await page.goto('/');
      // Wait for scenarios to load
      await page.waitForResponse(response =>
        response.url().includes('/api/scenarios') && response.status() === 200
      );
      // Check that at least one scenario button is visible
      await expect(page.locator('button:has-text("Trolley")')).toBeVisible({ timeout: 10000 });
    });

    test('loads characters into roster', async ({ page }) => {
      await page.goto('/');
      // Wait for characters to load
      await page.waitForResponse(response =>
        response.url().includes('/api/characters') && response.status() === 200
      );
      // Check that at least one character is displayed
      await expect(page.getByText('Eleanor')).toBeVisible({ timeout: 10000 });
    });

    test('shows play button when scenario selected', async ({ page }) => {
      await page.goto('/');
      // Wait for scenarios to load
      await page.waitForResponse(response =>
        response.url().includes('/api/scenarios') && response.status() === 200
      );
      // Click on a scenario
      await page.locator('button:has-text("Trolley")').first().click();
      // Play button should be visible
      await expect(page.getByRole('button', { name: /Play/i })).toBeVisible();
    });

    test('displays empty state message initially', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByText('Select a scenario and click Play to begin')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('WebSocket Connection', () => {
    test('establishes WebSocket connection', async ({ page }) => {
      await page.goto('/');

      // Wait for WebSocket to connect
      await page.waitForFunction(() => {
        // The app should show "Connected" when WebSocket is ready
        return document.body.innerText.includes('Connected');
      }, { timeout: 15000 });

      await expect(page.getByText('Connected')).toBeVisible();
    });
  });
});
