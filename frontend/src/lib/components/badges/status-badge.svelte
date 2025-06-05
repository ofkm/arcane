<script lang="ts">
	import { cn } from '$lib/utils';

	type Variant = 'red' | 'purple' | 'green' | 'blue' | 'gray' | 'amber' | 'pink' | 'indigo' | 'cyan' | 'lime' | 'emerald' | 'teal' | 'sky' | 'violet' | 'fuchsia' | 'rose' | 'orange';

	let {
		text,
		variant = 'gray',
		class: className = '',
		...restProps
	} = $props<{
		text: string;
		variant?: Variant;
		class?: string;
	}>();

	const typedVariant: Variant = variant;

	const variantStyles = {
		red: 'bg-red-500/15 text-red-700 border border-red-700/20',
		purple: 'bg-purple-500/15 text-purple-700 border border-purple-700/20',
		green: 'bg-green-500/20 text-green-600 border border-green-600/20',
		blue: 'bg-blue-500/15 text-blue-700 border border-blue-700/20',
		gray: 'bg-gray-400/15 text-gray-600 border border-gray-600-20',
		amber: 'bg-amber-500/20 text-amber-600 border border-amber-600/20',
		pink: 'bg-pink-500/15 text-pink-700 border border-pink-700/20',
		indigo: 'bg-indigo-500/15 text-indigo-700 border border-indigo-700/20',
		cyan: 'bg-cyan-500/15 text-cyan-700 border border-cyan-700/20',
		lime: 'bg-lime-500/15 text-lime-700 border border-lime-700/20',
		emerald: 'bg-emerald-500/20 text-emerald-700 border border-emerald-700/20',
		teal: 'bg-teal-500/15 text-teal-700 border border-teal-700/20',
		sky: 'bg-sky-500/15 text-sky-700 border border-sky-700/20',
		violet: 'bg-violet-500/15 text-violet-700 border border-violet-700/20',
		fuchsia: 'bg-fuchsia-500/15 text-fuchsia-700 border border-fuchsia-700/20',
		rose: 'bg-rose-500/15 text-rose-700 border border-rose-700/20',
		orange: 'bg-orange-500/15 text-orange-700 border border-orange-700/20'
	};
</script>

<span class={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', variantStyles[typedVariant], className)} {...restProps}>
	{text}
</span>
