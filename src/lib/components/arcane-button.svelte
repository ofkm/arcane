<script lang="ts">
	import { Button, type Props as ButtonProps } from '$lib/components/ui/button/index.js';
	import { Play, StopCircle, RotateCcw, Download, Trash2, Loader2, RefreshCcwDot, ScanSearch, FileText, EditIcon as Edit, Check, X, Save, PlusCircle, type Icon as IconType } from '@lucide/svelte';

	type Action = 'start' | 'deploy' | 'stop' | 'restart' | 'remove' | 'pull' | 'redeploy' | 'inspect' | 'logs' | 'edit' | 'confirm' | 'cancel' | 'save' | 'create';

	interface Props {
		/** The type of action this button represents. Determines icon, default label, and variant. */
		action: Action;
		/** Function to call when the button is clicked. */
		onClick?: (event: MouseEvent) => void;
		/** If true, shows a loading spinner and disables the button. */
		loading?: boolean;
		/** If true, disables the button. */
		disabled?: boolean;
		/** Custom label for the button. Overrides the default label for the action. */
		label?: string;
		/** If true (default), shows the label text. If false, button will be icon-only. */
		showLabel?: boolean;
		/** Additional CSS classes to apply to the button. */
		class?: string;
		/** Button size. If 'icon', showLabel is effectively false for rendering purposes. */
		size?: ButtonProps['size'];
	}

	let { action, onClick, loading = false, disabled = false, label: customLabel = undefined, showLabel = true, class: extraClass = '', size: customSize = 'default' }: Props = $props();

	type ActionConfig = {
		defaultLabel: string;
		IconComponent: typeof IconType;
		variant: ButtonProps['variant'];
		loadingLabel?: string;
		customClass?: string; // Add customClass property
	};

	const actionConfigs: Record<Action, ActionConfig> = {
		start: { defaultLabel: 'Start', IconComponent: Play, variant: 'default', loadingLabel: 'Starting...', customClass: 'arcane-button-start' },
		deploy: { defaultLabel: 'Deploy', IconComponent: Play, variant: 'default', loadingLabel: 'Deploying...', customClass: 'arcane-button-deploy' },
		stop: { defaultLabel: 'Stop', IconComponent: StopCircle, variant: 'destructive', loadingLabel: 'Stopping...', customClass: 'arcane-button-stop' },
		restart: { defaultLabel: 'Restart', IconComponent: RotateCcw, variant: 'secondary', loadingLabel: 'Restarting...', customClass: 'arcane-button-restart' },
		remove: { defaultLabel: 'Remove', IconComponent: Trash2, variant: 'destructive', loadingLabel: 'Removing...', customClass: 'arcane-button-remove' },
		pull: { defaultLabel: 'Pull', IconComponent: Download, variant: 'secondary', loadingLabel: 'Pulling...', customClass: 'arcane-button-pull' },
		redeploy: { defaultLabel: 'Redeploy', IconComponent: RefreshCcwDot, variant: 'secondary', loadingLabel: 'Redeploying...', customClass: 'arcane-button-redeploy' },
		inspect: { defaultLabel: 'Inspect', IconComponent: ScanSearch, variant: 'outline', loadingLabel: 'Inspecting...', customClass: 'arcane-button-inspect' },
		logs: { defaultLabel: 'Logs', IconComponent: FileText, variant: 'ghost', loadingLabel: 'Fetching...', customClass: 'arcane-button-logs' },
		edit: { defaultLabel: 'Edit', IconComponent: Edit, variant: 'secondary', loadingLabel: 'Saving...', customClass: 'arcane-button-edit' },
		confirm: { defaultLabel: 'Confirm', IconComponent: Check, variant: 'default', loadingLabel: 'Confirming...', customClass: 'arcane-button-confirm' },
		cancel: { defaultLabel: 'Cancel', IconComponent: X, variant: 'ghost', loadingLabel: 'Cancelling...', customClass: 'arcane-button-cancel' },
		save: { defaultLabel: 'Save', IconComponent: Save, variant: 'default', loadingLabel: 'Saving...', customClass: 'arcane-button-save' },
		create: { defaultLabel: 'Create', IconComponent: PlusCircle, variant: 'default', loadingLabel: 'Creating...', customClass: 'arcane-button-create' }
	};

	let config = $derived(actionConfigs[action]);
	let displayLabel = $derived(customLabel ?? config.defaultLabel);
	let displayLoadingLabel = $derived(config.loadingLabel ?? 'Processing...');

	// Determine if the button should render as an icon-only button
	let isIconOnlyButton = $derived(customSize === 'icon' || !showLabel);

	// Icon margin class - apply only if label is shown and it's not explicitly an icon-sized button
	let iconMarginClass = $derived(!isIconOnlyButton ? 'mr-2' : '');
</script>

<Button variant={config.variant} size={customSize} class={`${extraClass} ${config.customClass || ''}`} disabled={disabled || loading} onclick={onClick} aria-label={isIconOnlyButton ? displayLabel : undefined}>
	{#if loading}
		<Loader2 class="animate-spin {iconMarginClass} size-4" />
		{#if !isIconOnlyButton}
			{displayLoadingLabel}
		{/if}
	{:else}
		<config.IconComponent class="{iconMarginClass} size-4" />
		{#if !isIconOnlyButton}
			{displayLabel}
		{/if}
	{/if}
</Button>
