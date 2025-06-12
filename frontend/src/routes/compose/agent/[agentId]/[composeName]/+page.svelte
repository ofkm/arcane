<script lang="ts">
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { ArrowLeft, FileStack, Layers, Settings, Activity, Users, Play, Square, RotateCcw, Loader2 } from '@lucide/svelte';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { statusVariantMap } from '$lib/types/statuses';
	import { capitalizeFirstLetter } from '$lib/utils/string.utils';
	import YamlEditor from '$lib/components/yaml-editor.svelte';
	import EnvEditor from '$lib/components/env-editor.svelte';
	import ArcaneButton from '$lib/components/arcane-button.svelte';

	let { data }: { data: PageData } = $props();
	let { agent, stack, composeName } = data;

	let name = $state(composeName);
	let composeContent = $state(stack.composeContent || '');
	let envContent = $state(stack.envContent || '');
	let originalName = composeName;
	let originalComposeContent = stack.composeContent || '';
	let originalEnvContent = stack.envContent || '';

	let isLoading = $state({
		deploying: false,
		stopping: false,
		restarting: false,
		saving: false
	});

	let hasChanges = $derived(name !== originalName || composeContent !== originalComposeContent || envContent !== originalEnvContent);

	let activeSection = $state<string>('overview');

	async function handleSaveChanges() {
		if (!hasChanges) return;

		isLoading.saving = true;
		try {
			const response = await fetch(`/api/agents/${agent.id}/tasks`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: 'stack_update',
					payload: {
						project_name: composeName,
						compose_content: composeContent,
						env_content: envContent
					}
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to save stack');
			}

			toast.success('Stack updated successfully!');

			// Update original values to reflect saved state
			originalComposeContent = composeContent;
			originalEnvContent = envContent;

			await invalidateAll();
		} catch (error) {
			console.error('Failed to save stack:', error);
			toast.error(`Failed to save stack: ${error instanceof Error ? error.message : 'Unknown error'}`);
		} finally {
			isLoading.saving = false;
		}
	}

	async function handleStackAction(action: 'up' | 'down' | 'restart') {
		const actionKey = action === 'up' ? 'deploying' : action === 'down' ? 'stopping' : 'restarting';
		isLoading[actionKey] = true;

		try {
			let taskType: string;
			switch (action) {
				case 'up':
					taskType = 'compose_up';
					break;
				case 'down':
					taskType = 'compose_down';
					break;
				case 'restart':
					taskType = 'compose_restart';
					break;
			}

			const response = await fetch(`/api/agents/${agent.id}/tasks`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: taskType,
					payload: { project_name: composeName }
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `Failed to ${action} stack`);
			}

			toast.success(`Stack ${action === 'up' ? 'started' : action === 'down' ? 'stopped' : 'restarted'} successfully`);
			await invalidateAll();
		} catch (error) {
			console.error(`Failed to ${action} stack:`, error);
			toast.error(`Failed to ${action} stack: ${error instanceof Error ? error.message : 'Unknown error'}`);
		} finally {
			isLoading[actionKey] = false;
		}
	}

	// Navigation sections for single-page layout
	const navigationSections = [
		{ id: 'overview', label: 'Overview', icon: FileStack },
		{ id: 'services', label: 'Services', icon: Layers },
		{ id: 'config', label: 'Configuration', icon: Settings }
	] as const;

	type SectionId = (typeof navigationSections)[number]['id'];

	function scrollToSection(sectionId: SectionId) {
		activeSection = sectionId;
		const element = document.getElementById(sectionId);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}
</script>

<div class="bg-background min-h-screen">
	{#if stack}
		<!-- Fixed Header -->
		<div class="bg-background/95 sticky top-0 z-10 border-b backdrop-blur">
			<div class="max-w-full px-4 py-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<Button variant="ghost" size="sm" href="/compose">
							<ArrowLeft class="mr-2 size-4" />
							Back
						</Button>
						<div class="bg-border h-4 w-px"></div>
						<div class="flex items-center gap-2">
							<h1 class="max-w-[300px] truncate text-lg font-semibold" title={stack.name}>
								{stack.name}
							</h1>
							<span class="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
								{agent.hostname}
							</span>
							{#if stack.status}
								<StatusBadge variant={statusVariantMap[stack.status.toLowerCase()] || 'gray'} text={capitalizeFirstLetter(stack.status)} />
							{/if}
						</div>
					</div>

					<div class="flex items-center gap-2">
						<!-- Agent Stack Actions -->
						<Button variant="outline" size="sm" onclick={() => handleStackAction('up')} disabled={Object.values(isLoading).some(Boolean) || stack.status === 'running'}>
							{#if isLoading.deploying}
								<Loader2 class="mr-2 size-4 animate-spin" />
							{:else}
								<Play class="mr-2 size-4" />
							{/if}
							Start
						</Button>

						<Button variant="outline" size="sm" onclick={() => handleStackAction('restart')} disabled={Object.values(isLoading).some(Boolean)}>
							{#if isLoading.restarting}
								<Loader2 class="mr-2 size-4 animate-spin" />
							{:else}
								<RotateCcw class="mr-2 size-4" />
							{/if}
							Restart
						</Button>

						<Button variant="outline" size="sm" onclick={() => handleStackAction('down')} disabled={Object.values(isLoading).some(Boolean) || stack.status !== 'running'}>
							{#if isLoading.stopping}
								<Loader2 class="mr-2 size-4 animate-spin" />
							{:else}
								<Square class="mr-2 size-4" />
							{/if}
							Stop
						</Button>
					</div>
				</div>
			</div>
		</div>

		<div class="flex h-[calc(100vh-64px)]">
			<!-- Fixed Sidebar Navigation -->
			<div class="bg-background/50 w-48 shrink-0 border-r">
				<div class="sticky top-16 p-3">
					<nav class="space-y-1">
						{#each navigationSections as section}
							{@const IconComponent = section.icon}
							<button
								onclick={() => scrollToSection(section.id)}
								class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors
                                    {activeSection === section.id ? 'bg-primary/10 text-primary border-primary/20 border' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}"
							>
								<IconComponent class="size-4 shrink-0" />
								<span class="truncate">{section.label}</span>
								{#if section.id === 'services' && stack.serviceCount}
									<span class="bg-muted ml-auto shrink-0 rounded px-1.5 py-0.5 text-xs">
										{stack.serviceCount}
									</span>
								{/if}
							</button>
						{/each}
					</nav>
				</div>
			</div>

			<!-- Main Content -->
			<div class="flex-1 overflow-y-auto">
				<div class="max-w-none p-6">
					<div class="space-y-8">
						<!-- Overview Section -->
						<section id="overview" class="scroll-mt-20">
							<h2 class="mb-6 flex items-center gap-2 text-xl font-semibold">
								<FileStack class="size-5" />
								Overview
								<span class="text-muted-foreground text-sm font-normal">(Remote Agent)</span>
							</h2>

							<!-- Summary Cards -->
							<div class="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
								<Card.Root class="border">
									<Card.Content class="flex items-center justify-between p-6">
										<div>
											<p class="text-muted-foreground text-sm font-medium">Services</p>
											<p class="text-2xl font-bold">{stack.serviceCount || 0}</p>
										</div>
										<div class="bg-primary/10 rounded-full p-3">
											<Layers class="text-primary size-5" />
										</div>
									</Card.Content>
								</Card.Root>

								<Card.Root class="border">
									<Card.Content class="flex items-center justify-between p-6">
										<div>
											<p class="text-muted-foreground text-sm font-medium">Running</p>
											<p class="text-2xl font-bold">{stack.runningCount || 0}</p>
										</div>
										<div class="rounded-full bg-green-500/10 p-3">
											<Activity class="size-5 text-green-500" />
										</div>
									</Card.Content>
								</Card.Root>

								<Card.Root class="border">
									<Card.Content class="flex items-center justify-between p-6">
										<div>
											<p class="text-muted-foreground text-sm font-medium">Agent</p>
											<p class="text-lg font-medium">{agent.hostname}</p>
										</div>
										<div class="rounded-full bg-blue-500/10 p-3">
											<Users class="size-5 text-blue-500" />
										</div>
									</Card.Content>
								</Card.Root>
							</div>
						</section>

						<!-- Services Section -->
						<section id="services" class="scroll-mt-20">
							<h2 class="mb-6 flex items-center gap-2 text-xl font-semibold">
								<Layers class="size-5" />
								Services ({stack.serviceCount || 0})
							</h2>

							<Card.Root class="border">
								<Card.Content class="p-6">
									{#if stack.services && stack.services.length > 0}
										<div class="space-y-4">
											{#each stack.services as service (service.id || service.name)}
												{@const status = service.state?.Status || 'unknown'}
												{@const variant = statusVariantMap[status.toLowerCase()] || 'gray'}

												<!-- Agent Service (not clickable) -->
												<div class="bg-muted/20 flex items-center justify-between rounded-lg border p-4">
													<div class="flex items-center gap-3">
														<div class="bg-muted/50 rounded-full p-2">
															<Layers class="text-muted-foreground size-4" />
														</div>
														<div>
															<p class="font-medium">{service.name}</p>
															<p class="text-muted-foreground text-sm">Remote service</p>
														</div>
													</div>
													<StatusBadge {variant} text={capitalizeFirstLetter(status)} />
												</div>
											{/each}
										</div>
									{:else}
										<div class="py-12 text-center">
											<div class="bg-muted/50 mx-auto mb-4 flex size-16 items-center justify-center rounded-full">
												<Layers class="text-muted-foreground size-6" />
											</div>
											<div class="text-muted-foreground">No services defined in this stack</div>
										</div>
									{/if}
								</Card.Content>
							</Card.Root>
						</section>

						<!-- Configuration Section -->
						<section id="config" class="scroll-mt-20">
							<div class="mb-6 flex items-center justify-between">
								<h2 class="flex items-center gap-2 text-xl font-semibold">
									<Settings class="size-5" />
									Configuration
									<span class="text-muted-foreground text-sm font-normal">(Remote)</span>
								</h2>
								<!-- Save Button -->
								{#if hasChanges}
									<ArcaneButton action="save" loading={isLoading.saving} onClick={handleSaveChanges} disabled={!hasChanges} label="Save Changes" loadingLabel="Saving..." class="bg-green-600 text-white hover:bg-green-700" />
								{/if}
							</div>

							<!-- Stack Name Field -->
							<Card.Root class="mb-6 border">
								<Card.Header class="pb-4">
									<Card.Title>Stack Settings</Card.Title>
								</Card.Header>
								<Card.Content>
									<div class="max-w-md">
										<Label for="name" class="mb-2 block">Stack Name</Label>
										<Input type="text" id="name" name="name" bind:value={name} required disabled={true} />
										<p class="text-muted-foreground mt-2 text-sm">Agent stack names cannot be changed from the web interface.</p>
									</div>
								</Card.Content>
							</Card.Root>

							<!-- Editors -->
							<div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
								<!-- Compose Editor -->
								<div class="xl:col-span-2">
									<Card.Root class="border">
										<Card.Header class="pb-4">
											<Card.Title>Docker Compose File</Card.Title>
										</Card.Header>
										<Card.Content>
											<div class="h-[600px] overflow-hidden rounded-lg border">
												<YamlEditor bind:value={composeContent} readOnly={Object.values(isLoading).some(Boolean)} />
											</div>
											<p class="text-muted-foreground mt-2 text-sm">
												Edit your <span class="font-medium">compose.yaml</span> file directly. Changes will be applied to the remote agent.
											</p>
										</Card.Content>
									</Card.Root>
								</div>

								<!-- Environment Editor -->
								<div>
									<Card.Root class="border">
										<Card.Header class="pb-4">
											<Card.Title>Environment (.env)</Card.Title>
										</Card.Header>
										<Card.Content>
											<div class="h-[600px] overflow-hidden rounded-lg border">
												<EnvEditor bind:value={envContent} readOnly={Object.values(isLoading).some(Boolean)} />
											</div>
											<p class="text-muted-foreground mt-2 text-sm">Define environment variables in KEY=value format. Variables will be applied on the remote agent.</p>
										</Card.Content>
									</Card.Root>
								</div>
							</div>
						</section>
					</div>
				</div>
			</div>
		</div>
	{:else}
		<!-- Not Found State -->
		<div class="flex min-h-screen items-center justify-center">
			<div class="text-center">
				<div class="bg-muted/50 mb-6 inline-flex rounded-full p-6">
					<FileStack class="text-muted-foreground size-10" />
				</div>
				<h2 class="mb-3 text-2xl font-medium">Stack Not Found</h2>
				<p class="text-muted-foreground mb-8 max-w-md text-center">Could not load agent stack data. The stack may not exist on the agent or the agent may be offline.</p>
				<Button variant="outline" href="/compose">
					<ArrowLeft class="mr-2 size-4" />
					Back to Stacks
				</Button>
			</div>
		</div>
	{/if}
</div>
