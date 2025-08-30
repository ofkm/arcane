<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import CircleCheckIcon from '@lucide/svelte/icons/check-circle';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { goto } from '$app/navigation';
	import settingsStore from '$lib/stores/config-store';
	import { settingsAPI } from '$lib/services/api';

	let { data } = $props();
	let currentSettings = $state(data.settings);

	async function continueToNextStep() {
		await settingsAPI.updateSettings({
			...currentSettings,
			onboardingCompleted: false,
			onboardingSteps: {
				...currentSettings.onboardingSteps,
				welcome: true
			}
		});

		settingsStore.reload();

		goto('/onboarding/password', { invalidateAll: true });
	}
</script>

<div class="mx-auto max-w-3xl">
	<h1 class="mb-6 text-3xl font-bold">Welcome to Arcane</h1>

	<div class="mb-8 space-y-6">
		<p class="text-xl">Thank you for installing Arcane! Let's get you set up with a few quick steps.</p>

		<div class="space-y-4">
			<p class="text-lg font-medium">This wizard will help you:</p>

			<div class="space-y-3">
				<div class="flex items-start gap-3">
					<div class="bg-primary/10 mt-0.5 rounded-full p-1">
						<CircleCheckIcon class="text-primary size-4" />
					</div>
					<p>Change the default admin password for security</p>
				</div>

				<div class="flex items-start gap-3">
					<div class="bg-primary/10 mt-0.5 rounded-full p-1">
						<CircleCheckIcon class="text-primary size-4" />
					</div>
					<p>Configure your Docker connection</p>
				</div>

				<div class="flex items-start gap-3">
					<div class="bg-primary/10 mt-0.5 rounded-full p-1">
						<CircleCheckIcon class="text-primary size-4" />
					</div>
					<p>Set basic application preferences</p>
				</div>
			</div>

			<p>This will only take a few minutes to complete.</p>
		</div>
	</div>

	<div class="flex justify-center pt-8">
		<Button type="button" onclick={() => continueToNextStep()} class="flex h-12 w-[80%] items-center gap-2 px-8">
			<ChevronRightIcon class="size-4" />
			Continue
		</Button>
	</div>
</div>
