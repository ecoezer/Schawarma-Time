import { test, expect } from '@playwright/test';

test.describe('Auth Page Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure the server is up and navigate to login
    await page.goto('http://localhost:5173/login');
  });

  test('should display the correct logo and not S47', async ({ page }) => {
    // The logo should be an img tag now, not a div with S47
    const logo = page.locator('img[alt="Logo"]');
    await expect(logo).toBeVisible();
    
    const s47Text = await page.textContent('body');
    expect(s47Text).not.toContain('S47');
  });

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    // Find the toggle button using its aria-label
    const toggleButton = page.getByLabel('Passwort anzeigen');
    await toggleButton.click();

    // After clicking, the input should be type="text"
    await expect(page.locator('input[type="text"]')).toBeVisible();
    
    // Toggle back
    await toggleButton.click();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should navigate between login and register', async ({ page }) => {
    const registerLink = page.getByRole('button', { name: 'Jetzt registrieren' });
    await registerLink.click();

    // URL should update
    await expect(page).toHaveURL(/.*\/register/);

    // Registration specific fields should appear
    await expect(page.getByLabel('Vollständiger Name')).toBeVisible();
    await expect(page.getByLabel('Telefonnummer')).toBeVisible();

    // Toggle back to login
    const loginLink = page.getByRole('button', { name: 'Hier anmelden' });
    await loginLink.click();
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('should validate password length (min 8 characters)', async ({ page }) => {
    // Go to register to see validation
    await page.goto('http://localhost:5173/register');
    
    await page.getByLabel('Vollständiger Name').fill('Test User');
    await page.getByLabel('Telefonnummer').fill('0123456789');
    await page.getByLabel('Straße & Hausnummer').fill('Teststr 1');
    await page.getByLabel('PLZ').fill('12345');
    await page.getByLabel('Stadt').fill('Teststadt');
    await page.getByLabel('E-Mail-Adresse').fill('test@example.com');
    await page.getByLabel('Passwort').fill('1234567'); // 7 chars
    
    await page.getByRole('button', { name: 'Registrieren' }).click();

    // Should show error message for 8 characters
    await expect(page.locator('text=Passwort muss mindestens 8 Zeichen lang sein')).toBeVisible();
  });
});
