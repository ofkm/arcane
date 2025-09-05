<script lang="ts">
	import { page } from '$app/state';

	interface Props {
		children: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	let currentPageName = $derived(page.url.pathname.split('/').pop() || 'settings');
</script>

<div class="settings-container">
	<div class="settings-content w-full px-4 sm:px-6 lg:px-8">
		{@render children()}
	</div>
</div>
