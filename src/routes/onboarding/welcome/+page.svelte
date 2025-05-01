<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { CheckCircle2, ChevronRight } from '@lucide/svelte';
</script>

<div class="max-w-3xl mx-auto">
	<h1 class="text-3xl font-bold mb-6">Welcome to Arcane</h1>

	<div class="mb-8 space-y-6">
		<p class="text-xl">Thank you for installing Arcane! Let's get you set up with a few quick steps.</p>

		<div class="space-y-4">
			<p class="text-lg font-medium">This wizard will help you:</p>

			<div class="space-y-3">
				<div class="flex items-start gap-3">
					<div class="rounded-full bg-primary/10 p-1 mt-0.5">
						<CheckCircle2 class="h-4 w-4 text-primary" />
					</div>
					<p>Change the default admin password for security</p>
				</div>

				<div class="flex items-start gap-3">
					<div class="rounded-full bg-primary/10 p-1 mt-0.5">
						<CheckCircle2 class="h-4 w-4 text-primary" />
					</div>
					<p>Configure your Docker connection</p>
				</div>

				<div class="flex items-start gap-3">
					<div class="rounded-full bg-primary/10 p-1 mt-0.5">
						<CheckCircle2 class="h-4 w-4 text-primary" />
					</div>
					<p>Set basic application preferences</p>
				</div>
			</div>

			<p>This will only take a few minutes to complete.</p>
		</div>
	</div>

	<div class="flex justify-end mt-8">
		<Button href="/onboarding/password" class="flex items-center gap-2">
			Get Started
			<ChevronRight class="h-4 w-4" />
		</Button>
	</div>
</div>
