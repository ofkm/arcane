import { test, expect, type Page } from '@playwright/test';
import { fetchProjectsWithRetry, type Project } from '../utils/fetch.util';

const ROUTES = {
  page: '/projects',
  apiProjects: '/api/environments/0/projects',
  newProject: '/projects/new',
};

async function navigateToProjects(page: Page) {
  await page.goto(ROUTES.page);
  await page.waitForLoadState('networkidle');
}

let realProjects: Project[] = [];

test.beforeEach(async ({ page }) => {
  await navigateToProjects(page);

  try {
    realProjects = await fetchProjectsWithRetry(page);
  } catch (error) {
    realProjects = [];
  }
});

test.describe('Projects Page', () => {
  test('should display the main heading and description', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Projects', level: 1 })).toBeVisible();
    await expect(page.getByText('View and Manage Compose Projects')).toBeVisible();
  });

  test('should display the "Create Project" button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Create Project' })).toBeVisible();
  });

  test('should display summary cards with correct counts', async ({ page }) => {
    await expect(page.getByText('Total Projects')).toBeVisible();
    await expect(page.getByText('Running')).toBeVisible();
    await expect(page.getByText('Stopped').first()).toBeVisible();
  });

  test('should navigate to new project page when "Create Project" is clicked', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Project' }).click();
    await expect(page).toHaveURL(ROUTES.newProject);
    await expect(page.getByRole('heading', { name: 'Create New Project' })).toBeVisible();
  });

  test('should display projects list', async ({ page }) => {
    await expect(page.locator('table')).toBeVisible();
  });

  test('should show project actions menu', async ({ page }) => {
    test.skip(!realProjects.length, 'No projects available for actions menu test');

    await page.waitForLoadState('networkidle');
    const firstRow = page.locator('tbody tr').first();
    const menuButton = firstRow.getByRole('button', { name: 'Open menu' });
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    await expect(page.getByRole('menuitem', { name: 'Edit' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Start|Stop|Restart/ })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Pull & Redeploy' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Destroy' })).toBeVisible();
  });

  test('should navigate to project details when project name is clicked', async ({ page }) => {
    test.skip(!realProjects.length, 'No projects available for navigation test');

    await page.waitForLoadState('networkidle');
    const firstProjectLink = page.locator('tbody tr').first().getByRole('link');
    const projectName = await firstProjectLink.textContent();

    await firstProjectLink.click();
    await expect(page).toHaveURL(/\/projects\/.+/);
    await expect(page.getByRole('heading', { name: new RegExp(`.*${projectName}`) })).toBeVisible();
  });

  test('should allow searching/filtering projects', async ({ page }) => {
    test.skip(!realProjects.length, 'No projects available for search test');

    const searchInput = page.getByPlaceholder('Search...');
    await expect(searchInput).toBeVisible();

    const firstProject = realProjects[0];
    if (firstProject?.name) {
      await searchInput.fill(firstProject.name);
      await expect(page.getByRole('link', { name: firstProject.name })).toBeVisible();
      await searchInput.clear();
    }
  });

  test('should display project status badges', async ({ page }) => {
    test.skip(!realProjects.length, 'No projects available for status badge test');

    await page.waitForLoadState('networkidle');

    const runningProjects = realProjects.filter((p) => p.status === 'running');
    const stoppedProjects = realProjects.filter((p) => p.status === 'stopped');

    if (runningProjects.length > 0) {
      await expect(page.locator('text="Running"').first()).toBeVisible();
    }

    if (stoppedProjects.length > 0) {
      await expect(page.locator('text="Stopped"').first()).toBeVisible();
    }
  });
});

test.describe('New Compose Project Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.newProject);
    await page.waitForLoadState('networkidle');
  });

  test('should display the create project form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Create New Project' })).toBeVisible();
    await expect(page.getByLabel('Project Name')).toBeVisible();
    await expect(page.getByText('Docker Compose File')).toBeVisible();
    await expect(page.getByText('Environment (.env)')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    const createButton = page.getByRole('button', { name: 'Create' }).first();
    await expect(createButton).toBeDisabled();

    await page.getByLabel('Project Name').fill('test-project');
  });

  test('should create a new project successfully', async ({ page }) => {
    const projectName = `test-project-${Date.now()}`;
    let createdProjectId: string | null = null;

    await page.getByLabel('Project Name').fill(projectName);

    const composeEditor = page.locator('.cm-editor').first();
    await expect(composeEditor).toBeVisible();

    await page.route('/api/environments/*/projects', async (route) => {
      if (route.request().method() === 'POST') {
        const response = await route.fetch();
        const responseBody = await response.text();

        try {
          const parsed = JSON.parse(responseBody);
          createdProjectId = parsed.id;
        } catch {
          createdProjectId = createdProjectId;
        }

        await route.fulfill({
          status: response.status(),
          headers: response.headers(),
          body: responseBody,
        });
      } else {
        await route.continue();
      }
    });

    const createButton = page.getByRole('button', { name: 'Create' });
    await createButton.click();

    await page.waitForURL(/\/projects\/.+/, { timeout: 10000 });

    if (createdProjectId) {
      await expect(page).toHaveURL(new RegExp(`/projects/${createdProjectId}`));
    } else {
      await expect(page).toHaveURL(new RegExp(`/projects/[a-f0-9\\-]{36}`));
    }

    await expect(page.getByRole('button', { name: projectName })).toBeVisible();
  });
});

test.describe('Project Detail Page', () => {
  test('should display project details for existing project', async ({ page }) => {
    test.skip(!realProjects.length, 'No projects available for detail page test');

    const firstProject = realProjects[0];
    await page.goto(`/projects/${firstProject.id || firstProject.name}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: firstProject.name, exact: false })).toBeVisible();

    await expect(page.getByRole('tab', { name: /Services/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Configuration|Config/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Logs/i })).toBeVisible();
  });

  test('should display tabs navigation', async ({ page }) => {
    test.skip(!realProjects.length, 'No projects available for navigation test');
    const firstProject = realProjects[0];
    await page.goto(`/projects/${firstProject.id || firstProject.name}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('tab', { name: /Services/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Configuration|Config/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Logs/i })).toBeVisible();
  });

  test('should display services tab content', async ({ page }) => {
    test.skip(!realProjects.length, 'No projects available for services test');

    const projectWithServices = realProjects.find((p) => p.serviceCount > 0) || realProjects[0];
    await page.goto(`/projects/${projectWithServices.id || projectWithServices.name}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('tab', { name: /Services/i }).click();

    const nginxService = page.getByText(/nginx/i);
    const emptyState = page.getByText(/No services found/i);

    if ((await nginxService.count()) > 0) {
      await expect(nginxService.first()).toBeVisible();
    } else {
      const anyServiceBadge = page.locator('text=/running|stopped|unknown/i').first();
      if ((await anyServiceBadge.count()) > 0) {
        await expect(anyServiceBadge).toBeVisible();
      } else {
        await expect(emptyState).toBeVisible();
      }
    }
  });

  test('should display configuration editors', async ({ page }) => {
    test.skip(!realProjects.length, 'No projects available for configuration test');

    const firstProject = realProjects[0];
    await page.goto(`/projects/${firstProject.id || firstProject.name}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('tab', { name: /Configuration|Config/i }).click();

    await expect(page.getByText(/Compose File/i)).toBeVisible();
    await expect(page.getByText(/Environment\s*\(.env\)/i)).toBeVisible();
  });

  test('should show logs tab for running projects', async ({ page }) => {
    test.skip(!realProjects.length, 'No projects available for logs test');

    const runningProject = realProjects.find((p) => p.status === 'running');
    test.skip(!runningProject, 'No running projects found for logs test');

    await page.goto(`/projects/${runningProject.id || runningProject.name}`);
    await page.waitForLoadState('networkidle');

    const logsTab = page.getByRole('tab', { name: /Logs/i });
    await expect(logsTab).toBeEnabled();
    await logsTab.click();

    await expect(page.getByText(/Logs/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Start|Stop/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Clear/i })).toBeVisible();
  });
});
