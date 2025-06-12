# Page snapshot

```yaml
- region "Notifications alt+T"
- main:
  - img "Arcane"
  - heading "Sign in to Arcane" [level=1]
  - paragraph: Manage your Container Environment
  - text: Username
  - img
  - textbox "Username"
  - text: Password
  - img
  - textbox "Password"
  - button "Sign in"
  - text: Or continue with
  - button "Sign in with OIDC Provider":
    - img
    - text: Sign in with OIDC Provider
  - paragraph:
    - link "View on GitHub":
      - /url: https://github.com/ofkm/arcane
```