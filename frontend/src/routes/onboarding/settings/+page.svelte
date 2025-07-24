<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Switch } from '$lib/components/ui/switch';
	import { Badge } from '$lib/components/ui/badge';
	import { settingsAPI } from '$lib/services/api';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import {
		Loader2,
		Settings,
		ChevronRight,
		RefreshCw,
		Trash2,
		Globe,
		Zap,
		Database,
		CheckCircle2
	} from '@lucide/svelte';
	import { fade, fly, scale } from 'svelte/transition';

	let isLoading = $state(false);

	let appSettings = $state({
		autoUpdate: true,
		autoUpdateInterval: '300',
		pruneMode: 'dangling',
		maturityThresholdDays: 30,
		baseServerUrl: ''
	});

	const settingsCategories = [
		{
			title: 'Auto Updates',
			description: 'Automatic container and stack updates',
			icon: RefreshCw
		},
		{
			title: 'System Cleanup',
			description: 'Automated resource management',
			icon: Trash2
		},
		{
			title: 'Network Config',
			description: 'URL and connectivity settings',
			icon: Globe
		},
		{
			title: 'Performance',
			description: 'Optimization and monitoring',
			icon: Zap
		}
	];

	async function handleNext() {
		isLoading = true;

		try {
			await settingsAPI.updateSettings({
				autoUpdate: appSettings.autoUpdate,
				autoUpdateInterval: parseInt(appSettings.autoUpdateInterval),
				pruneMode: appSettings.pruneMode,
				baseServerUrl: appSettings.baseServerUrl,
				onboarding: {
					completed: false,
					steps: {
						welcome: true,
						password: true,
						docker: true,
						security: true,
						settings: true
					}
				}
			});

			goto('/onboarding/complete');
		} catch (error) {
			toast.error('Failed to save application settings');
		} finally {
			isLoading = false;
		}
	}

	function handleSkip() {
		goto('/onboarding/complete');
	}
</script>

<div class="step-content flex flex-col h-full">
	<!-- Header -->
	<div class="text-center mb-8" in:fade={{ duration: 600, delay: 200 }}>
		<div class="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
			<Settings class="size-8 text-primary" />
		</div>
		<h1 class="text-3xl font-bold mb-2">Application Settings</h1>
		<p class="text-muted-foreground text-lg">
			Configure general application behavior and features to optimize your Docker management
			experience.
		</p>
	</div>

	<!-- Settings Overview -->
	<div class="mb-8" in:fly={{ y: 20, duration: 500, delay: 400 }}>
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			{#each settingsCategories as category, i}
				<div
					class="group rounded-xl border bg-gradient-to-br from-card to-muted/20 p-4 transition-all duration-300 hover:shadow-lg"
					in:fly={{ y: 30, duration: 500, delay: 600 + i * 100 }}
				>
					<div class="flex items-start gap-3">
						<div
							class="bg-primary/10 mt-1 rounded-full p-2 group-hover:bg-primary/20 transition-colors duration-300"
						>
							<category.icon class="text-primary size-4" />
						</div>
						<div class="flex-1">
							<h3 class="font-medium text-sm mb-1">{category.title}</h3>
							<p class="text-xs text-muted-foreground">{category.description}</p>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Configuration Cards -->
	<div class="flex-1 flex flex-col justify-center">
		<div class="grid gap-6 md:grid-cols-2 mb-8" in:fly={{ y: 20, duration: 500, delay: 800 }}>
			<!-- Auto Update Settings -->
			<div class="space-y-6 p-6 rounded-xl border bg-card/50 backdrop-blur-sm">
				<div class="flex items-center gap-3 mb-4">
					<div class="bg-primary/10 rounded-full p-2">
						<RefreshCw class="size-5 text-primary" />
					</div>
					<div>
						<h2 class="text-xl font-semibold">Auto Update</h2>
						<p class="text-sm text-muted-foreground">
							Configure automatic updating of containers and stacks
						</p>
					</div>
				</div>

				<div class="space-y-4">
					<div class="flex items-center justify-between p-4 rounded-lg bg-muted/30 border">
						<div class="space-y-1">
							<Label class="text-base font-medium">Enable Auto Update</Label>
							<p class="text-sm text-muted-foreground">Automatically check for and apply updates</p>
						</div>
						<Switch bind:checked={appSettings.autoUpdate} />
					</div>

					{#if appSettings.autoUpdate}
						<div class="space-y-2" in:fade={{ duration: 300 }}>
							<Label class="text-base font-medium">Update Interval</Label>
							<Select.Root type="single" bind:value={appSettings.autoUpdateInterval}>
								<Select.Trigger class="h-12 border-2 focus:border-primary">
									{appSettings.autoUpdateInterval}
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="300">5 minutes</Select.Item>
									<Select.Item value="900">15 minutes</Select.Item>
									<Select.Item value="1800">30 minutes</Select.Item>
									<Select.Item value="3600">1 hour</Select.Item>
									<Select.Item value="21600">6 hours</Select.Item>
								</Select.Content>
							</Select.Root>
							<p class="text-xs text-muted-foreground">How often to check for container updates</p>
						</div>
					{/if}
				</div>
			</div>

			<!-- System Maintenance Settings -->
			<div class="space-y-6 p-6 rounded-xl border bg-card/50 backdrop-blur-sm">
				<div class="flex items-center gap-3 mb-4">
					<div class="bg-primary/10 rounded-full p-2">
						<Trash2 class="size-5 text-primary" />
					</div>
					<div>
						<h2 class="text-xl font-semibold">System Maintenance</h2>
						<p class="text-sm text-muted-foreground">
							Configure system cleanup and maintenance settings
						</p>
					</div>
				</div>

				<div class="space-y-4">
					<div class="space-y-2">
						<Label class="text-base font-medium">Prune Mode</Label>
						<Select.Root type="single" bind:value={appSettings.pruneMode}>
							<Select.Trigger class="h-12 border-2 focus:border-primary">
								{appSettings.pruneMode}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="dangling">
									<div class="flex flex-col items-start">
										<span>Dangling Only</span>
										<span class="text-xs text-muted-foreground">Remove only unused resources</span>
									</div>
								</Select.Item>
								<Select.Item value="all">
									<div class="flex flex-col items-start">
										<span>All Unused</span>
										<span class="text-xs text-muted-foreground">Aggressive cleanup mode</span>
									</div>
								</Select.Item>
							</Select.Content>
						</Select.Root>
						<p class="text-xs text-muted-foreground">
							How aggressive to be when pruning unused resources
						</p>
					</div>

					<div class="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
						<p class="text-xs text-yellow-800">
							<strong>Note:</strong> "All Unused" mode will remove all unused images, networks, and volumes.
							Use with caution.
						</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Network Settings -->
		<div
			class="space-y-6 p-6 rounded-xl border bg-card/50 backdrop-blur-sm mb-8"
			in:fly={{ y: 20, duration: 500, delay: 1000 }}
		>
			<div class="flex items-center gap-3 mb-4">
				<div class="bg-primary/10 rounded-full p-2">
					<Globe class="size-5 text-primary" />
				</div>
				<div>
					<h2 class="text-xl font-semibold">Network Settings</h2>
					<p class="text-sm text-muted-foreground">Configure network and URL settings</p>
				</div>
			</div>

			<div class="space-y-4">
				<div class="space-y-2">
					<Label for="base-server-url" class="text-base font-medium"
						>Base Server URL (Optional)</Label
					>
					<Input
						id="base-server-url"
						bind:value={appSettings.baseServerUrl}
						placeholder="https://arcane.yourdomain.com"
						class="h-12 border-2 focus:border-primary transition-all duration-300"
					/>
					<p class="text-xs text-muted-foreground">
						Used for generating external links and webhooks. Leave empty for auto-detection.
					</p>
				</div>

				{#if appSettings.baseServerUrl}
					<div
						class="rounded-lg bg-green-50 border border-green-200 p-3"
						in:fade={{ duration: 300 }}
					>
						<p class="text-xs text-green-800">
							<strong>External URL set:</strong>
							{appSettings.baseServerUrl}
						</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Configuration Summary -->
		<div
			class="rounded-lg bg-blue-50 border border-blue-200 p-4 mb-8"
			in:fly={{ y: 10, duration: 400, delay: 1200 }}
		>
			<h3 class="font-medium text-sm text-blue-900 flex items-center gap-2 mb-2">
				<CheckCircle2 class="size-4" />
				Configuration Summary
			</h3>
			<div class="text-sm text-blue-800 grid gap-1 md:grid-cols-2">
				<div>
					• Auto updates: {appSettings.autoUpdate
						? `Every ${Math.floor(parseInt(appSettings.autoUpdateInterval) / 60)} min`
						: 'Disabled'}
				</div>
				<div>
					• Cleanup mode: {appSettings.pruneMode === 'dangling' ? 'Conservative' : 'Aggressive'}
				</div>
				<div>• External URL: {appSettings.baseServerUrl || 'Auto-detected'}</div>
				<div>• Maintenance: Automated cleanup enabled</div>
			</div>
		</div>
	</div>

	<!-- Navigation -->
	<div class="flex justify-between" in:fly={{ y: 20, duration: 500, delay: 1400 }}>
		<Button variant="outline" onclick={() => goto('/onboarding/security')} class="h-12 px-6">
			Back
		</Button>
		<div class="flex gap-2">
			<Button variant="ghost" onclick={handleSkip} class="h-12 px-6">Skip</Button>
			<Button
				onclick={handleNext}
				disabled={isLoading}
				class="h-12 px-8 bg-gradient-to-r from-primary to-accent hover:shadow-lg transition-all duration-300 group"
			>
				{#if isLoading}
					<Loader2 class="mr-2 size-4 animate-spin" />
					Saving...
				{:else}
					Complete Setup
					<ChevronRight
						class="ml-2 size-4 group-hover:translate-x-1 transition-transform duration-300"
					/>
				{/if}
			</Button>
		</div>
	</div>
</div>
