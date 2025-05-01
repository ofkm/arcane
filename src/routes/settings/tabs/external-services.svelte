<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Key } from '@lucide/svelte';
	import type { PageData } from '../$types';

	let { data } = $props<{ data: PageData }>();
</script>

<div class="grid grid-cols-1 gap-6">
	<div class="space-y-2">
		<h2 class="text-2xl font-bold tracking-tight">External Services</h2>
		<p class="text-muted-foreground">Configure connections to external services for enhanced functionality.</p>
	</div>

	<Card.Root class="border shadow-sm border-dashed">
		<Card.Header class="pb-3">
			<div class="flex items-center gap-2">
				<div class="bg-gray-500/10 p-2 rounded-full">
					<Key class="h-5 w-5 text-gray-500" />
				</div>
				<div>
					<Card.Title>Additional Services</Card.Title>
					<Card.Description>More integrations will be available in future updates</Card.Description>
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			<div class="text-center py-8 text-muted-foreground">
				<p>Future services MAY include database connections, monitoring tools, and more.</p>
				<p class="text-sm mt-2">Check back for updates or suggest integrations!</p>
			</div>
		</Card.Content>
	</Card.Root>
</div>
