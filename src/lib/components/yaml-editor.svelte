<script lang="ts">
  import CodeMirror from "svelte-codemirror-editor";
  import { yaml } from "@codemirror/lang-yaml";
  import { linter, lintGutter } from "@codemirror/lint";
  import { browser } from "$app/environment";
  import jsyaml from "js-yaml";
  import { createEventDispatcher } from "svelte";
  import { oneDark } from "@codemirror/theme-one-dark";

  const dispatch = createEventDispatcher();

  let {
    value = $bindable(""),
    height = "400px",
    placeholder = "Enter YAML content",
    forceDarkTheme = true,
    readOnly = false,
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

  const extensions = $derived([
    yaml(),
    lintGutter(),
    linter(yamlLinter),
    darkMode ? oneDark : [],
  ]);

  function handleChange(e: Event) {
    // No need to dispatch if readOnly
    if (readOnly) return;
    const target = e.target as HTMLInputElement;
    value = target.value;
    dispatch("change", { value });
  }
</script>

{#if browser}
  <div class="border rounded-md overflow-hidden">
    <CodeMirror
      bind:value
      on:change={handleChange}
      {extensions}
      styles={{
        "&": {
          height,
          fontSize: "14px",
          fontFamily: "JetBrains Mono, Menlo, Monaco, Consolas, monospace",
        },
        // Optionally add styles for read-only state
        "&.cm-editor[contenteditable=false]": {
          backgroundColor: "#f8f8f8", // Example: slightly different background
          cursor: "not-allowed",
        },
        ".cm-content[contenteditable=false]": {
          cursor: "not-allowed",
        },
      }}
      {placeholder}
      readonly={readOnly}
    />
  </div>
{/if}
