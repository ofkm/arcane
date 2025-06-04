<script lang="ts">
	import { ValidationService, type ValidationResult } from '$lib/services/validation-service';
	import type { ValidationMode } from '$lib/utils/compose-validate.utils';

	interface Props {
		stackId: string;
		composeContent?: string;
		envContent?: string;
		mode?: ValidationMode;
		showDetails?: boolean;
	}

	let { stackId, composeContent = $bindable(''), envContent = $bindable(''), mode = 'default', showDetails = false }: Props = $props();

	let validation: ValidationResult | null = $state(null);
	let validating = $state(false);

	async function validateStack() {
		if (!composeContent.trim()) {
			validation = null;
			return;
		}

		validating = true;
		try {
			validation = await ValidationService.validateComposeConfiguration(composeContent, envContent, mode);
		} catch (error) {
			validation = {
				valid: false,
				errors: [error instanceof Error ? error.message : String(error)],
				warnings: []
			};
		} finally {
			validating = false;
		}
	}

	// Auto-validate when content changes (debounced)
	let debounceTimer: NodeJS.Timeout | undefined = undefined;
	$effect(() => {
		if (composeContent || envContent) {
			clearTimeout(debounceTimer);
			debounceTimer = setTimeout(validateStack, 1000);
		}
	});
</script>

<div class="validation-status">
	{#if validating}
		<div class="flex items-center gap-2 text-muted-foreground">
			<svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
				<path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
			</svg>
			<span class="text-sm">Validating...</span>
		</div>
	{:else if validation}
		<div class="space-y-3">
			<!-- Status Summary -->
			<div class="flex items-center gap-2">
				{#if validation.valid}
					<div class="flex items-center gap-2 text-green-600 dark:text-green-400">
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
						</svg>
						<span class="text-sm font-medium">Valid Configuration</span>
					</div>
				{:else}
					<div class="flex items-center gap-2 text-red-600 dark:text-red-400">
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
						</svg>
						<span class="text-sm font-medium">Invalid Configuration</span>
					</div>
				{/if}

				{#if validation.warnings.length > 0}
					<div class="flex items-center gap-1 text-amber-600 dark:text-amber-400">
						<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
						</svg>
						<span class="text-xs">{validation.warnings.length} warning{validation.warnings.length !== 1 ? 's' : ''}</span>
					</div>
				{/if}
			</div>

			<!-- Detailed Results -->
			{#if showDetails && (validation.errors.length > 0 || validation.warnings.length > 0)}
				<div class="space-y-3">
					{#if validation.errors.length > 0}
						<div class="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/50 rounded-md p-3">
							<h4 class="text-red-800 dark:text-red-200 font-medium text-sm mb-2">Errors</h4>
							<ul class="text-red-700 dark:text-red-300 text-sm space-y-1">
								{#each validation.errors as error}
									<li class="flex items-start gap-1">
										<span class="text-red-500 mt-0.5">•</span>
										<span class="flex-1">{error}</span>
									</li>
								{/each}
							</ul>
						</div>
					{/if}

					{#if validation.warnings.length > 0}
						<div class="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 rounded-md p-3">
							<h4 class="text-amber-800 dark:text-amber-200 font-medium text-sm mb-2">Warnings</h4>
							<ul class="text-amber-700 dark:text-amber-300 text-sm space-y-1">
								{#each validation.warnings as warning}
									<li class="flex items-start gap-1">
										<span class="text-amber-500 mt-0.5">•</span>
										<span class="flex-1">{warning}</span>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>
