# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: verify-auth.spec.ts >> Auth Page Verification >> should toggle password visibility
- Location: tests/verify-auth.spec.ts:18:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel('Passwort anzeigen')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e7]:
        - link "Schawarma-Time" [ref=e8] [cursor=pointer]:
          - /url: /
          - img "Schawarma-Time" [ref=e9]
        - link "05069 8067500" [ref=e10] [cursor=pointer]:
          - /url: tel:050698067500
          - img [ref=e11]
          - generic [ref=e13]: 05069 8067500
      - generic [ref=e14]:
        - button "0" [ref=e15]:
          - img [ref=e16]
          - generic [ref=e20]: "0"
        - generic [ref=e22]:
          - link "Anmelden" [ref=e23] [cursor=pointer]:
            - /url: /login
          - link "Registrieren" [ref=e24] [cursor=pointer]:
            - /url: /register
  - main [ref=e25]:
    - generic [ref=e27]:
      - generic [ref=e28]:
        - img "Logo" [ref=e30]
        - heading "Willkommen zurück" [level=1] [ref=e31]
        - paragraph [ref=e32]: Melde dich an, um mit deiner Bestellung fortzufahren.
      - generic [ref=e33]:
        - generic [ref=e34]:
          - generic [ref=e35]: E-Mail-Adresse*
          - generic [ref=e36]:
            - img [ref=e38]
            - textbox "E-Mail-Adresse*" [ref=e41]:
              - /placeholder: name@beispiel.de
        - generic [ref=e42]:
          - generic [ref=e43]:
            - generic [ref=e44]: Passwort*
            - generic [ref=e45]:
              - img [ref=e47]
              - textbox "Passwort*" [ref=e50]:
                - /placeholder: ••••••••
              - button "Passwort verbergen" [active] [ref=e52]:
                - img [ref=e53]
          - button "Passwort vergessen?" [ref=e59]
        - button "Anmelden" [ref=e60]:
          - text: Anmelden
          - img [ref=e61]
      - generic [ref=e63]:
        - text: Noch kein Konto?
        - button "Jetzt registrieren" [ref=e64]
      - generic [ref=e65]:
        - generic [ref=e66]:
          - img [ref=e67]
          - paragraph [ref=e70]: Spare Zeit beim Checkout durch gespeicherte Adressen.
        - paragraph [ref=e71]:
          - text: Keine Bestätigungs-E-Mail erhalten?
          - button "Erneut senden" [ref=e72]
  - contentinfo [ref=e73]:
    - generic [ref=e74]:
      - generic [ref=e75]:
        - generic [ref=e76]:
          - generic [ref=e78]: Schawarma-Time
          - paragraph [ref=e79]: Die besten Smash Burger in Hildesheim – frisch, saftig und unwiderstehlich!
        - generic [ref=e80]:
          - heading "Kontakt" [level=3] [ref=e81]
          - list [ref=e82]:
            - listitem [ref=e83]:
              - img [ref=e84]
              - generic [ref=e87]:
                - text: Bahnhofsallee 14a,
                - text: 31134 Hildesheim
            - listitem [ref=e88]:
              - img [ref=e89]
              - link "05069 8067500" [ref=e91] [cursor=pointer]:
                - /url: tel:050698067500
            - listitem [ref=e92]:
              - img [ref=e93]
              - link "info@schawarma-time.de" [ref=e96] [cursor=pointer]:
                - /url: mailto:info@schawarma-time.de
        - generic [ref=e97]:
          - heading "Öffnungszeiten" [level=3] [ref=e98]
          - list [ref=e99]:
            - listitem [ref=e100]:
              - generic [ref=e101]: Mo – Do
              - generic [ref=e102]: 11:30 – 22:00
            - listitem [ref=e103]:
              - generic [ref=e104]: Fr – Sa
              - generic [ref=e105]: 11:30 – 23:00
            - listitem [ref=e106]:
              - generic [ref=e107]: Sonntag
              - generic [ref=e108]: 11:30 – 22:00
          - generic [ref=e109]:
            - img [ref=e110]
            - generic [ref=e113]: Lieferung bis 30 Min. vor Schließung
        - generic [ref=e114]:
          - heading "Rechtliches" [level=3] [ref=e115]
          - list [ref=e116]:
            - listitem [ref=e117]:
              - link "Impressum" [ref=e118] [cursor=pointer]:
                - /url: /impressum
            - listitem [ref=e119]:
              - link "Datenschutzerklärung" [ref=e120] [cursor=pointer]:
                - /url: /datenschutz
            - listitem [ref=e121]:
              - link "AGB" [ref=e122] [cursor=pointer]:
                - /url: /agb
            - listitem [ref=e123]:
              - link "Cookie-Einstellungen" [ref=e124] [cursor=pointer]:
                - /url: /cookie-einstellungen
      - generic [ref=e125]:
        - paragraph [ref=e126]: © 2026 Schawarma-Time. Alle Rechte vorbehalten.
        - paragraph [ref=e127]: Halal zertifiziert 🌱 · Hildesheim, Deutschland
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Auth Page Verification', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // Ensure the server is up and navigate to login
  6  |     await page.goto('http://localhost:5173/login');
  7  |   });
  8  | 
  9  |   test('should display the correct logo and not S47', async ({ page }) => {
  10 |     // The logo should be an img tag now, not a div with S47
  11 |     const logo = page.locator('img[alt="Logo"]');
  12 |     await expect(logo).toBeVisible();
  13 |     
  14 |     const s47Text = await page.textContent('body');
  15 |     expect(s47Text).not.toContain('S47');
  16 |   });
  17 | 
  18 |   test('should toggle password visibility', async ({ page }) => {
  19 |     const passwordInput = page.locator('input[type="password"]');
  20 |     await expect(passwordInput).toBeVisible();
  21 | 
  22 |     // Find the toggle button using its aria-label
  23 |     const toggleButton = page.getByLabel('Passwort anzeigen');
  24 |     await toggleButton.click();
  25 | 
  26 |     // After clicking, the input should be type="text"
  27 |     await expect(page.locator('input[type="text"]')).toBeVisible();
  28 |     
  29 |     // Toggle back
> 30 |     await toggleButton.click();
     |                        ^ Error: locator.click: Test timeout of 30000ms exceeded.
  31 |     await expect(page.locator('input[type="password"]')).toBeVisible();
  32 |   });
  33 | 
  34 |   test('should navigate between login and register', async ({ page }) => {
  35 |     const registerLink = page.getByRole('button', { name: 'Jetzt registrieren' });
  36 |     await registerLink.click();
  37 | 
  38 |     // URL should update
  39 |     await expect(page).toHaveURL(/.*\/register/);
  40 | 
  41 |     // Registration specific fields should appear
  42 |     await expect(page.getByLabel('Vollständiger Name')).toBeVisible();
  43 |     await expect(page.getByLabel('Telefonnummer')).toBeVisible();
  44 | 
  45 |     // Toggle back to login
  46 |     const loginLink = page.getByRole('button', { name: 'Hier anmelden' });
  47 |     await loginLink.click();
  48 |     await expect(page).toHaveURL(/.*\/login/);
  49 |   });
  50 | 
  51 |   test('should validate password length (min 8 characters)', async ({ page }) => {
  52 |     // Go to register to see validation
  53 |     await page.goto('http://localhost:5173/register');
  54 |     
  55 |     await page.getByLabel('Vollständiger Name').fill('Test User');
  56 |     await page.getByLabel('Telefonnummer').fill('0123456789');
  57 |     await page.getByLabel('Straße & Hausnummer').fill('Teststr 1');
  58 |     await page.getByLabel('PLZ').fill('12345');
  59 |     await page.getByLabel('Stadt').fill('Teststadt');
  60 |     await page.getByLabel('E-Mail-Adresse').fill('test@example.com');
  61 |     await page.getByLabel('Passwort').fill('1234567'); // 7 chars
  62 |     
  63 |     await page.getByRole('button', { name: 'Registrieren' }).click();
  64 | 
  65 |     // Should show error message for 8 characters
  66 |     await expect(page.locator('text=Passwort muss mindestens 8 Zeichen lang sein')).toBeVisible();
  67 |   });
  68 | });
  69 | 
```