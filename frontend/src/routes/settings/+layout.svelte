<script lang="ts">
	import { page } from '$app/state';

	interface Props {
		children: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	let currentPageName = $derived(page.url.pathname.split('/').pop() || 'settings');
	let pageTitle = $derived(currentPageName.charAt(0).toUpperCase() + currentPageName.slice(1));
</script>

<div class="settings-container">
	<div class="settings-content">
		{@render children()}
	</div>
</div>
