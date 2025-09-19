<script lang="ts">
	import type { ContainerPorts } from '$lib/types/container.type';
	import { m } from '$lib/paraglide/messages';

	let { ports = [] as ContainerPorts[], baseServerUrl = '' } = $props<{
		ports?: ContainerPorts[];
		baseServerUrl?: string;
	}>();

	type NormalizedPort = {
		hostPort: string;
		containerPort: string;
		proto?: string;
		ip?: string | null;
	};

	function getPublicPort(p: ContainerPorts): string | null {
		return (p as any).publicPort?.toString?.() ?? (p as any).hostPort?.toString?.() ?? (p as any).published?.toString?.() ?? null;
	}

	function getPrivatePort(p: ContainerPorts): string {
		return ((p as any).privatePort ?? (p as any).target ?? '?').toString();
	}

	function getProto(p: ContainerPorts): string | undefined {
		return (p as any).type ?? (p as any).protocol ?? undefined;
	}

	function normalize(p: ContainerPorts): NormalizedPort | null {
		const hostPort = getPublicPort(p);
		if (!hostPort) return null;
		return {
			hostPort,
			containerPort: getPrivatePort(p),
			proto: getProto(p),
			ip: (p as any).ip ?? null
		};
	}

	function uniquePublished(list: ContainerPorts[]): NormalizedPort[] {
		const map = new Map<string, NormalizedPort>();
		for (const p of list) {
			const n = normalize(p);
			if (!n) continue;
			const key = `${n.hostPort}:${n.containerPort}/${n.proto ?? ''}`;
			if (!map.has(key)) map.set(key, n);
		}
		return Array.from(map.values()).sort((a, b) => {
			const hp = Number(a.hostPort) - Number(b.hostPort);
			if (hp !== 0) return hp;
			return Number(a.containerPort) - Number(b.containerPort);
		});
	}

	function toHref(hostPort: string): string {
		try {
			const base = baseServerUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
			const url = new URL(base.startsWith('http') ? base : `http://${base}`);
			url.port = hostPort;
			return url.toString();
		} catch {
			return '#';
		}
	}

	const published = $derived(uniquePublished(ports));
</script>

{#if !published || published.length === 0}
	<span class="text-muted-foreground text-xs">{m.containers_not_published()}</span>
{:else}
	<div class="flex flex-wrap gap-1.5">
		{#each published as p, i (i)}
			<a
				class="ring-offset-background focus-visible:ring-ring bg-background/70 inline-flex items-center gap-1 rounded-lg border border-sky-700/20 px-2 py-1 text-[11px] shadow-sm transition-colors transition-shadow hover:border-sky-700/40 hover:bg-sky-500/10 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
				href={toHref(p.hostPort)}
				target="_blank"
				rel="noopener noreferrer"
				title={`${p.ip ?? '0.0.0.0'}:${p.hostPort} → ${p.containerPort}${p.proto ? `/${p.proto}` : ''}`}
			>
				<span class="font-medium tabular-nums">{p.hostPort}:{p.containerPort}</span>
				{#if p.proto}
					<span class="text-muted-foreground uppercase">{p.proto}</span>
				{/if}
			</a>
		{/each}
	</div>
{/if}
