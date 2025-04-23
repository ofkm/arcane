<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";

  let {
    variant = "default",
    text = "",
    bgColor = undefined,
    textColor = undefined,
  }: {
    variant?: "default" | "secondary" | "destructive" | "outline";
    text: string;
    bgColor?: string;
    textColor?: string;
  } = $props();

  // Generate class names based on props
  let customClass = $derived(
    [bgColor ? `bg-${bgColor}` : "", textColor ? `text-${textColor}` : ""]
      .filter(Boolean)
      .join(" ")
  );
</script>

<Badge {variant} class={customClass}>
  {text}
</Badge>
