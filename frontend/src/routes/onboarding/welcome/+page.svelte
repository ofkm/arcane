<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { CheckCircle2, ChevronRight, Sparkles } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import type { Settings } from '$lib/types/settings.type';
	import settingsStore from '$lib/stores/config-store';
	import { settingsAPI } from '$lib/services/api';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let { data } = $props();
	let currentSettings = $state(data.settings);
	let isLoading = $state(false);

	const updatedSettings: Partial<Settings> = {
		onboarding: {
			steps: {
				welcome: true,
				password: false,
				settings: false
			},
			completed: false
		}
	};

	const features = [
		{ text: 'Change the default admin password for security', delay: 0 },
		{ text: 'Configure your Docker connection', delay: 100 },
		{ text: 'Set basic application preferences', delay: 200 }
	];

	async function continueToNextStep() {
		isLoading = true;

		try {
			currentSettings = await settingsAPI.updateSettings({
				...currentSettings,
				...updatedSettings
			});

			settingsStore.reload();
			goto('/onboarding/password', { invalidateAll: true });
		} catch (error) {
			console.error('Error updating settings:', error);
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="step-content flex flex-col h-full">
	<!-- Hero section -->
	<div class="text-center mb-12" in:fade={{ duration: 600, delay: 200 }}>
		<div class="inline-flex items-center gap-2 mb-4">
			<Sparkles class="size-8 text-primary animate-pulse" />
			<h1 class="text-4xl font-bold bg-clip-text text-foreground">Welcome to Arcane</h1>
			<Sparkles class="size-8 text-primary animate-pulse" style="animation-delay: 0.5s" />
		</div>

		<p class="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
			Thank you for choosing Arcane! Let's get you set up with a powerful Docker management
			experience in just a few quick steps.
		</p>
	</div>

	<!-- Features grid -->
	<div class="flex-1 flex flex-col justify-center">
		<div class="mb-8" in:fly={{ y: 20, duration: 500, delay: 400 }}>
			<h2 class="text-2xl font-semibold mb-6 text-center">This wizard will help you:</h2>

			<div class="grid gap-6 md:grid-cols-3">
				{#each features as feature, i}
					<div
						class="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-card to-muted/20 p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
						in:fly={{ y: 30, duration: 500, delay: 600 + feature.delay }}
					>
						<div
							class="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
						></div>

						<div class="relative flex items-start gap-4">
							<div
								class="bg-primary/10 mt-1 rounded-full p-2 group-hover:bg-primary/20 transition-colors duration-300"
							>
								<CheckCircle2 class="text-primary size-5" />
							</div>
							<p
								class="text-base leading-relaxed group-hover:text-foreground transition-colors duration-300"
							>
								{feature.text}
							</p>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Info callout -->
		<div
			class="rounded-xl bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20 p-6 mb-8 text-center"
			in:fly={{ y: 20, duration: 500, delay: 900 }}
		>
			<p class="text-lg font-medium text-primary mb-2">Quick & Easy Setup</p>
			<p class="text-muted-foreground">
				This will only take a few minutes to complete, and you'll be managing containers like a pro!
			</p>
		</div>
	</div>

	<!-- Action button -->
	<div class="text-center" in:fly={{ y: 20, duration: 500, delay: 1000 }}>
		<Button
			type="button"
			onclick={continueToNextStep}
			disabled={isLoading}
			class="group relative h-14 w-full max-w-md px-8 text-lg font-semibold overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105"
		>
			<span class="relative flex items-center gap-3">
				{#if isLoading}
					<div
						class="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"
					></div>
					Getting Started...
				{:else}
					Let's Get Started
					<ChevronRight
						class="size-5 group-hover:translate-x-1 transition-transform duration-300"
					/>
				{/if}
			</span>
		</Button>
	</div>
</div>
