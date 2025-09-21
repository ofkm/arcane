import type { Page } from '@playwright/test';

export type Project = {
  id?: string;
  name?: string;
  status?: string;
  serviceCount?: number;
  [key: string]: any;
};

export type NetworkSummary = {
  id: string;
  name: string;
  driver?: string;
  scope?: string;
};

export type ContainerSummary = {
  id: string;
  names?: string[];
  image?: string;
  state: string;
  status?: string;
  created?: number;
};

export type Paginated<T> = { data: T[]; pagination?: { totalItems?: number } };

async function retry<T>(fn: () => Promise<T>, maxRetries: number, delayMs = 1000): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (e) {
      attempt++;
      if (attempt >= maxRetries) throw e;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

export async function fetchVolumesWithRetry(page: Page, maxRetries = 1): Promise<any[]> {
  return retry(async () => {
    const res = await page.request.get('/api/volumes');
    const json = await res.json();
    return Array.isArray(json?.data) ? json.data : [];
  }, maxRetries);
}

const PROJECTS_ENDPOINT = '/api/environments/0/projects';
export async function fetchProjectsWithRetry(page: Page, maxRetries = 3): Promise<Project[]> {
  return retry(async () => {
    const res = await page.request.get(PROJECTS_ENDPOINT);
    const body = await res.json().catch(() => null as any);
    if (Array.isArray(body)) return body;
    if (Array.isArray(body?.data)) return body.data;
    if (Array.isArray(body?.projects)) return body.projects;
    return [];
  }, maxRetries);
}

export async function fetchNetworksWithRetry(page: Page, maxRetries = 3): Promise<NetworkSummary[]> {
  return retry(
    async () => {
      const res = await page.request.get('/api/networks');
      const json = await res.json().catch(() => null);
      const data = Array.isArray(json) ? json : json?.data?.data ?? json?.data ?? [];
      return (data ?? []) as NetworkSummary[];
    },
    maxRetries,
    800
  );
}

export async function fetchImagesWithRetry(page: Page, maxRetries = 3): Promise<any[]> {
  return retry(async () => {
    const res = await page.request.get('/api/environments/0/images');
    if (!res.ok()) throw new Error(`HTTP ${res.status()}`);
    const body = await res.json().catch(() => null as any);
    return Array.isArray(body?.data) ? body.data : [];
  }, maxRetries);
}

export async function fetchContainersWithRetry(page: Page, maxRetries = 3): Promise<Paginated<ContainerSummary>> {
  return retry(async () => {
    const res = await page.request.get('/api/environments/0/containers');
    if (!res.ok()) throw new Error(`HTTP ${res.status()}`);
    const body = await res.json().catch(() => null as any);
    const data = Array.isArray(body?.data) ? (body.data as ContainerSummary[]) : [];
    const pagination = body?.pagination || { totalItems: data.length };
    return { data, pagination };
  }, maxRetries);
}
