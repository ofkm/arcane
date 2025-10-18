<script lang="ts" generics="T">
	import * as Card from '$lib/components/ui/card';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { cn } from '$lib/utils';
	import type { Snippet, Component } from 'svelte';

	type IconVariant = 'emerald' | 'red' | 'amber' | 'blue' | 'purple' | 'gray' | 'sky' | 'orange';
	type BadgeVariant = 'green' | 'red' | 'amber' | 'blue' | 'purple' | 'gray' | 'orange';

	interface IconConfig {
		component: Component<any>;
		variant: IconVariant;
	}

	interface BadgeConfig {
		variant: BadgeVariant;
		text: string;
	}

	type FieldType = 'text' | 'badge' | 'date' | 'mono' | 'component';

	interface FieldDefinition<T> {
		label: string;
		getValue: (item: T) => any;
		type?: FieldType;
		icon?: Component<any>;
		iconVariant?: IconVariant;
		badgeVariant?: BadgeVariant;
		component?: Snippet<[value: any]>;
		show?: boolean;
	}

	interface FooterConfig<T> {
		label: string;
		getValue: (item: T) => string;
		icon: Component<any>;
	}

	let {
		item,
		icon,
		title,
		subtitle,
		badges = [],
		fields = [],
		footer,
		rowActions,
		children,
		compact = false,
		class: className = '',
		onclick
	}: {
		item: T;
		icon: IconConfig | ((item: T) => IconConfig);
		title: (item: T) => string;
		subtitle?: (item: T) => string | null;
		badges?: (BadgeConfig | ((item: T) => BadgeConfig | null))[];
		fields?: FieldDefinition<T>[];
		footer?: FooterConfig<T>;
		rowActions?: Snippet<[{ item: T }]>;
		children?: Snippet;
		compact?: boolean;
		class?: string;
		onclick?: (item: T) => void;
	} = $props();

	const resolvedIcon = $derived(typeof icon === 'function' ? icon(item) : icon);
	const resolvedBadges = $derived(
		badges.map((b) => (typeof b === 'function' ? b(item) : b)).filter((b): b is BadgeConfig => b !== null)
	);

	const visibleFields = $derived(fields.filter((f) => f.show !== false));

	function getIconBgClass(variant: IconVariant): string {
		const map: Record<IconVariant, string> = {
			emerald: 'bg-emerald-500/8',
			red: 'bg-red-500/8',
			amber: 'bg-amber-500/8',
			blue: 'bg-blue-500/8',
			purple: 'bg-purple-500/8',
			gray: 'bg-muted/40',
			sky: 'bg-sky-500/8',
			orange: 'bg-orange-500/8'
		};
		return map[variant];
	}

	function getIconTextClass(variant: IconVariant): string {
		const map: Record<IconVariant, string> = {
			emerald: 'text-emerald-500',
			red: 'text-red-500',
			amber: 'text-amber-500',
			blue: 'text-blue-500',
			purple: 'text-purple-500',
			gray: 'text-muted-foreground',
			sky: 'text-sky-500',
			orange: 'text-orange-500'
		};
		return map[variant];
	}
</script>

<Card.Root variant="subtle" class={className} onclick={onclick ? () => onclick(item) : undefined}>
	<Card.Content class={cn('flex flex-col', compact ? 'gap-1.5 p-2' : 'gap-3 p-4')}>
		<!-- Main Row -->
		<div class="flex items-start gap-3">
			{#if resolvedIcon}
				{@const IconComponent = resolvedIcon.component}
				<div
					class={cn(
						'flex shrink-0 items-center justify-center rounded-lg',
						compact ? 'size-7' : 'size-9',
						getIconBgClass(resolvedIcon.variant)
					)}
				>
					<IconComponent class={cn(getIconTextClass(resolvedIcon.variant), compact ? 'size-3.5' : 'size-4')} />
				</div>
			{/if}
			<div class="min-w-0 flex-1">
				<h3 class={cn('truncate leading-tight font-medium', compact ? 'text-[13px]' : 'text-[15px]')} title={title(item)}>
					{title(item)}
				</h3>
				{#if subtitle}
					{@const subtitleValue = subtitle(item)}
					{#if subtitleValue}
						<p class={cn('text-muted-foreground mt-0.5 truncate', compact ? 'text-[10px]' : 'text-xs')}>
							{subtitleValue}
						</p>
					{/if}
				{/if}
			</div>
			<div class="flex flex-shrink-0 items-center gap-2">
				{#each resolvedBadges as badge}
					<StatusBadge variant={badge.variant} text={badge.text} size="sm" />
				{/each}
				{#if rowActions}
					{@render rowActions({ item })}
				{/if}
			</div>
		</div>

		<!-- Additional Fields -->
		{#if visibleFields.length > 0}
			{#if !compact}
				<div class="flex flex-wrap gap-x-4 gap-y-3">
					{#each visibleFields as field}
						{@const value = field.getValue(item)}
						{#if value !== null && value !== undefined}
							<div class="flex min-w-0 flex-1 basis-[160px] items-start gap-2.5">
								{#if field.icon}
									{@const FieldIcon = field.icon}
									<div
										class={cn(
											'flex size-7 shrink-0 items-center justify-center rounded-lg',
											field.iconVariant ? getIconBgClass(field.iconVariant) : 'bg-muted/40'
										)}
									>
										<FieldIcon
											class={cn(field.iconVariant ? getIconTextClass(field.iconVariant) : 'text-muted-foreground', 'size-3.5')}
										/>
									</div>
								{/if}
								<div class="min-w-0 flex-1">
									<div class="text-muted-foreground/80 text-[10px] font-medium tracking-wide uppercase">
										{field.label}
									</div>
									<div class="mt-0.5 text-xs font-medium">
										{#if field.type === 'badge' && field.badgeVariant}
											<StatusBadge variant={field.badgeVariant} text={String(value)} />
										{:else if field.type === 'mono'}
											<span class="font-mono">{value}</span>
										{:else if field.type === 'component' && field.component}
											{@render field.component(value)}
										{:else}
											{value}
										{/if}
									</div>
								</div>
							</div>
						{/if}
					{/each}
				</div>
			{:else}
				{#each visibleFields as field}
					{@const value = field.getValue(item)}
					{#if value !== null && value !== undefined}
						<div class="flex items-baseline gap-1.5">
							<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{field.label}:</span>
							{#if field.type === 'badge' && field.badgeVariant}
								<StatusBadge variant={field.badgeVariant} text={String(value)} size="sm" />
							{:else if field.type === 'mono'}
								<span class="text-muted-foreground truncate font-mono text-[11px] leading-tight">{value}</span>
							{:else if field.type === 'component' && field.component}
								<span class="text-muted-foreground min-w-0 flex-1 text-[11px] leading-tight">
									{@render field.component(value)}
								</span>
							{:else}
								<span class="text-muted-foreground min-w-0 flex-1 truncate text-[11px] leading-tight">
									{value}
								</span>
							{/if}
						</div>
					{/if}
				{/each}
			{/if}
		{/if}

		<!-- Custom children content -->
		{#if children}
			{@render children()}
		{/if}
	</Card.Content>

	{#if !compact && footer}
		{@const footerValue = footer.getValue(item)}
		{#if footerValue}
			{@const FooterIcon = footer.icon}
			<Card.Footer class="border-border/50 flex items-center gap-2 border-t py-3">
				<FooterIcon class="text-muted-foreground size-3.5" />
				<span class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
					{footer.label}
				</span>
				<span class="text-muted-foreground ml-auto font-mono text-[11px]">
					{footerValue}
				</span>
			</Card.Footer>
		{/if}
	{/if}
</Card.Root>
