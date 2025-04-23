<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import { Lock, Key, Shield } from "@lucide/svelte";
  import type { ActionData, PageData } from "../$types";
  import * as Form from "$lib/components/ui/form/index.js";

  let { data, form } = $props<{ data: PageData; form: ActionData }>();

  // Authentication settings
  let enableLocalAuth = $state(true);
  let enableOAuth = $state(false);
  let enableLDAP = $state(false);
  let sessionTimeout = $state(60);
  let passwordPolicy = $state("medium");
</script>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <!-- General Auth Settings -->
  <Card.Root class="border shadow-sm">
    <Card.Header class="pb-3">
      <div class="flex items-center gap-2">
        <div class="bg-indigo-500/10 p-2 rounded-full">
          <Lock class="h-5 w-5 text-indigo-500" />
        </div>
        <div>
          <Card.Title>Authentication Methods</Card.Title>
          <Card.Description>Configure how users sign in</Card.Description>
        </div>
      </div>
    </Card.Header>
    <Card.Content>
      <div class="space-y-4">
        <!-- Local Auth -->
        <div
          class="flex items-center justify-between rounded-lg border p-4 bg-muted/30"
        >
          <div class="space-y-0.5">
            <label for="localAuthSwitch" class="text-base font-medium"
              >Local Authentication</label
            >
            <p class="text-sm text-muted-foreground">
              Username and password stored in the system
            </p>
          </div>
          <Switch
            id="localAuthSwitch"
            name="enableLocalAuth"
            bind:checked={enableLocalAuth}
          />
        </div>

        <!-- OAuth -->
        <div
          class="flex items-center justify-between rounded-lg border p-4 bg-muted/30"
        >
          <div class="space-y-0.5">
            <label for="oauthSwitch" class="text-base font-medium"
              >OAuth/OpenID Connect</label
            >
            <p class="text-sm text-muted-foreground">
              Single sign-on with external providers
            </p>
          </div>
          <Switch
            id="oauthSwitch"
            name="enableOAuth"
            bind:checked={enableOAuth}
          />
        </div>

        <!-- LDAP -->
        <div
          class="flex items-center justify-between rounded-lg border p-4 bg-muted/30"
        >
          <div class="space-y-0.5">
            <label for="ldapSwitch" class="text-base font-medium"
              >LDAP/Active Directory</label
            >
            <p class="text-sm text-muted-foreground">
              Authentication via directory service
            </p>
          </div>
          <Switch id="ldapSwitch" name="enableLDAP" bind:checked={enableLDAP} />
        </div>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Session Settings -->
  <div class="space-y-6">
    <Card.Root class="border shadow-sm">
      <Card.Header class="pb-3">
        <div class="flex items-center gap-2">
          <div class="bg-cyan-500/10 p-2 rounded-full">
            <Key class="h-5 w-5 text-cyan-500" />
          </div>
          <div>
            <Card.Title>Session Settings</Card.Title>
            <Card.Description>Configure session behavior</Card.Description>
          </div>
        </div>
      </Card.Header>
      <Card.Content>
        <div class="space-y-4">
          <div class="space-y-2">
            <label for="sessionTimeout" class="text-sm font-medium"
              >Session Timeout (minutes)</label
            >
            <Input
              type="number"
              id="sessionTimeout"
              name="sessionTimeout"
              bind:value={sessionTimeout}
              min="15"
              max="1440"
            />
            <p class="text-xs text-muted-foreground">
              Time until inactive sessions are automatically logged out (15-1440
              minutes)
            </p>
          </div>

          <div class="space-y-2">
            <label for="passwordPolicy" class="text-sm font-medium"
              >Password Policy</label
            >
            <div class="grid grid-cols-3 gap-2">
              <Button
                variant={passwordPolicy === "low" ? "default" : "outline"}
                class="w-full"
                onclick={() => (passwordPolicy = "low")}
              >
                Basic
              </Button>
              <Button
                variant={passwordPolicy === "medium" ? "default" : "outline"}
                class="w-full"
                onclick={() => (passwordPolicy = "medium")}
              >
                Standard
              </Button>
              <Button
                variant={passwordPolicy === "high" ? "default" : "outline"}
                class="w-full"
                onclick={() => (passwordPolicy = "high")}
              >
                Strong
              </Button>
            </div>
            <input
              type="hidden"
              id="passwordPolicy"
              name="passwordPolicy"
              value={passwordPolicy}
            />
            <p class="text-xs text-muted-foreground mt-1">
              {#if passwordPolicy === "low"}
                Basic: Minimum 8 characters
              {:else if passwordPolicy === "medium"}
                Standard: Minimum 10 characters, requires mixed case and numbers
              {:else}
                Strong: Minimum 12 characters, requires mixed case, numbers and
                special characters
              {/if}
            </p>
          </div>
        </div>
      </Card.Content>
    </Card.Root>

    <!-- 2FA Settings -->
    <Card.Root class="border shadow-sm">
      <Card.Header class="pb-3">
        <div class="flex items-center gap-2">
          <div class="bg-emerald-500/10 p-2 rounded-full">
            <Shield class="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <Card.Title>Two-Factor Authentication</Card.Title>
            <Card.Description>Extra security layer</Card.Description>
          </div>
        </div>
      </Card.Header>
      <Card.Content>
        <div class="space-y-4">
          <div
            class="flex items-center justify-between rounded-lg border p-4 bg-muted/30"
          >
            <div class="space-y-0.5">
              <label for="require2faSwitch" class="text-base font-medium"
                >Require 2FA</label
              >
              <p class="text-sm text-muted-foreground">
                Force all users to set up two-factor authentication
              </p>
            </div>
            <Switch id="require2faSwitch" name="require2fa" />
          </div>

          <div
            class="flex items-center justify-between rounded-lg border p-4 bg-muted/30"
          >
            <div class="space-y-0.5">
              <label for="allowTotpSwitch" class="text-base font-medium"
                >Allow App-Based 2FA</label
              >
              <p class="text-sm text-muted-foreground">
                Allow authentication apps (TOTP)
              </p>
            </div>
            <Switch id="allowTotpSwitch" name="allowTotp" checked />
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  </div>
</div>
