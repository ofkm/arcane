<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Card } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { FileText, Code, Star, User, Info } from '@lucide/svelte';
	import type { ComposeTemplate } from '$lib/services/template-service';

	interface Props {
		open?: boolean;
		templates?: ComposeTemplate[];
		onClose?: () => void;
		onSelect?: (template: ComposeTemplate) => void;
	}

	let { open = $bindable(false), templates = [], onClose = () => {}, onSelect = () => {} }: Props = $props();

	function handleSelect(template: ComposeTemplate) {
		onSelect(template);
		open = false;
		onClose();
	}

	function handleClose() {
		open = false;
		onClose();
	}

	// Separate templates by type
	const builtInTemplates = $derived(templates.filter((t) => !t.isCustom));
	const customTemplates = $derived(templates.filter((t) => t.isCustom));
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<FileText class="size-5" />
				Choose a Template
			</Dialog.Title>
			<Dialog.Description>Select a pre-configured Docker Compose template to get started quickly.</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-6 py-4">
			{#if templates.length === 0}
				<div class="text-center py-8 text-muted-foreground">
					<FileText class="size-12 mx-auto mb-4 opacity-50" />
					<p class="mb-2">No templates available</p>
					<p class="text-sm">Add template files to the <code class="bg-muted px-1 rounded">data/templates/compose/</code> directory</p>
				</div>
			{:else}
				<!-- Info Alert -->
				<Alert.Root>
					<Info class="size-4" />
					<Alert.Title>Custom Templates</Alert.Title>
					<Alert.Description>
						Add your own templates by placing .yaml files in <code class="bg-muted px-1 rounded text-xs">data/templates/compose/</code>
					</Alert.Description>
				</Alert.Root>

				<!-- Built-in Templates -->
				{#if builtInTemplates.length > 0}
					<div>
						<h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
							<Star class="size-5 text-yellow-500" />
							Built-in Templates
						</h3>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							{#each builtInTemplates as template}
								<Card class="cursor-pointer hover:bg-muted/50 transition-colors border-2 hover:border-primary/20">
									<button type="button" class="w-full text-left p-4" onclick={() => handleSelect(template)}>
										<div class="flex items-start justify-between mb-2">
											<h4 class="font-semibold">{template.name}</h4>
											<Badge variant="secondary" class="ml-2">
												<Code class="size-3 mr-1" />
												Built-in
											</Badge>
										</div>
										<p class="text-sm text-muted-foreground mb-3">
											{template.description}
										</p>
										<div class="text-xs text-muted-foreground">Click to use this template</div>
									</button>
								</Card>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Custom Templates -->
				{#if customTemplates.length > 0}
					<div>
						<h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
							<User class="size-5 text-blue-500" />
							Custom Templates
						</h3>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							{#each customTemplates as template}
								<Card class="cursor-pointer hover:bg-muted/50 transition-colors border-2 hover:border-primary/20">
									<button type="button" class="w-full text-left p-4" onclick={() => handleSelect(template)}>
										<div class="flex items-start justify-between mb-2">
											<h4 class="font-semibold">{template.name}</h4>
											<Badge variant="outline" class="ml-2">
												<User class="size-3 mr-1" />
												Custom
											</Badge>
										</div>
										<p class="text-sm text-muted-foreground mb-3">
											{template.description}
										</p>
										<div class="text-xs text-muted-foreground">Click to use this template</div>
									</button>
								</Card>
							{/each}
						</div>
					</div>
				{/if}
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={handleClose}>Cancel</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
