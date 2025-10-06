<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import CodeEditor from '$lib/components/code-editor/editor.svelte';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import CodeIcon from '@lucide/svelte/icons/code';
	import BoxIcon from '@lucide/svelte/icons/box';
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import { goto } from '$app/navigation';
	import { parseComposeServices, parseEnvVariables, getServicesPreview } from '$lib/utils/compose-parser';
	import { m } from '$lib/paraglide/messages.js';

	let { data } = $props();

	const template = data.template;

	let compose = $state(data.compose);
	let env = $state(data.env);
	let services = $derived(parseComposeServices(compose));
	let envVars = $derived(parseEnvVariables(env));
	let servicesPreview = $derived(getServicesPreview(services));
</script>

<div class="container mx-auto max-w-full space-y-6 overflow-hidden p-2 sm:p-6">
	<div class="space-y-3 sm:space-y-4">
		<Button variant="ghost" onclick={() => goto('/customize/templates')} class="w-fit gap-2">
			<ArrowLeftIcon class="size-4" />
			<span>{m.common_back_to_templates()}</span>
		</Button>

		<div>
			<h1 class="text-xl font-bold break-words sm:text-2xl">{template.name}</h1>
			{#if template.description}
				<p class="text-muted-foreground mt-1.5 text-sm break-words sm:text-base">{template.description}</p>
			{/if}
		</div>

		<div class="flex flex-wrap items-center gap-2">
			{#if template.isRemote}
				<Badge variant="secondary" class="gap-1">
					<GlobeIcon class="size-3" />
					{m.templates_remote()}
				</Badge>
			{:else}
				<Badge variant="secondary" class="gap-1">
					<LayersIcon class="size-3" />
					{m.templates_local()}
				</Badge>
			{/if}
			{#if template.metadata?.tags}
				{@const tags = Array.isArray(template.metadata.tags) ? template.metadata.tags : [template.metadata.tags]}
				{#each tags as tag}
					<Badge variant="outline">{tag}</Badge>
				{/each}
			{/if}
		</div>

		<div class="flex flex-col gap-2 sm:flex-row">
			<Button onclick={() => goto(`/projects/new?templateId=${template.id}`)} class="w-full gap-2 sm:w-auto">
				<FolderIcon class="size-4" />
				{m.compose_create_project()}
			</Button>
		</div>
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
		<Card.Root variant="subtle">
			<Card.Content class="flex items-center gap-4 p-4">
				<div class="flex size-12 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
					<BoxIcon class="size-6 text-blue-500" />
				</div>
				<div class="min-w-0 flex-1">
					<div class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{m.compose_services()}</div>
					<div class="mt-1 flex flex-wrap items-baseline gap-2">
						<div class="text-2xl font-bold">{services.length}</div>
						{#if servicesPreview}
							<div class="text-muted-foreground truncate text-sm">{servicesPreview}</div>
						{/if}
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root variant="subtle">
			<Card.Content class="flex items-center gap-4 p-4">
				<div class="flex size-12 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
					<FileTextIcon class="size-6 text-purple-500" />
				</div>
				<div class="min-w-0 flex-1">
					<div class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{m.environment_variables()}</div>
					<div class="mt-1 flex flex-wrap items-baseline gap-2">
						<div class="text-2xl font-bold">{envVars.length}</div>
						{#if envVars.length > 0}
							<div class="text-muted-foreground text-sm">Configurable settings</div>
						{/if}
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<div class="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
		<Card.Root class="flex min-w-0 flex-col lg:col-span-1 xl:col-span-2">
			<Card.Header icon={CodeIcon}>
				<div class="flex flex-col space-y-1.5">
					<Card.Title>
						<h2>Docker Compose</h2>
					</Card.Title>
					<Card.Description>Service definitions and configurations</Card.Description>
				</div>
			</Card.Header>
			<Card.Content class="h-full w-full p-0 [&_.cm-content]:text-xs sm:[&_.cm-content]:text-sm">
				<CodeEditor bind:value={compose} language="yaml" class="rounded-t-none rounded-b-xl border-t-0" height="100%" />
			</Card.Content>
		</Card.Root>

		<div class="min-w-0 space-y-6 lg:col-span-1">
			{#if services.length > 0}
				<Card.Root class="min-w-0">
					<Card.Header icon={BoxIcon}>
						<div class="flex flex-col space-y-1.5">
							<Card.Title>
								<h2>Services</h2>
							</Card.Title>
							<Card.Description>Containers that will be created</Card.Description>
						</div>
					</Card.Header>
					<Card.Content class="grid grid-cols-1 gap-2 p-4">
						{#each services as service}
							<Card.Root variant="subtle" class="min-w-0">
								<Card.Content class="flex min-w-0 items-center gap-3 p-3">
									<div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
										<BoxIcon class="size-4 text-blue-500" />
									</div>
									<div class="min-w-0 flex-1 truncate font-mono text-sm font-semibold">{service}</div>
								</Card.Content>
							</Card.Root>
						{/each}
					</Card.Content>
				</Card.Root>
			{/if}

			{#if env && envVars.length > 0}
				<Card.Root class="min-w-0">
					<Card.Header icon={FileTextIcon}>
						<div class="flex flex-col space-y-1.5">
							<Card.Title>
								<h2>{m.environment_variables()}</h2>
							</Card.Title>
							<Card.Description>Default configuration values</Card.Description>
						</div>
					</Card.Header>
					<Card.Content class="grid grid-cols-1 gap-2 p-4">
						{#each envVars as envVar}
							<Card.Root variant="subtle" class="min-w-0">
								<Card.Content class="flex min-w-0 flex-col gap-2 p-3">
									<div class="text-muted-foreground truncate text-xs font-semibold tracking-wide uppercase">{envVar.key}</div>
									{#if envVar.value}
										<div class="text-foreground min-w-0 font-mono text-sm break-words select-all">{envVar.value}</div>
									{:else}
										<div class="text-muted-foreground text-xs italic">No default value</div>
									{/if}
								</Card.Content>
							</Card.Root>
						{/each}
					</Card.Content>
				</Card.Root>
			{/if}

			{#if env && envVars.length > 0}
				<Card.Root class="min-w-0">
					<Card.Header icon={FileTextIcon}>
						<div class="flex flex-col space-y-1.5">
							<Card.Title>
								<h2>{m.environment_file()}</h2>
							</Card.Title>
							<Card.Description>Raw .env configuration</Card.Description>
						</div>
					</Card.Header>
					<Card.Content class="w-full overflow-auto p-0 [&_.cm-content]:text-xs sm:[&_.cm-content]:text-sm">
						<CodeEditor bind:value={env} language="env" class="rounded-t-none rounded-b-xl border-t-0" height="100%" />
					</Card.Content>
				</Card.Root>
			{/if}
		</div>
	</div>
</div>
