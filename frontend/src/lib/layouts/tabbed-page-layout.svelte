<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { TabBar, type TabItem } from '$lib/components/tab-bar/index.js';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import type { Snippet } from 'svelte';

	interface Props {
		backUrl: string;
		backLabel: string;
		tabItems: TabItem[];
		selectedTab: string;
		onTabChange: (value: string) => void;
		headerInfo: Snippet;
		headerActions: Snippet;
		tabContent: Snippet<[string]>;
		class?: string;
		showFloatingHeader?: boolean;
	}

	let {
		backUrl,
		backLabel,
		tabItems,
		selectedTab,
		onTabChange,
		headerInfo,
		headerActions,
		tabContent,
		class: className = '',
	}: Props = $props();
</script>

<div class="bg-background flex h-full flex-col overflow-hidden overscroll-y-none {className}">
	<Tabs.Root value={selectedTab} class="flex min-h-0 w-full flex-1 flex-col">
		<div class="bg-background sticky top-0 flex-shrink-0 border-b backdrop-blur">
			<div class="mx-auto max-w-full py-3">
				<div class="flex items-center justify-between gap-3">
					<div class="flex min-w-0 items-center gap-3">
						<Button variant="ghost" size="sm" href={backUrl}>
							<ArrowLeftIcon class="mr-2 size-4" />
							{backLabel}
						</Button>
						<Separator orientation="vertical" class="mx-1 h-5" />
						<div class="min-w-0">
							{@render headerInfo()}
						</div>
					</div>
					<div class="flex items-center gap-2">
						{@render headerActions()}
					</div>
				</div>

				<div class="mt-4">
					<TabBar items={tabItems} value={selectedTab} onValueChange={onTabChange} />
				</div>
			</div>
		</div>

		<div class="min-h-0 flex-1 overflow-hidden">
			<div class="h-full px-1 py-4 sm:px-4">
				{@render tabContent(selectedTab)}
			</div>
		</div>
	</Tabs.Root>
</div>
