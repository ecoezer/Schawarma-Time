# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: verify-auth.spec.ts >> Auth Page Verification >> should validate password length (min 8 characters)
- Location: tests/verify-auth.spec.ts:51:3

# Error details

```
Error: locator.fill: Error: strict mode violation: getByLabel('Passwort') resolved to 2 elements:
    1) <input value="" required="" id="passwort" type="password" placeholder="••••••••" class="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-[15px] text-gray-900 placeholder:text-gray-400 transition-all focus:outline-none focus:border-[#142328] focus:ring-1 focus:ring-[#142328] disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 pl-11 pr-11"/> aka getByRole('textbox', { name: 'Passwort*' })
    2) <button type="button" aria-label="Passwort anzeigen" class="hover:text-gray-600 transition-colors focus:outline-none">…</button> aka getByRole('button', { name: 'Passwort anzeigen' })

Call log:
  - waiting for getByLabel('Passwort')

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
        - heading "Konto erstellen" [level=1] [ref=e31]
        - paragraph [ref=e32]: Erstelle ein Konto für ein schnelleres Bestellerlebnis.
      - generic [ref=e33]:
        - generic [ref=e34]:
          - generic [ref=e35]:
            - generic [ref=e36]: Vollständiger Name*
            - generic [ref=e37]:
              - img [ref=e39]
              - textbox "Vollständiger Name*" [ref=e42]:
                - /placeholder: Max Mustermann
                - text: Test User
          - generic [ref=e43]:
            - generic [ref=e44]: Telefonnummer*
            - generic [ref=e45]:
              - img [ref=e47]
              - textbox "Telefonnummer*" [ref=e49]:
                - /placeholder: 05069 8067500
                - text: "0123456789"
          - generic [ref=e50]:
            - generic [ref=e51]: Straße & Hausnummer*
            - generic [ref=e52]:
              - img [ref=e54]
              - textbox "Straße & Hausnummer*" [ref=e57]:
                - /placeholder: Hauptstraße 74
                - text: Teststr 1
          - generic [ref=e58]:
            - generic [ref=e59]:
              - generic [ref=e60]: PLZ*
              - textbox "PLZ*" [ref=e62]:
                - /placeholder: "31171"
                - text: "12345"
            - generic [ref=e63]:
              - generic [ref=e64]: Stadt*
              - textbox "Stadt*" [ref=e66]:
                - /placeholder: Nordstemmen
                - text: Teststadt
        - generic [ref=e67]:
          - generic [ref=e68]: E-Mail-Adresse*
          - generic [ref=e69]:
            - img [ref=e71]
            - textbox "E-Mail-Adresse*" [active] [ref=e74]:
              - /placeholder: name@beispiel.de
              - text: test@example.com
        - generic [ref=e76]:
          - generic [ref=e77]: Passwort*
          - generic [ref=e78]:
            - img [ref=e80]
            - textbox "Passwort*" [ref=e83]:
              - /placeholder: ••••••••
            - button "Passwort anzeigen" [ref=e85]:
              - img [ref=e86]
        - button "Registrieren" [ref=e89]:
          - text: Registrieren
          - img [ref=e90]
      - generic [ref=e92]:
        - text: Bereits ein Konto?
        - button "Hier anmelden" [ref=e93]
  - contentinfo [ref=e94]:
    - generic [ref=e95]:
      - generic [ref=e96]:
        - generic [ref=e97]:
          - generic [ref=e99]: Schawarma-Time
          - paragraph [ref=e100]: Die besten Smash Burger in Hildesheim – frisch, saftig und unwiderstehlich!
        - generic [ref=e101]:
          - heading "Kontakt" [level=3] [ref=e102]
          - list [ref=e103]:
            - listitem [ref=e104]:
              - img [ref=e105]
              - generic [ref=e108]:
                - text: Bahnhofsallee 14a,
                - text: 31134 Hildesheim
            - listitem [ref=e109]:
              - img [ref=e110]
              - link "05069 8067500" [ref=e112] [cursor=pointer]:
                - /url: tel:050698067500
            - listitem [ref=e113]:
              - img [ref=e114]
              - link "info@schawarma-time.de" [ref=e117] [cursor=pointer]:
                - /url: mailto:info@schawarma-time.de
        - generic [ref=e118]:
          - heading "Öffnungszeiten" [level=3] [ref=e119]
          - list [ref=e120]:
            - listitem [ref=e121]:
              - generic [ref=e122]: Mo – Do
              - generic [ref=e123]: 11:30 – 22:00
            - listitem [ref=e124]:
              - generic [ref=e125]: Fr – Sa
              - generic [ref=e126]: 11:30 – 23:00
            - listitem [ref=e127]:
              - generic [ref=e128]: Sonntag
              - generic [ref=e129]: 11:30 – 22:00
          - generic [ref=e130]:
            - img [ref=e131]
            - generic [ref=e134]: Lieferung bis 30 Min. vor Schließung
        - generic [ref=e135]:
          - heading "Rechtliches" [level=3] [ref=e136]
          - list [ref=e137]:
            - listitem [ref=e138]:
              - link "Impressum" [ref=e139] [cursor=pointer]:
                - /url: /impressum
            - listitem [ref=e140]:
              - link "Datenschutzerklärung" [ref=e141] [cursor=pointer]:
                - /url: /datenschutz
            - listitem [ref=e142]:
              - link "AGB" [ref=e143] [cursor=pointer]:
                - /url: /agb
            - listitem [ref=e144]:
              - link "Cookie-Einstellungen" [ref=e145] [cursor=pointer]:
                - /url: /cookie-einstellungen
      - generic [ref=e146]:
        - paragraph [ref=e147]: © 2026 Schawarma-Time. Alle Rechte vorbehalten.
        - paragraph [ref=e148]: Halal zertifiziert 🌱 · Hildesheim, Deutschland
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
  30 |     await toggleButton.click();
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
> 61 |     await page.getByLabel('Passwort').fill('1234567'); // 7 chars
     |                                       ^ Error: locator.fill: Error: strict mode violation: getByLabel('Passwort') resolved to 2 elements:
  62 |     
  63 |     await page.getByRole('button', { name: 'Registrieren' }).click();
  64 | 
  65 |     // Should show error message for 8 characters
  66 |     await expect(page.locator('text=Passwort muss mindestens 8 Zeichen lang sein')).toBeVisible();
  67 |   });
  68 | });
  69 | 
```