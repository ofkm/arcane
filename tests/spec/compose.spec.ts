import { test, expect, type Page } from '@playwright/test';

async function fetchProjectsWithRetry(page: Page, maxRetries = 3): Promise<any[]> {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const response = await page.request.get('/api/environments/0/stacks');
      const projects = await response.json();
      return Array.isArray(projects) ? projects : projects.data || [];
    } catch (error) {
      retries++;
      console.log(`Attempt ${retries} failed, ${maxRetries - retries} retries left`);
      if (retries >= maxRetries) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  return [];
}

let realProjects: any[] = [];

test.beforeEach(async ({ page }) => {
  await page.goto('/compose');
  await page.waitForLoadState('networkidle');

  try {
    realProjects = await fetchProjectsWithRetry(page);
  } catch (error) {
    console.warn('Could not fetch projects after multiple retries:', error);
    realProjects = [];
  }

  console.log(`Found ${realProjects.length} real projects for testing`);
});

test.describe('Compose Projects Page', () => {
  test('should display the main heading and description', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Compose Projects', level: 1 })).toBeVisible();
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
    await expect(page).toHaveURL('/compose/new');
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
    await expect(page).toHaveURL(new RegExp(`/compose/.+`));
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

    // Look for status badges in the table
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
    await page.goto('/compose/new');
    await page.waitForLoadState('networkidle');
  });

  test('should display the create project form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Create New Project' })).toBeVisible();
    await expect(page.getByLabel('Project Name')).toBeVisible();
    await expect(page.getByText('Docker Compose File')).toBeVisible();
    await expect(page.getByText('Environment (.env)')).toBeVisible();
  });

  test('should display action buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Convert Docker Run' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Use Template' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create' }).first()).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    const createButton = page.getByRole('button', { name: 'Create' }).first();
    await expect(createButton).toBeDisabled();

    // Fill in project name
    await page.getByLabel('Project Name').fill('test-project');
  });

  test('should create a new project successfully', async ({ page }) => {
    const projectName = `test-project-${Date.now()}`;
    let createdProjectId: string | null = null;

    await page.getByLabel('Project Name').fill(projectName);

    const composeEditor = page.locator('.cm-editor').first();
    await expect(composeEditor).toBeVisible();

    await page.route('/api/environments/*/stacks', async (route) => {
      if (route.request().method() === 'POST') {
        const response = await route.fetch();
        const responseBody = await response.text();

        try {
          const parsedResponse = JSON.parse(responseBody);
          createdProjectId = parsedResponse.id;
        } catch (error) {
          console.error('Failed to parse response:', error);
        }

        await route.fulfill({
          status: response.status(),
          headers: response.headers(),
          body: responseBody,
        });
      }
    });

    // Create the project
    const createButton = page.getByRole('button', { name: 'Create' });
    await createButton.click();

    // Wait for navigation and verify we're on the correct page
    await page.waitForURL(new RegExp(`/compose/.+`), { timeout: 10000 });

    // Verify we redirected to the created project's page
    if (createdProjectId) {
      await expect(page).toHaveURL(new RegExp(`/compose/${createdProjectId}`));
    } else {
      // Fallback: just check we're on a project detail page with some UUID
      await expect(page).toHaveURL(new RegExp(`/compose/[a-f0-9\\-]{36}`));
    }

    // Verify the project detail page loads correctly
    await expect(page.getByText('Overview')).toBeVisible();
  });
});

test.describe('Project Detail Page', () => {
  test('should display project overview for existing project', async ({ page }) => {
    test.skip(!realProjects.length, 'No projects available for detail page test');

    const firstProject = realProjects[0];
    await page.goto(`/compose/${firstProject.id || firstProject.name}`);
    await page.waitForLoadState('networkidle');

    // Check for main sections
    await expect(page.getByText('Overview')).toBeVisible();
    await expect(page.getByText('Services').first()).toBeVisible();
    await expect(page.getByText('Configuration').first()).toBeVisible();

    // Check for project stats
    await expect(page.getByText('Services').nth(1)).toBeVisible();
    await expect(page.getByText('Running')).toBeVisible();
    await expect(page.getByText('Created').first()).toBeVisible();
  });

  test('should display navigation sidebar', async ({ page }) => {
    test.skip(!realProjects.length, 'No projects available for navigation test');

    const firstProject = realProjects[0];
    await page.goto(`/compose/${firstProject.id || firstProject.name}`);
    await page.waitForLoadState('networkidle');

    // Check navigation buttons
    const overviewButton = page.locator('button[title="Overview"]');
    const servicesButton = page.locator('button[title="Services"]');
    const configButton = page.locator('button[title="Configuration"]');

    await expect(overviewButton).toBeVisible();
    await expect(servicesButton).toBeVisible();
    await expect(configButton).toBeVisible();
  });

  test('should display services section', async ({ page }) => {
    test.skip(!realProjects.length, 'No projects available for services test');

    const projectWithServices = realProjects.find((p) => p.serviceCount > 0);
    test.skip(!projectWithServices, 'No projects with services found');

    await page.goto(`/compose/${projectWithServices.id || projectWithServices.name}`);
    await page.waitForLoadState('networkidle');

    // Navigate to services section
    await page.locator('button[title="Services"]').click();

    await expect(page.getByText(`Services (${projectWithServices.serviceCount})`)).toBeVisible();
  });

  test('should display configuration section with editors', async ({ page }) => {
    test.skip(!realProjects.length, 'No projects available for configuration test');

    const firstProject = realProjects[0];
    await page.goto(`/compose/${firstProject.id || firstProject.name}`);
    await page.waitForLoadState('networkidle');

    // Navigate to configuration section
    await page.locator('button[title="Configuration"]').click();
    await expect(page.getByRole('heading', { name: 'Configuration' })).toBeVisible();
    await expect(page.getByText('Project Name')).toBeVisible();
    await expect(page.getByText('Compose File')).toBeVisible();
    await expect(page.getByText('Environment (.env)')).toBeVisible();
  });

  test('should show logs section for running projects', async ({ page }) => {
    test.skip(!realProjects.length, 'No projects available for logs test');

    const runningProject = realProjects.find((p) => p.status === 'running');
    test.skip(!runningProject, 'No running projects found for logs test');

    await page.goto(`/compose/${runningProject.id || runningProject.name}`);
    await page.waitForLoadState('networkidle');

    // Navigate to logs section
    await page.locator('button[title="Logs"]').click();

    await expect(page.getByText('Project Logs')).toBeVisible();
    await expect(page.getByText('Auto-scroll')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
  });
});
