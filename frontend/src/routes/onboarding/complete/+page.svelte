<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { settingsAPI } from '$lib/services/api';
	import { toast } from 'svelte-sonner';
	import { goto, invalidateAll } from '$app/navigation';
	import {
		Loader2,
		CheckCircle,
		ArrowRight,
		Sparkles,
		Container,
		Shield,
		Settings,
		Database,
		Zap,
		Users,
		BarChart3,
		Star
	} from '@lucide/svelte';
	import { fade, fly, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let isLoading = $state(false);

	const completedSteps = [
		{
			name: 'Admin Password',
			description: 'Secured with custom password',
			icon: Shield,
			color: 'text-green-600 bg-green-100'
		},
		{
			name: 'Docker Connection',
			description: 'Connected to Docker daemon',
			icon: Database,
			color: 'text-blue-600 bg-blue-100'
		},
		{
			name: 'Security Settings',
			description: 'Authentication configured',
			icon: Shield,
			color: 'text-purple-600 bg-purple-100'
		},
		{
			name: 'App Preferences',
			description: 'Customized to your needs',
			icon: Settings,
			color: 'text-orange-600 bg-orange-100'
		}
	];

	const features = [
		{
			title: 'Container Management',
			description: 'Start, stop, restart, and monitor containers with ease',
			icon: Container
		},
		{
			title: 'Real-time Monitoring',
			description: 'Live metrics, logs, and performance data',
			icon: BarChart3
		},
		{
			title: 'User Management',
			description: 'Secure multi-user access control and permissions',
			icon: Users
		},
		{
			title: 'Quick Actions',
			description: 'Streamlined Docker operations and automation',
			icon: Zap
		}
	];

	async function completeOnboarding() {
		isLoading = true;

		try {
			await settingsAPI.updateSettings({
				onboarding: {
					completed: true,
					completedAt: Date.now(),
					steps: {
						welcome: true,
						password: true,
						docker: true,
						security: true,
						settings: true
					}
				}
			});

			toast.success('Onboarding completed successfully!');
			await invalidateAll();
			goto('/', { replaceState: true });
		} catch (error) {
			toast.error('Failed to complete onboarding');
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="step-content flex flex-col h-full">
	<!-- Success Header -->
	<div class="text-center mb-12" in:fade={{ duration: 800, delay: 200 }}>
		<!-- Animated Success Icon -->
		<div class="relative inline-flex items-center justify-center mb-6">
			<div
				class="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-ping opacity-20"
				in:scale={{ duration: 1000, delay: 400, start: 0.8 }}
			></div>
			<div
				class="relative bg-gradient-to-r from-green-400 to-emerald-500 rounded-full p-6 shadow-xl"
				in:scale={{ duration: 600, delay: 600, easing: cubicOut }}
			>
				<CheckCircle class="size-16 text-white" />
			</div>
		</div>

		<div in:fly={{ y: 20, duration: 600, delay: 800 }}>
			<div class="flex items-center justify-center gap-3 mb-4">
				<Sparkles class="size-8 text-primary animate-pulse" />
				<h1
					class="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent"
				>
					Setup Complete!
				</h1>
				<Sparkles class="size-8 text-accent animate-pulse" style="animation-delay: 0.5s" />
			</div>

			<p class="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
				Congratulations! Arcane is now ready to help you manage your Docker environment with ease
				and efficiency.
			</p>
		</div>
	</div>

	<!-- Setup Summary -->
	<div class="mb-12" in:fly={{ y: 30, duration: 600, delay: 1000 }}>
		<h2 class="text-2xl font-semibold text-center mb-8">What We've Configured</h2>
		<div class="grid gap-4 md:grid-cols-2 max-w-4xl mx-auto">
			{#each completedSteps as step, i}
				<div
					class="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-card to-muted/20 p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
					in:fly={{ x: i % 2 === 0 ? -30 : 30, duration: 500, delay: 1200 + i * 150 }}
				>
					<div
						class="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
					></div>

					<div class="relative flex items-start gap-4">
						<div
							class={`rounded-full p-3 ${step.color} group-hover:scale-110 transition-transform duration-300`}
						>
							<step.icon class="size-6" />
						</div>
						<div class="flex-1">
							<div class="flex items-center gap-2 mb-2">
								<h3 class="font-semibold text-lg">{step.name}</h3>
								<Badge variant="secondary" class="bg-green-100 text-green-800">
									<CheckCircle class="size-3 mr-1" />
									Done
								</Badge>
							</div>
							<p class="text-muted-foreground">{step.description}</p>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Features Preview -->
	<div class="mb-12" in:fly={{ y: 30, duration: 600, delay: 1400 }}>
		<h2 class="text-2xl font-semibold text-center mb-8">Ready to Explore</h2>
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
			{#each features as feature, i}
				<div
					class="group text-center p-6 rounded-xl border bg-gradient-to-br from-card to-muted/20 transition-all duration-300 hover:shadow-lg hover:-translate-y-2"
					in:fly={{ y: 40, duration: 500, delay: 1600 + i * 100 }}
				>
					<div
						class="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300"
					>
						<feature.icon class="size-8 text-primary" />
					</div>
					<h3
						class="font-semibold text-lg mb-2 group-hover:text-primary transition-colors duration-300"
					>
						{feature.title}
					</h3>
					<p class="text-sm text-muted-foreground">
						{feature.description}
					</p>
				</div>
			{/each}
		</div>
	</div>

	<!-- Next Steps -->
	<div class="text-center mb-8" in:fly={{ y: 20, duration: 600, delay: 1800 }}>
		<div
			class="rounded-xl bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20 p-8 max-w-2xl mx-auto"
		>
			<h3 class="text-xl font-semibold mb-4 text-primary flex items-center justify-center gap-2">
				<Star class="size-5" />
				What's Next?
			</h3>
			<div class="space-y-3 text-muted-foreground mb-6">
				<p class="flex items-center justify-center gap-2">
					<Container class="size-4" />
					Start managing your Docker containers and images
				</p>
				<p class="flex items-center justify-center gap-2">
					<BarChart3 class="size-4" />
					Monitor performance and resource usage in real-time
				</p>
				<p class="flex items-center justify-center gap-2">
					<Users class="size-4" />
					Add team members and configure user permissions
				</p>
			</div>
		</div>
	</div>

	<!-- Finish Button -->
	<div class="text-center" in:fly={{ y: 20, duration: 600, delay: 2000 }}>
		<Button
			onclick={completeOnboarding}
			disabled={isLoading}
			class="group relative h-16 w-full max-w-md px-12 text-xl font-bold overflow-hidden bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-2xl hover:shadow-green-500/25 transition-all duration-500 hover:scale-105"
		>
			<!-- Button glow effect -->
			<div
				class="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
			></div>

			<span class="relative flex items-center gap-4">
				{#if isLoading}
					<Loader2 class="size-6 animate-spin" />
					Completing Setup...
				{:else}
					<Sparkles class="size-6 group-hover:rotate-12 transition-transform duration-300" />
					Enter Arcane Dashboard
					<ArrowRight class="size-6 group-hover:translate-x-2 transition-transform duration-300" />
				{/if}
			</span>
		</Button>

		<p class="text-sm text-muted-foreground mt-4">
			Welcome to your new Docker management experience!
		</p>
	</div>
</div>
