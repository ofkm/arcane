# Network Management

## What Can You Do With Networks in Arcane?

- **View Networks:** See a list of all Docker networks on your system, including their names, drivers, and subnets.
- **Create Networks:** Add a new network by choosing a name, driver, and optional settings like subnet or gateway.
- **Inspect Networks:** Click on a network to see details, including connected containers and configuration.
- **Remove Networks:** Delete networks you no longer need. Arcane will warn you if a network is in use or is a default Docker network.

## How to Use

### Viewing Networks

1. Go to the **Networks** section in the sidebar.
2. You’ll see a table listing all your Docker networks.

### Creating a Network

1. Click the **Create Network** button.
2. Enter a name for your network.
3. (Optional) Choose a driver (like `bridge` or `overlay`) and set advanced options if needed.
4. Click **Create**. Your new network will appear in the list.

### Inspecting a Network

1. Click on a network’s name in the list.
2. You’ll see details like its ID, driver, subnet, gateway, and which containers are connected.

### Removing a Network

1. In the networks list, find the network you want to remove.
2. Click the dropdown, then the **Delete** button (trash icon).
3. Confirm the deletion in the dialog.
   > **Note:** You cannot remove a network that is currently used by containers or is a default Docker network (like `bridge`, `host`, or `none`).

---

For more advanced networking, see the [official Docker documentation](https://docs.docker.com/network/).
