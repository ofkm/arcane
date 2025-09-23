/**
 * EnvironmentAPIService unit tests
 *
 * Framework: Vitest (describe/it/vi/expect) with TypeScript
 * Focus: Methods and behaviors emphasized in recent changes, including:
 *  - Environment ID resolution via environmentStore (selected vs LOCAL_DOCKER_ENVIRONMENT_ID)
 *  - REST endpoint composition and parameter handling (e.g., deleteContainer opts, pruneImages body)
 *  - getContainerStats stream query param handling
 *  - getProject response shape fallback
 *  - pull/deploy flow and streamed pull parsing via deployProjectMaybePull (covers private stream logic)
 *
 * External dependencies are mocked: axios-like this.api on BaseAPIService, environmentStore, and global fetch/streams.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Import the implementation under test
// We locate EnvironmentAPIService via the project source layout.
// If the path differs in your repository, update this import accordingly.
import { EnvironmentAPIService } from '$lib/services/environment-api.service';
import type { Project } from '$lib/types/project.type';

// Mock svelte/store 'get' and environment store module
vi.mock('svelte/store', async () => {
  const actual = await vi.importActual<any>('svelte/store');
  return {
    ...actual,
    get: (store: any) => (typeof store?.__get === 'function' ? store.__get() : undefined),
  };
});

vi.mock('$lib/stores/environment.store', () => {
  const state: { selected?: { id: string } | null; ready?: Promise<void> } = {};
  const ready = Promise.resolve();
  const selected = {
    __get: () => state.selected,
    subscribe: (_: any) => () => {},
  };
  const setSelected = (val: any) => { state.selected = val; };
  const LOCAL_DOCKER_ENVIRONMENT_ID = 'local';
  return {
    environmentStore: { ready, selected },
    LOCAL_DOCKER_ENVIRONMENT_ID,
    __test: { setSelected, state },
  };
});

// A thin subclass to inject a mock api client easily
class TestableEnvironmentAPIService extends EnvironmentAPIService {
  public setApi(api: any) {
    // @ts-expect-error override for testing
    this.api = api;
  }
}

const mockApi = () => {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
};

const { __test, LOCAL_DOCKER_ENVIRONMENT_ID } = vi.mocked(await import('$lib/stores/environment.store'), true) as any;

describe('EnvironmentAPIService', () => {
  let svc: TestableEnvironmentAPIService;
  let api: ReturnType<typeof mockApi>;

  beforeEach(() => {
    api = mockApi();
    svc = new TestableEnvironmentAPIService();
    svc.setApi(api);
    __test.setSelected({ id: 'env-123' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe('environment id resolution', () => {
    it('uses selected environment id when present', async () => {
      api.get.mockResolvedValueOnce({ data: { ok: true } });
      const res = await svc.getContainers();
      expect(api.get).toHaveBeenCalledWith('/environments/env-123/containers', { params: undefined });
      expect(res).toEqual({ ok: true });
    });

    it('falls back to LOCAL_DOCKER_ENVIRONMENT_ID when no selection', async () => {
      __test.setSelected(null);
      api.get.mockResolvedValueOnce({ data: { ok: true } });
      await svc.getDockerInfo();
      expect(api.get).toHaveBeenCalledWith(`/environments/${LOCAL_DOCKER_ENVIRONMENT_ID}/docker/info`);
    });
  });

  describe('containers API', () => {
    it('getContainerStatusCounts returns nested data.data', async () => {
      api.get.mockResolvedValueOnce({ data: { data: { running: 2, stopped: 1 } } });
      const out = await svc.getContainerStatusCounts();
      expect(out).toEqual({ running: 2, stopped: 1 });
      expect(api.get).toHaveBeenCalledWith('/environments/env-123/containers/counts');
    });

    it('getContainerStats adds ?stream=true when stream is true', async () => {
      // handleResponse returns res.data; mock EnvironmentAPIService.handleResponse via api.get returning shape
      const spyHandle = vi.spyOn<any, any>(svc, 'handleResponse').mockResolvedValue({ cpu: 1 } as any);
      await svc.getContainerStats('abc', true);
      expect(spyHandle).toHaveBeenCalled();
      expect(api.get).toHaveBeenCalledWith('/environments/env-123/containers/abc/stats?stream=true');
    });

    it('getContainerStats without stream param', async () => {
      const spyHandle = vi.spyOn<any, any>(svc, 'handleResponse').mockResolvedValue({ mem: 2 } as any);
      await svc.getContainerStats('abc', false);
      expect(api.get).toHaveBeenCalledWith('/environments/env-123/containers/abc/stats');
      expect(spyHandle).toHaveBeenCalled();
    });

    it('deleteContainer passes only defined boolean params as strings', async () => {
      const spyHandle = vi.spyOn<any, any>(svc, 'handleResponse').mockResolvedValue({ ok: true });
      await svc.deleteContainer('c1', { force: true });
      expect(api.delete).toHaveBeenCalledWith('/environments/env-123/containers/c1', { params: { force: 'true' } });
      await svc.deleteContainer('c2', { volumes: false });
      expect(api.delete).toHaveBeenCalledWith('/environments/env-123/containers/c2', { params: { volumes: 'false' } });
      await svc.deleteContainer('c3', {});
      expect(api.delete).toHaveBeenCalledWith('/environments/env-123/containers/c3', { params: {} });
      expect(spyHandle).toHaveBeenCalledTimes(3);
    });
  });

  describe('images API', () => {
    it('getImages returns res.data', async () => {
      api.get.mockResolvedValueOnce({ data: { items: [1], total: 1 } });
      const out = await svc.getImages({ page: 1, pageSize: 10 } as any);
      expect(out).toEqual({ items: [1], total: 1 });
      expect(api.get).toHaveBeenCalledWith('/environments/env-123/images', { params: { page: 1, pageSize: 10 } });
    });

    it('getImageUsageCounts returns data.data', async () => {
      api.get.mockResolvedValueOnce({ data: { data: { usedByContainers: 3 } } });
      const out = await svc.getImageUsageCounts();
      expect(out).toEqual({ usedByContainers: 3 });
    });

    it('pruneImages sends {} when dangling undefined and {dangling:true} when true', async () => {
      const spyHandle = vi.spyOn<any, any>(svc, 'handleResponse').mockResolvedValue({ pruned: true });
      await svc.pruneImages();
      expect(api.post).toHaveBeenCalledWith('/environments/env-123/images/prune', {});
      await svc.pruneImages(true);
      expect(api.post).toHaveBeenCalledWith('/environments/env-123/images/prune', { dangling: true });
      expect(spyHandle).toHaveBeenCalledTimes(2);
    });
  });

  describe('networks API', () => {
    it('getNetworkUsageCounts returns data.data', async () => {
      api.get.mockResolvedValueOnce({ data: { data: { total: 5 } } });
      const out = await svc.getNetworkUsageCounts();
      expect(out).toEqual({ total: 5 });
      expect(api.get).toHaveBeenCalledWith('/environments/env-123/networks/counts');
    });
  });

  describe('volumes API', () => {
    it('getVolumes returns res.data', async () => {
      api.get.mockResolvedValueOnce({ data: { items: ['v1'], total: 1 } });
      const out = await svc.getVolumes();
      expect(out).toEqual({ items: ['v1'], total: 1 });
    });

    it('getVolumeUsageCounts returns data.data', async () => {
      api.get.mockResolvedValueOnce({ data: { data: { usedBy: 2 } } });
      const out = await svc.getVolumeUsageCounts();
      expect(out).toEqual({ usedBy: 2 });
    });
  });

  describe('projects API', () => {
    it('getProjects returns res.data', async () => {
      api.get.mockResolvedValueOnce({ data: { items: [{ id: 'p1' }], total: 1 } });
      const out = await svc.getProjects();
      expect(out).toEqual({ items: [{ id: 'p1' }], total: 1 });
      expect(api.get).toHaveBeenCalledWith('/environments/env-123/projects', { params: undefined });
    });

    it('getProject returns response.project when present', async () => {
      const project: Project = { id: 'p1', name: 'P1' } as any;
      vi.spyOn<any, any>(svc, 'handleResponse').mockResolvedValue({ project, success: true });
      const out = await svc.getProject('p1');
      expect(out).toEqual(project);
    });

    it('getProject falls back to response as Project when project key missing', async () => {
      const project: Project = { id: 'p2', name: 'P2' } as any;
      vi.spyOn<any, any>(svc, 'handleResponse').mockResolvedValue(project);
      const out = await svc.getProject('p2');
      expect(out).toEqual(project);
    });

    it('updateProject sends minimal payload with compose/env', async () => {
      const spyHandle = vi.spyOn<any, any>(svc, 'handleResponse').mockResolvedValue({} as Project);
      await svc.updateProject('web', 'composeYml', 'ENV=1');
      expect(api.put).toHaveBeenCalledWith('/environments/env-123/projects/web', {
        composeContent: 'composeYml',
        envContent: 'ENV=1',
      });
      expect(spyHandle).toHaveBeenCalled();
    });

    it('destroyProject sends body flags', async () => {
      const spyHandle = vi.spyOn<any, any>(svc, 'handleResponse').mockResolvedValue({});
      await svc.destroyProject('web', true, false);
      expect(api.delete).toHaveBeenCalledWith('/environments/env-123/projects/web/destroy', {
        data: { removeVolumes: true, removeFiles: false },
      });
      expect(spyHandle).toHaveBeenCalled();
    });
  });

  describe('pull + deploy flow (stream parsing and pulled flag)', () => {
    const makeStream = (chunks: string[]) => {
      const encoder = new TextEncoder();
      let i = 0;
      return {
        getReader: () => ({
          read: async () => {
            if (i >= chunks.length) return { value: undefined, done: true };
            const value = encoder.encode(chunks[i++]);
            return { value, done: false };
          },
        }),
      } as any;
    };

    beforeEach(() => {
      // default selected environment already set; no change
    });

    it('deployProjectMaybePull returns pulled=true when a downloading status appears', async () => {
      // Mock fetch streaming lines that indicate download
      const ok = true;
      const body = makeStream([
        JSON.stringify({ status: 'Downloading' }) + '\n',
        JSON.stringify({ status: 'Pull complete' }) + '\n',
      ]);
      const fetchMock = vi.fn().mockResolvedValue({ ok, body, status: 200 });
      // @ts-expect-error assign global
      global.fetch = fetchMock;

      // Mock deployProject response
      const project: Project = { id: 'pX', name: 'X' } as any;
      vi.spyOn<any, any>(svc, 'deployProject').mockResolvedValue(project);

      const result = await svc.deployProjectMaybePull('pX');
      expect(result.pulled).toBe(true);
      expect(result.project).toBe(project);
      expect(fetchMock).toHaveBeenCalledWith('/api/environments/env-123/projects/pX/pull', { method: 'POST' });
    });

    it('deployProjectMaybePull returns pulled=true when progressDetail.total > 0 even without status', async () => {
      const ok = true;
      const body = makeStream([
        JSON.stringify({ id: 'layer1', progressDetail: { current: 1, total: 10 } }) + '\n',
      ]);
      const fetchMock = vi.fn().mockResolvedValue({ ok, body, status: 200 });
      // @ts-expect-error
      global.fetch = fetchMock;

      vi.spyOn<any, any>(svc, 'deployProject').mockResolvedValue({ id: 'pY', name: 'Y' } as any);
      const res = await svc.deployProjectMaybePull('pY');
      expect(res.pulled).toBe(true);
    });

    it('pullProjectImages propagates error when fetch fails to start', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue({ ok: false, status: 500, body: undefined });
      // @ts-expect-error
      global.fetch = fetchMock;

      await expect(svc.pullProjectImages('pZ')).rejects.toThrow(/Failed to start project image pull \(500\)/);
    });

    it('pull stream ignores malformed lines and still invokes onLine for valid ones', async () => {
      const lines = [
        'not-json\n',
        JSON.stringify({ status: 'Extracting' }) + '\n',
        '{bad json\n',
        JSON.stringify({ status: 'Done' }) + '\n',
      ];
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, body: makeStream(lines) });
      // @ts-expect-error
      global.fetch = fetchMock;

      const onLine = vi.fn();
      await svc.pullProjectImages('proj-1', onLine);
      // Only the valid JSON lines should be forwarded
      expect(onLine).toHaveBeenCalledTimes(2);
      expect(onLine).toHaveBeenCalledWith(expect.objectContaining({ status: 'Extracting' }));
      expect(onLine).toHaveBeenCalledWith(expect.objectContaining({ status: 'Done' }));
    });
  });
});

describe('EnvironmentAPIService edge cases (appendix)', () => {
  it('deleteImage forwards options as query params and awaits handleResponse', async () => {
    const { describe, it, expect, vi } = await import('vitest');
    const { EnvironmentAPIService } = await import('$lib/services/environment-api.service');
    const svc: any = new (class extends EnvironmentAPIService {
      setApi(api: any) { this.api = api; }
    })();
    const api = { delete: vi.fn() };
    svc.setApi(api);
    vi.spyOn<any, any>(svc, 'getCurrentEnvironmentId').mockResolvedValue('env-X');
    const handleSpy = vi.spyOn<any, any>(svc, 'handleResponse').mockResolvedValue(undefined);

    await svc.deleteImage('img-1', { force: true, noprune: false });
    expect(api.delete).toHaveBeenCalledWith('/environments/env-X/images/img-1', { params: { force: true, noprune: false } });
    expect(handleSpy).toHaveBeenCalled();
  });

  it('getProjectStatusCounts returns data.data and calls correct endpoint', async () => {
    const { describe, it, expect, vi } = await import('vitest');
    const { EnvironmentAPIService } = await import('$lib/services/environment-api.service');
    const svc: any = new (class extends EnvironmentAPIService {
      setApi(api: any) { this.api = api; }
    })();
    const api = { get: vi.fn().mockResolvedValue({ data: { data: { up: 1, down: 0 } } }) };
    svc.setApi(api);
    vi.spyOn<any, any>(svc, 'getCurrentEnvironmentId').mockResolvedValue('env-Y');

    const out = await svc.getProjectStatusCounts();
    expect(out).toEqual({ up: 1, down: 0 });
    expect(api.get).toHaveBeenCalledWith('/environments/env-Y/projects/counts');
  });
});