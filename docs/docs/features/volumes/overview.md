# Volume Management

## What Can You Do With Volumes in Arcane?

- **View Volumes:** See a list of all Docker volumes on your system, along with details like name, driver, and usage.
- **Create Volumes:** Add a new volume by providing a name and (optionally) driver or labels.
- **Remove Volumes:** Delete volumes you no longer need. Arcane will warn you if a volume is currently in use by a container.

## How to Use

### Viewing Volumes

1. Go to the **Volumes** section in the sidebar.
2. You’ll see a table listing all your Docker volumes.

### Creating a Volume

1. Click the **Create Volume** button.
2. Enter a name for your new volume.
3. (Optional) Choose a driver or add labels if needed.
4. Click **Create**. Your new volume will appear in the list.

### Removing a Volume

1. In the volumes list, find the volume you want to remove.
2. Click the dropdown then the **Delete** button (trash icon) in the list.
3. Confirm the deletion in the dialog.
   > **Note:** You cannot remove a volume that is currently used by a container.
