<script lang="ts">
  import { Meter, useId } from "bits-ui";
  import { cn } from "$lib/utils";
  import type { ComponentProps } from "svelte";

  let {
    max = 100,
    value = 0,
    min = 0,
    label,
    valueLabel,
    showLabel = true,
    showValueLabel = true,
    variant = "default",
    size = "default",
    class: className = "",
    ...restProps
  }: ComponentProps<typeof Meter.Root> & {
    label?: string;
    valueLabel?: string;
    showLabel?: boolean;
    showValueLabel?: boolean;
    variant?: "default" | "success" | "warning" | "destructive";
    size?: "sm" | "default" | "lg";
    class?: string;
  } = $props();

  const labelId = useId();

  const variantStyles = {
    default: "bg-accent",
    success: "bg-green-500",
    warning: "bg-amber-500",
    destructive: "bg-destructive",
  };

  const sizeStyles = {
    sm: "h-1.5",
    default: "h-2.5",
    lg: "h-4",
  };

  const percentage = $derived(Math.round(((value - min) / (max - min)) * 100));
</script>

{#if showLabel && (label || valueLabel)}
  <div class="flex items-center justify-between text-sm mb-2">
    {#if showLabel && label}
      <span id={labelId} class="font-medium text-foreground">{label}</span>
    {/if}
    {#if showValueLabel && valueLabel}
      <span class="text-muted-foreground">{valueLabel}</span>
    {/if}
  </div>
{/if}

<div
  class={cn(
    "relative w-full bg-secondary rounded-full overflow-hidden",
    sizeStyles[size],
    className
  )}
>
  <Meter.Root
    aria-labelledby={label ? labelId : undefined}
    aria-valuetext={valueLabel}
    {value}
    {min}
    {max}
    class="w-full h-full"
    {...restProps}
  >
    <div
      class={cn(
        "h-full rounded-full transition-all duration-300 ease-in-out",
        variantStyles[variant]
      )}
      style="width: {percentage}%"
    ></div>
  </Meter.Root>
</div>
