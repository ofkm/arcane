<!-- @migration-task Error while migrating Svelte code: Cannot use `export let` in runes mode — use `$props()` instead
https://svelte.dev/e/legacy_export_invalid -->
<script lang="ts">
  import CodeMirror from "svelte-codemirror-editor";
  import { yaml } from "@codemirror/lang-yaml";
  import { oneDark } from "@codemirror/theme-one-dark";
  import { linter, lintGutter } from "@codemirror/lint";
  import { browser } from "$app/environment";
  import jsyaml from "js-yaml";

  let {
    value = $bindable(""),
    height = "400px",
    placeholder = "Enter YAML content",
    forceDarkTheme = false, // Add this prop to force dark theme
  } = $props();

  let darkMode = $state(forceDarkTheme || false);

  // Check for dark mode preference
  $effect(() => {
    if (browser) {
      darkMode =
        forceDarkTheme ||
        window.matchMedia("(prefers-color-scheme: dark)").matches ||
        document.documentElement.classList.contains("dark");
    }
  });

  // YAML linting function
  function yamlLinter(view: { state: { doc: { toString(): string } } }) {
    const diagnostics = [];
    try {
      jsyaml.load(view.state.doc.toString());
    } catch (e: unknown) {
      const err = e as { mark?: { position: number }; message: string };
      const start = err.mark?.position || 0;
      const end = err.mark?.position !== undefined ? err.mark.position + 1 : 1;
      diagnostics.push({
        from: start,
        to: end,
        severity: "error" as const,
        message: err.message,
      });
    }
    return diagnostics;
  }

  // Always include oneDark in extensions
  const extensions = $derived([
    yaml(),
    lintGutter(),
    linter(yamlLinter),
    oneDark,
  ]);
</script>

{#if browser}
  <div class="border rounded-md overflow-hidden">
    <CodeMirror
      bind:value
      {extensions}
      styles={{
        "&": {
          height,
          fontSize: "14px",
          fontFamily: "JetBrains Mono, Menlo, Monaco, Consolas, monospace",
        },
      }}
      {placeholder}
      theme={oneDark}
    />
  </div>
{/if}
