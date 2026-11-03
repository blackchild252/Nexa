const { test, expect } = require('@playwright/test');

const primaryTabs = ['Home', 'Money', 'Zeeza', 'Dream Marketplace', 'Yaayz', 'L.A.', 'Profile'];

test.describe('NEXA auth-first Royal Dark shell', () => {
  test('unauthenticated users land on the sign-in surface', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Welcome back', { exact: true })).toBeVisible();
    await expect(page.getByText('Sign in', { exact: true }).last()).toBeVisible();
    await expect(page.getByText('Create a NEXA account', { exact: true })).toBeVisible();
  });

  test('signup surface is reachable without authentication', async ({ page }) => {
    await page.goto('/auth/signup');
    await expect(page.getByText('Create your NEXA account', { exact: true })).toBeVisible();
    await expect(page.getByText('Create account', { exact: true })).toBeVisible();
    await expect(page.getByText('Already have an account? Sign in', { exact: true })).toBeVisible();
  });

  test('authenticated shell exposes the current seven primary destinations', async ({ page }) => {
    const email = process.env.NEXA_E2E_EMAIL;
    const password = process.env.NEXA_E2E_PASSWORD;
    test.skip(!email || !password, 'Set NEXA_E2E_EMAIL and NEXA_E2E_PASSWORD for authenticated smoke.');

    await page.goto('/auth/login');
    await page.getByPlaceholder('you@example.com').fill(email);
    await page.getByPlaceholder('Your password').fill(password);
    await page.getByText('Sign in', { exact: true }).last().click();
    await expect(page.getByText('NEXA', { exact: true }).first()).toBeVisible();
    for (const label of primaryTabs) await expect(page.getByText(label, { exact: true }).last()).toBeVisible();
    await expect(page.getByText('Chat', { exact: true }).last()).not.toBeVisible();
    await expect(page.getByText('Dami', { exact: true }).last()).not.toBeVisible();
  });
});
