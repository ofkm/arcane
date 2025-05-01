<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Trash2, Info } from '@lucide/svelte';

	interface Props {
		image: {
			id: string;
			repo: string;
			tag: string;
			size: string;
		};
	}

	let { image }: Props = $props();
</script>

<tr class="border-b">
	<td class="py-2">{image.repo}</td>
	<td>{image.tag}</td>
	<td class="font-mono text-xs">{image.id.substring(7, 19)}</td>
	<td>{image.size}</td>
	<td class="py-2">
		<div class="flex gap-2">
			<Button variant="ghost" size="sm" href="/images/{image.id}">
				<Info class="w-4 h-4" />
			</Button>
			<Button variant="destructive" size="sm">
				<Trash2 class="w-4 h-4" />
			</Button>
		</div>
	</td>
</tr>
