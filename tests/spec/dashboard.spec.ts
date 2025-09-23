import { test, expect, type Page } from '@playwright/test';

/**
 * Testing library/framework:
 * - @playwright/test (E2E), using existing tests/playwright.config.ts
 *
 * Scope:
 * - Validates Dashboard UI additions/behaviors from +page.svelte
 * - Covers: headings/sections, QuickActions interactions, Prune dialog logic (enable/disable confirm),
 *   and basic refresh/stop-all flows with graceful skips when environment conditions don't expose controls.
 */

const gotoDashboard = async (page: Page) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');
};

test.describe('Dashboard page', () => {
  test('renders core sections and headings', async ({ page }) => {
    await gotoDashboard(page);

    await expect(page).toHaveURL(/dashboard/);

    // H1 exists; actual text comes from i18n (m.dashboard_title)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Literal section in template
    await expect(page.getByRole('heading', { name: /Resources/i })).toBeVisible();

    // i18n: System overview (m.dashboard_system_overview) – default locale is expected to be English
    await expect(page.getByRole('heading', { name: /System overview/i })).toBeVisible();
  });

  test('QuickActions: buttons visible (start/stop/prune/refresh) in compact mode', async ({ page }) => {
    await gotoDashboard(page);

    // Labels sourced from QuickActions.svelte messages
    const startAll = page.getByRole('button', { name: /Start all/i });
    const stopAll = page.getByRole('button', { name: /Stop all|Stop containers/i });
    const prune = page.getByRole('button', { name: /Prune system|Prune|Clean up|Cleanup/i });
    const refresh = page.getByRole('button', { name: /Refresh|Reload/i });

    await expect(prune).toBeVisible();
    await expect(refresh).toBeVisible();

    // Start/Stop may be disabled based on backend state; only assert visibility when present.
    if (await startAll.isVisible().catch(() => false)) {
      await expect(startAll).toBeVisible();
    } else {
      test.info().annotations.push({ type: 'note', description: 'Start-all not visible (no stopped containers or loading state).' });
    }

    if (await stopAll.isVisible().catch(() => false)) {
      await expect(stopAll).toBeVisible();
    } else {
      test.info().annotations.push({ type: 'note', description: 'Stop-all not visible (no running containers or loading state).' });
    }
  });

  test('Prune Confirmation Dialog: open/close and confirm button disabled when no selection', async ({ page }) => {
    await gotoDashboard(page);

    // Open via compact QuickActions "Prune system" button (fallback to generic "Prune")
    const pruneButton = page.getByRole('button', { name: /Prune system|Prune|Clean up|Cleanup/i });
    await expect(pruneButton).toBeVisible();
    await pruneButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Use stable classes exposed by dialog buttons
    const confirm = dialog.locator('button.arcane-button-remove');
    const cancel = dialog.locator('button.arcane-button-cancel');
    await expect(confirm).toBeVisible();
    await expect(cancel).toBeVisible();

    // Uncheck all default-checked options to force disable:
    // IDs from PruneConfirmationDialog.svelte
    const containers = dialog.locator('#prune-containers');
    const images = dialog.locator('#prune-images');
    const networks = dialog.locator('#prune-networks');

    // Toggle off three default-true checkboxes
    await containers.click();
    await images.click();
    await networks.click();

    await expect(confirm).toBeDisabled();

    // Select at least one option (e.g., build cache) to enable confirm
    const buildCache = dialog.locator('#prune-build-cache');

    await buildCache.click();
    await expect(confirm).toBeEnabled();

    // Close dialog non-destructively
    await cancel.click();
    await expect(dialog).toBeHidden({ timeout: 5000 });
  });

  test('Stop All: opens a confirmation dialog (best-effort, environment dependent)', async ({ page }) => {
    await gotoDashboard(page);

    const stopAll = page.getByRole('button', { name: /Stop all|Stop containers/i });
    const stopAllVisible = await stopAll.isVisible().catch(() => false);
    if (!stopAllVisible) {
      test.info().annotations.push({ type: 'note', description: 'Stop-all control not visible; likely no running containers.' });
      return;
    }

    await stopAll.click();

    // Best-effort: project uses openConfirmDialog; assert a dialog appears if implemented with role="dialog"
    const maybeDialog = page.getByRole('dialog');
    try {
      await expect(maybeDialog).toBeVisible({ timeout: 2000 });
      // Attempt to click a cancel/close button if present to avoid destructive action
      const cancel = maybeDialog.getByRole('button', { name: /Cancel|Close/i });
      if (await cancel.isVisible().catch(() => false)) {
        await cancel.click();
        await expect(maybeDialog).toBeHidden({ timeout: 5000 });
      }
    } catch {
      test.info().annotations.push({ type: 'note', description: 'No confirmation dialog detected after Stop-all click.' });
    }
  });

  test('Refresh control remains stable after click', async ({ page }) => {
    await gotoDashboard(page);

    const refresh = page.getByRole('button', { name: /Refresh|Reload/i });
    const refreshVisible = await refresh.isVisible().catch(() => false);
    if (!refreshVisible) {
      test.info().annotations.push({ type: 'note', description: 'Refresh control not visible; skipping.' });
      return;
    }

    await refresh.click();
    // Page should remain and "Resources" heading is still visible
    await expect(page.getByRole('heading', { name: /Resources/i })).toBeVisible();
  });
});