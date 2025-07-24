<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Select from '$lib/components/ui/select';
	import { Switch } from '$lib/components/ui/switch';
	import * as Alert from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { settingsAPI } from '$lib/services/api';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import {
		Loader2,
		CheckCircle,
		AlertCircle,
		Database,
		ChevronRight,
		Server,
		Folder,
		Timer,
		Shield,
		RefreshCw
	} from '@lucide/svelte';
	import { fade, fly, scale } from 'svelte/transition';

	let isLoading = $state(false);
	let testingConnection = $state(false);
	let connectionStatus = $state<'success' | 'error' | null>(null);

	let dockerSettings = $state({
		stacksDirectory: '/opt/stacks',
		dockerTLSCert: '',
		pollingEnabled: true,
		pollingInterval: '5'
	});

	const configCategories = [
		{
			title: 'Docker Connection',
			description: 'Basic Docker daemon settings',
			icon: Database
		},
		{
			title: 'File Management',
			description: 'Stack storage configuration',
			icon: Folder
		},
		{
			title: 'Monitoring',
			description: 'Real-time updates and polling',
			icon: Timer
		},
		{
			title: 'Security',
			description: 'TLS certificates and encryption',
			icon: Shield
		}
	];

	async function testDockerConnection() {
		testingConnection = true;
		connectionStatus = null;

		try {
			await settingsAPI.updateSettings({
				stacksDirectory: dockerSettings.stacksDirectory,
				dockerTLSCert: dockerSettings.dockerTLSCert,
				pollingEnabled: dockerSettings.pollingEnabled,
				pollingInterval: parseInt(dockerSettings.pollingInterval)
			});

			connectionStatus = 'success';
			toast.success('Docker connection successful!');
		} catch (error) {
			connectionStatus = 'error';
			toast.error('Docker connection failed. Please check your settings.');
		} finally {
			testingConnection = false;
		}
	}

	async function handleNext() {
		isLoading = true;

		try {
			await settingsAPI.updateSettings({
				stacksDirectory: dockerSettings.stacksDirectory,
				dockerTLSCert: dockerSettings.dockerTLSCert,
				pollingEnabled: dockerSettings.pollingEnabled,
				pollingInterval: parseInt(dockerSettings.pollingInterval),
				onboarding: {
					completed: false,
					steps: {
						welcome: true,
						password: true,
						docker: true
					}
				}
			});

			goto('/onboarding/security');
		} catch (error) {
			toast.error('Failed to save Docker settings');
		} finally {
			isLoading = false;
		}
	}

	function handleSkip() {
		goto('/onboarding/security');
	}
</script>

<div class="step-content flex flex-col h-full">
	<!-- Header -->
	<div class="text-center mb-8" in:fade={{ duration: 600, delay: 200 }}>
		<div class="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
			<Database class="size-8 text-primary" />
		</div>
		<h1 class="text-3xl font-bold mb-2">Docker Configuration</h1>
		<p class="text-muted-foreground text-lg">
			Configure how Arcane connects to your Docker environment and manages your containers.
		</p>
	</div>

	<!-- Configuration Overview -->
	<div class="mb-8" in:fly={{ y: 20, duration: 500, delay: 400 }}>
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			{#each configCategories as category, i}
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

	<!-- Connection Status Alert -->
	{#if connectionStatus === 'success'}
		<div in:scale={{ duration: 300, start: 0.95 }}>
			<Alert.Root class="mb-6 border-green-200 bg-green-50">
				<CheckCircle class="size-4 text-green-600" />
				<Alert.Title class="text-green-800">Connection Successful</Alert.Title>
				<Alert.Description class="text-green-700">
					Docker connection test passed. Your configuration is working correctly.
				</Alert.Description>
			</Alert.Root>
		</div>
	{:else if connectionStatus === 'error'}
		<div in:scale={{ duration: 300, start: 0.95 }}>
			<Alert.Root class="mb-6" variant="destructive">
				<AlertCircle class="size-4" />
				<Alert.Title>Connection Failed</Alert.Title>
				<Alert.Description>
					Unable to connect to Docker daemon. Please check your settings and try again.
				</Alert.Description>
			</Alert.Root>
		</div>
	{/if}

	<!-- Configuration Cards -->
	<div class="flex-1 flex flex-col justify-center">
		<div class="grid gap-6 md:grid-cols-2 mb-8" in:fly={{ y: 20, duration: 500, delay: 600 }}>
			<!-- Basic Settings Card -->
			<div class="space-y-6 p-6 rounded-xl border bg-card/50 backdrop-blur-sm">
				<div class="flex items-center gap-3 mb-4">
					<div class="bg-primary/10 rounded-full p-2">
						<Server class="size-5 text-primary" />
					</div>
					<div>
						<h2 class="text-xl font-semibold">Basic Settings</h2>
						<p class="text-sm text-muted-foreground">
							Configure the basic Docker connection settings
						</p>
					</div>
				</div>

				<div class="space-y-4">
					<div class="space-y-2">
						<Label for="stacks-directory" class="text-base font-medium flex items-center gap-2">
							<Folder class="size-4" />
							Stacks Directory
						</Label>
						<Input
							id="stacks-directory"
							bind:value={dockerSettings.stacksDirectory}
							placeholder="/opt/stacks"
							class="h-12 border-2 focus:border-primary transition-all duration-300"
						/>
						<p class="text-xs text-muted-foreground">
							Directory where Docker Compose files will be stored
						</p>
					</div>

					<div class="space-y-2">
						<Label for="docker-tls" class="text-base font-medium flex items-center gap-2">
							<Shield class="size-4" />
							Docker TLS Certificate (Optional)
						</Label>
						<Textarea
							id="docker-tls"
							bind:value={dockerSettings.dockerTLSCert}
							placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
							rows={4}
							class="border-2 focus:border-primary transition-all duration-300 font-mono text-sm"
						/>
						<p class="text-xs text-muted-foreground">Leave empty for local Docker daemon</p>
					</div>
				</div>
			</div>

			<!-- Polling Settings Card -->
			<div class="space-y-6 p-6 rounded-xl border bg-card/50 backdrop-blur-sm">
				<div class="flex items-center gap-3 mb-4">
					<div class="bg-primary/10 rounded-full p-2">
						<Timer class="size-5 text-primary" />
					</div>
					<div>
						<h2 class="text-xl font-semibold">Monitoring Settings</h2>
						<p class="text-sm text-muted-foreground">
							Configure how often Arcane checks Docker for updates
						</p>
					</div>
				</div>

				<div class="space-y-4">
					<div class="flex items-center justify-between p-4 rounded-lg bg-muted/30 border">
						<div class="space-y-1">
							<Label class="text-base font-medium">Enable Auto-Refresh</Label>
							<p class="text-sm text-muted-foreground">Automatically refresh container states</p>
						</div>
						<Switch bind:checked={dockerSettings.pollingEnabled} />
					</div>

					{#if dockerSettings.pollingEnabled}
						<div class="space-y-2" in:fade={{ duration: 300 }}>
							<Label for="polling-interval" class="text-base font-medium">Refresh Interval</Label>
							<Select.Root type="single" bind:value={dockerSettings.pollingInterval}>
								<Select.Trigger class="h-12 border-2 focus:border-primary">
									{dockerSettings.pollingInterval}
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="5">5 seconds</Select.Item>
									<Select.Item value="10">10 seconds</Select.Item>
									<Select.Item value="30">30 seconds</Select.Item>
									<Select.Item value="60">1 minute</Select.Item>
								</Select.Content>
							</Select.Root>
							<p class="text-xs text-muted-foreground">
								How often to check for container status changes
							</p>
						</div>
					{/if}

					<!-- Test Connection Button -->
					<Button
						variant="outline"
						onclick={testDockerConnection}
						disabled={testingConnection}
						class="w-full h-12 border-2 hover:border-primary transition-all duration-300 group"
					>
						{#if testingConnection}
							<Loader2 class="mr-2 size-4 animate-spin" />
							Testing Connection...
						{:else if connectionStatus === 'success'}
							<CheckCircle class="mr-2 size-4 text-green-500" />
							Connection Successful
						{:else if connectionStatus === 'error'}
							<AlertCircle class="mr-2 size-4 text-red-500" />
							Test Failed - Retry
						{:else}
							<RefreshCw
								class="mr-2 size-4 group-hover:rotate-180 transition-transform duration-300"
							/>
							Test Docker Connection
						{/if}
					</Button>
				</div>
			</div>
		</div>

		<!-- Configuration Summary -->
		<div
			class="rounded-lg bg-blue-50 border border-blue-200 p-4 mb-8"
			in:fly={{ y: 10, duration: 400, delay: 800 }}
		>
			<h3 class="font-medium text-sm text-blue-900 flex items-center gap-2 mb-2">
				<CheckCircle class="size-4" />
				Configuration Summary
			</h3>
			<div class="text-sm text-blue-800 grid gap-1 md:grid-cols-2">
				<div>• Stacks stored in: {dockerSettings.stacksDirectory}</div>
				<div>
					• Auto-refresh: {dockerSettings.pollingEnabled
						? `Every ${dockerSettings.pollingInterval}s`
						: 'Disabled'}
				</div>
				<div>• TLS: {dockerSettings.dockerTLSCert ? 'Configured' : 'Not configured'}</div>
				<div>• Connection: {connectionStatus === 'success' ? 'Verified' : 'Not tested'}</div>
			</div>
		</div>
	</div>

	<!-- Navigation -->
	<div class="flex justify-between" in:fly={{ y: 20, duration: 500, delay: 1000 }}>
		<Button variant="outline" onclick={() => goto('/onboarding/password')} class="h-12 px-6">
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
					Continue to Security
					<ChevronRight
						class="ml-2 size-4 group-hover:translate-x-1 transition-transform duration-300"
					/>
				{/if}
			</Button>
		</div>
	</div>
</div>
