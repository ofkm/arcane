<script lang="ts">
	import '../../app.css';
	import KeyIcon from '@lucide/svelte/icons/key';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import DatabaseIcon from '@lucide/svelte/icons/database';
	import ShieldIcon from '@lucide/svelte/icons/shield';
	import CircleCheckIcon from '@lucide/svelte/icons/check-circle';
	import { page } from '$app/state';
	import { getApplicationLogo } from '$lib/utils/image.util';

	let { children } = $props();

	// Make logo URL reactive to accent color changes
	let logoUrl = $derived(getApplicationLogo());

	const steps = [
		{ id: 'welcome', label: 'Welcome', path: '/onboarding/welcome', icon: CircleCheckIcon },
		{ id: 'password', label: 'Admin Password', path: '/onboarding/password', icon: KeyIcon },
		{ id: 'docker', label: 'Docker Setup', path: '/onboarding/docker', icon: DatabaseIcon },
		{ id: 'security', label: 'Security', path: '/onboarding/security', icon: ShieldIcon },
		{ id: 'settings', label: 'Application Settings', path: '/onboarding/settings', icon: SettingsIcon },
		{ id: 'complete', label: 'Complete', path: '/onboarding/complete', icon: CircleCheckIcon }
	];

	const currentStepIndex = $derived(steps.findIndex((step) => page.url.pathname === step.path));
</script>

<div class="flex min-h-screen flex-col blob-floating" style="--blob-speed: 22s">
	<header class="border-b px-8 py-8 glass glass-subtle">
		<div class="flex items-center">
			<img src={logoUrl} alt="Arcane" class="size-12" />
			<h1 class="ml-4 text-2xl font-bold">Arcane Setup</h1>
		</div>
	</header>

	<div class="container mx-auto px-4 py-6">
		<div class="mb-8 flex items-center justify-between">
			{#each steps as step, i (step.id)}
				<div class="flex flex-col items-center">
					<div
						class={`flex size-10 items-center justify-center rounded-full ${i <= currentStepIndex ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
					>
						<step.icon class="size-5" />
					</div>
					<span class={`mt-2 text-sm ${i <= currentStepIndex ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</span>
				</div>

				{#if i < steps.length - 1}
					<div class={`h-1 flex-1 ${i < currentStepIndex ? 'bg-primary' : 'bg-muted'}`}></div>
				{/if}
			{/each}
		</div>
	</div>

	<main class="container mx-auto flex-1 px-4 py-6">
		<div class="glass bubble bubble-shadow rounded-2xl border p-8">
			{@render children()}
		</div>
	</main>
</div>
