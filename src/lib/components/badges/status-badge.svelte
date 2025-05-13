<script lang="ts">
	interface Props {
		text: string;
		variant?: 'red' | 'purple' | 'green' | 'blue' | 'gray' | 'amber';
	}

	let { text, variant = 'gray' }: Props = $props();

	// Updated variant classes based on provided RGBA values and Tailwind colors (dark mode removed)
	let variantClasses = $derived(
		{
			// red: bg: rgba(239, 68, 68, 0.15), color: rgb(185, 28, 28), border: rgba(239, 68, 68, 0.15)
			// Closest Tailwind: bg-red-500/15, text-red-700, border-red-700
			red: 'bg-red-500/15 text-red-700 border border-red-700/20',

			// purple: bg: rgba(139, 92, 246, 0.15), color: rgb(107, 33, 168), border: rgba(139, 92, 246, 0.15)
			// Closest Tailwind: bg-purple-500/15, text-purple-700, border-purple-700
			purple: 'bg-purple-500/15 text-purple-700 border border-purple-700/20',

			// green: bg: rgba(34, 197, 94, 0.2), color: rgb(63, 185, 80), border: rgba(34, 197, 94, 0.2)
			// Closest Tailwind: bg-green-500/20, text-green-600, border-green-600
			green: 'bg-green-500/20 text-green-600 border border-green-600/20',

			// blue: bg: rgba(59, 130, 246, 0.15), color: rgb(37, 99, 235), border: rgba(59, 130, 246, 0.15)
			// Closest Tailwind: bg-blue-500/15, text-blue-700, border-blue-700
			blue: 'bg-blue-500/15 text-blue-700 border border-blue-700/20',

			// gray: bg: rgba(156, 163, 175, 0.15), color: rgb(75, 85, 99), border: rgba(156, 163, 175, 0.15)
			// Closest Tailwind: bg-gray-400/15, text-gray-600, border-gray-600
			gray: 'bg-gray-400/15 text-gray-600 border border-gray-600-20',

			// amber: bg: rgba(234, 179, 8, 0.2), color: rgb(210, 153, 34), border: rgba(234, 179, 8, 0.2)
			// Closest Tailwind: bg-amber-500/20, text-amber-600, border-amber-600
			amber: 'bg-amber-500/20 text-amber-600 border border-amber-600/20'
		}[variant]
	);
</script>

<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {variantClasses}">
	{text}
</span>
