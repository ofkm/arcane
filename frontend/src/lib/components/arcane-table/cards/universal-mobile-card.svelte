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

<div class={cn('group relative w-full px-3 py-3', className)}>
	<Card.Root
		variant="subtle"
		class={cn(
			'overflow-hidden text-left transition-all duration-200',
			onclick && 'cursor-pointer hover:border-white/20 hover:shadow-md'
		)}
		onclick={onclick ? () => onclick(item) : undefined}
	>
		<Card.Content class={cn('flex flex-col text-left', compact ? 'gap-3 p-3' : 'gap-4 p-4')}>
			<!-- Main Row -->
			<div class="flex items-start gap-4">
				{#if resolvedIcon}
					{@const IconComponent = resolvedIcon.component}
					<div
						class={cn(
							'flex shrink-0 items-center justify-center rounded-xl ring-1 backdrop-blur-sm transition-transform duration-200 ring-inset group-hover:scale-105',
							compact ? 'size-9' : 'size-11',
							getIconBgClass(resolvedIcon.variant),
							'ring-white/5'
						)}
					>
						<IconComponent class={cn(getIconTextClass(resolvedIcon.variant), compact ? 'size-4.5' : 'size-5')} />
					</div>
				{/if}
				<div class="min-w-0 flex-1">
					<h3 class={cn('truncate leading-snug font-semibold', compact ? 'text-sm' : 'text-[15px]')} title={title(item)}>
						{title(item)}
					</h3>
					{#if subtitle}
						{@const subtitleValue = subtitle(item)}
						{#if subtitleValue}
							<p
								class={cn(
									'text-muted-foreground mt-1.5 truncate leading-relaxed font-medium',
									compact ? 'text-[11px]' : 'text-xs'
								)}
							>
								{subtitleValue}
							</p>
						{/if}
					{/if}
				</div>
				<div class="flex shrink-0 items-center gap-2">
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
					<div class="-mx-4 flex flex-wrap gap-x-6 gap-y-4 px-4">
						{#each visibleFields as field}
							{@const value = field.getValue(item)}
							{#if value !== null && value !== undefined}
								<div class="flex min-w-0 flex-1 basis-[150px] items-start gap-3">
									{#if field.icon}
										{@const FieldIcon = field.icon}
										<div
											class={cn(
												'flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-white/5 backdrop-blur-sm ring-inset',
												field.iconVariant ? getIconBgClass(field.iconVariant) : 'bg-muted/40'
											)}
										>
											<FieldIcon
												class={cn(field.iconVariant ? getIconTextClass(field.iconVariant) : 'text-muted-foreground', 'size-4')}
											/>
										</div>
									{/if}
									<div class="min-w-0 flex-1 pt-0.5">
										<div class="text-muted-foreground/70 mb-1 text-[10px] leading-tight font-semibold tracking-wider uppercase">
											{field.label}
										</div>
										<div class="text-sm leading-snug font-medium">
											{#if field.type === 'badge' && field.badgeVariant}
												<StatusBadge variant={field.badgeVariant} text={String(value)} />
											{:else if field.type === 'mono'}
												<span class="font-mono text-xs">{value}</span>
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
							<div class="flex items-baseline gap-2">
								<span class="text-muted-foreground/70 text-[10px] font-semibold tracking-wider uppercase">{field.label}:</span>
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
				<Card.Footer class="bg-muted/30 border-border/40 flex items-center gap-3 border-t px-4 py-3.5 backdrop-blur-sm">
					<FooterIcon class="text-muted-foreground size-4" />
					<span class="text-muted-foreground/70 text-[10px] font-semibold tracking-wider uppercase">
						{footer.label}
					</span>
					<span class="text-foreground ml-auto font-mono text-xs font-medium">
						{footerValue}
					</span>
				</Card.Footer>
			{/if}
		{/if}
	</Card.Root>
</div>
