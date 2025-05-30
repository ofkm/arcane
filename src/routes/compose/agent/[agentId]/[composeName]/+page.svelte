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

<div class="min-h-screen bg-background">
	{#if stack}
		<!-- Fixed Header -->
		<div class="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
			<div class="max-w-full px-4 py-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<Button variant="ghost" size="sm" href="/compose">
							<ArrowLeft class="size-4 mr-2" />
							Back
						</Button>
						<div class="h-4 w-px bg-border"></div>
						<div class="flex items-center gap-2">
							<h1 class="text-lg font-semibold truncate max-w-[300px]" title={stack.name}>
								{stack.name}
							</h1>
							<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
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
								<Loader2 class="size-4 mr-2 animate-spin" />
							{:else}
								<Play class="size-4 mr-2" />
							{/if}
							Start
						</Button>

						<Button variant="outline" size="sm" onclick={() => handleStackAction('restart')} disabled={Object.values(isLoading).some(Boolean)}>
							{#if isLoading.restarting}
								<Loader2 class="size-4 mr-2 animate-spin" />
							{:else}
								<RotateCcw class="size-4 mr-2" />
							{/if}
							Restart
						</Button>

						<Button variant="outline" size="sm" onclick={() => handleStackAction('down')} disabled={Object.values(isLoading).some(Boolean) || stack.status !== 'running'}>
							{#if isLoading.stopping}
								<Loader2 class="size-4 mr-2 animate-spin" />
							{:else}
								<Square class="size-4 mr-2" />
							{/if}
							Stop
						</Button>
					</div>
				</div>
			</div>
		</div>

		<div class="flex h-[calc(100vh-64px)]">
			<!-- Fixed Sidebar Navigation -->
			<div class="w-48 shrink-0 border-r bg-background/50">
				<div class="sticky top-16 p-3">
					<nav class="space-y-1">
						{#each navigationSections as section}
							{@const IconComponent = section.icon}
							<button
								onclick={() => scrollToSection(section.id)}
								class="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors
                                    {activeSection === section.id ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}"
							>
								<IconComponent class="size-4 shrink-0" />
								<span class="truncate">{section.label}</span>
								{#if section.id === 'services' && stack.serviceCount}
									<span class="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded shrink-0">
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
				<div class="p-6 max-w-none">
					<div class="space-y-8">
						<!-- Overview Section -->
						<section id="overview" class="scroll-mt-20">
							<h2 class="text-xl font-semibold mb-6 flex items-center gap-2">
								<FileStack class="size-5" />
								Overview
								<span class="text-sm font-normal text-muted-foreground">(Remote Agent)</span>
							</h2>

							<!-- Summary Cards -->
							<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
								<Card.Root class="border">
									<Card.Content class="p-6 flex items-center justify-between">
										<div>
											<p class="text-sm font-medium text-muted-foreground">Services</p>
											<p class="text-2xl font-bold">{stack.serviceCount || 0}</p>
										</div>
										<div class="bg-primary/10 p-3 rounded-full">
											<Layers class="text-primary size-5" />
										</div>
									</Card.Content>
								</Card.Root>

								<Card.Root class="border">
									<Card.Content class="p-6 flex items-center justify-between">
										<div>
											<p class="text-sm font-medium text-muted-foreground">Running</p>
											<p class="text-2xl font-bold">{stack.runningCount || 0}</p>
										</div>
										<div class="bg-green-500/10 p-3 rounded-full">
											<Activity class="text-green-500 size-5" />
										</div>
									</Card.Content>
								</Card.Root>

								<Card.Root class="border">
									<Card.Content class="p-6 flex items-center justify-between">
										<div>
											<p class="text-sm font-medium text-muted-foreground">Agent</p>
											<p class="text-lg font-medium">{agent.hostname}</p>
										</div>
										<div class="bg-blue-500/10 p-3 rounded-full">
											<Users class="text-blue-500 size-5" />
										</div>
									</Card.Content>
								</Card.Root>
							</div>
						</section>

						<!-- Services Section -->
						<section id="services" class="scroll-mt-20">
							<h2 class="text-xl font-semibold mb-6 flex items-center gap-2">
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
												<div class="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
													<div class="flex items-center gap-3">
														<div class="bg-muted/50 p-2 rounded-full">
															<Layers class="text-muted-foreground size-4" />
														</div>
														<div>
															<p class="font-medium">{service.name}</p>
															<p class="text-sm text-muted-foreground">Remote service</p>
														</div>
													</div>
													<StatusBadge {variant} text={capitalizeFirstLetter(status)} />
												</div>
											{/each}
										</div>
									{:else}
										<div class="text-center py-12">
											<div class="mb-4 rounded-full bg-muted/50 flex items-center justify-center mx-auto size-16">
												<Layers class="size-6 text-muted-foreground" />
											</div>
											<div class="text-muted-foreground">No services defined in this stack</div>
										</div>
									{/if}
								</Card.Content>
							</Card.Root>
						</section>

						<!-- Configuration Section -->
						<section id="config" class="scroll-mt-20">
							<div class="flex items-center justify-between mb-6">
								<h2 class="text-xl font-semibold flex items-center gap-2">
									<Settings class="size-5" />
									Configuration
									<span class="text-sm font-normal text-muted-foreground">(Remote)</span>
								</h2>
								<!-- Save Button -->
								{#if hasChanges}
									<ArcaneButton action="save" loading={isLoading.saving} onClick={handleSaveChanges} disabled={!hasChanges} label="Save Changes" loadingLabel="Saving..." class="bg-green-600 hover:bg-green-700 text-white" />
								{/if}
							</div>

							<!-- Stack Name Field -->
							<Card.Root class="border mb-6">
								<Card.Header class="pb-4">
									<Card.Title>Stack Settings</Card.Title>
								</Card.Header>
								<Card.Content>
									<div class="max-w-md">
										<Label for="name" class="mb-2 block">Stack Name</Label>
										<Input type="text" id="name" name="name" bind:value={name} required disabled={true} />
										<p class="text-sm text-muted-foreground mt-2">Agent stack names cannot be changed from the web interface.</p>
									</div>
								</Card.Content>
							</Card.Root>

							<!-- Editors -->
							<div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
								<!-- Compose Editor -->
								<div class="xl:col-span-2">
									<Card.Root class="border">
										<Card.Header class="pb-4">
											<Card.Title>Docker Compose File</Card.Title>
										</Card.Header>
										<Card.Content>
											<div class="border rounded-lg overflow-hidden h-[600px]">
												<YamlEditor bind:value={composeContent} readOnly={Object.values(isLoading).some(Boolean)} />
											</div>
											<p class="text-sm text-muted-foreground mt-2">
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
											<div class="border rounded-lg overflow-hidden h-[600px]">
												<EnvEditor bind:value={envContent} readOnly={Object.values(isLoading).some(Boolean)} />
											</div>
											<p class="text-sm text-muted-foreground mt-2">Define environment variables in KEY=value format. Variables will be applied on the remote agent.</p>
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
		<div class="min-h-screen flex items-center justify-center">
			<div class="text-center">
				<div class="rounded-full bg-muted/50 p-6 mb-6 inline-flex">
					<FileStack class="text-muted-foreground size-10" />
				</div>
				<h2 class="text-2xl font-medium mb-3">Stack Not Found</h2>
				<p class="text-center text-muted-foreground max-w-md mb-8">Could not load agent stack data. The stack may not exist on the agent or the agent may be offline.</p>
				<Button variant="outline" href="/compose">
					<ArrowLeft class="mr-2 size-4" />
					Back to Stacks
				</Button>
			</div>
		</div>
	{/if}
</div>
