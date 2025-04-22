<script lang="ts">
  import CodeMirror from "svelte-codemirror-editor";
  import { yaml } from "@codemirror/lang-yaml";
  import { oneDark } from "@codemirror/theme-one-dark";
  import { linter, lintGutter } from "@codemirror/lint";
  import { browser } from "$app/environment";
  import jsyaml from "js-yaml";
  import { createEventDispatcher } from "svelte";
  import { EditorView } from "@codemirror/view";

  const dispatch = createEventDispatcher();

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

  // Custom theme that aligns with your application theme
  const arcaneTheme = EditorView.theme(
    {
      "&": {
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
      },
      ".cm-content": {
        caretColor: "var(--primary)",
      },
      ".cm-cursor": {
        borderLeftColor: "var(--primary)",
      },
      ".cm-activeLine": {
        backgroundColor: "color-mix(in srgb, var(--accent), transparent 50%)",
      },
      ".cm-activeLineGutter": {
        backgroundColor: "color-mix(in srgb, var(--accent), transparent 70%)",
      },
      ".cm-gutters": {
        backgroundColor: "var(--muted)",
        color: "var(--muted-foreground)",
        border: "none",
      },
      ".cm-line": {
        padding: "0 0.5rem",
      },
      ".cm-selectionBackground": {
        backgroundColor: "color-mix(in srgb, var(--primary), transparent 70%)",
      },
      ".cm-selectionMatch": {
        backgroundColor: "color-mix(in srgb, var(--primary), transparent 80%)",
      },
      ".cm-matchingBracket, .cm-nonmatchingBracket": {
        backgroundColor: "color-mix(in srgb, var(--primary), transparent 80%)",
        outline: "1px solid var(--border)",
      },
      // Syntax highlighting
      // YAML-specific syntax highlighting
      ".cm-keyword": { color: "var(--primary)" }, // YAML keywords and special tokens
      ".cm-atom": { color: "var(--accent-foreground)" }, // YAML boolean and null values
      ".cm-number": { color: "var(--accent-foreground)" }, // YAML numbers
      ".cm-property": { color: "var(--primary)" }, // YAML keys
      ".cm-string": { color: "var(--success)" }, // YAML string values
      ".cm-operator": { color: "var(--destructive)" }, // Colons, dashes, etc.
      ".cm-comment": { color: "var(--muted-foreground)", fontStyle: "italic" }, // Comments

      // More general highlighting
      ".cm-meta": { color: "var(--secondary)" },
      ".cm-def": { color: "var(--primary)" },
      ".cm-variable": { color: "var(--foreground)" },
      ".cm-variable-2": { color: "var(--foreground)" },
      ".cm-tag": { color: "var(--destructive)" },
      ".cm-header": { color: "var(--primary)", fontWeight: "bold" },
      ".cm-link": { color: "var(--primary)", textDecoration: "underline" },
    },
    { dark: darkMode }
  );

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

  // Use the custom theme based on dark mode
  const extensions = $derived([
    yaml(),
    lintGutter(),
    linter(yamlLinter),
    arcaneTheme,
  ]);

  function handleChange(e: Event) {
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
      }}
      {placeholder}
    />
  </div>
{/if}
