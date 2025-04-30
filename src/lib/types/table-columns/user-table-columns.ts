import type { ColumnDef } from '@tanstack/table-core';
import type { User } from '$lib/types/user.type';
import { renderComponent } from '$lib/components/ui/data-table/index.js';
import UserCell from '$lib/components/table-cells/user-name-cell.svelte';
import EmailCell from '$lib/components/table-cells/user-email-cell.svelte';
import RolesCell from '$lib/components/table-cells/user-roles.cell.svelte';
import UserTableActions from '$lib/components/table-cells/user-table-actions.svelte';

// Column definitions for the user management table
export const userTableColumns = (onRemoveUser: (userId: string, username: string) => void, onEdit: (user: User) => void): ColumnDef<User>[] => [
	{
		id: 'user',
		header: 'User',
		accessorFn: (row) => row.username,
		cell: ({ row }) => {
			return renderComponent(UserCell, {
				displayName: row.original.displayName,
				username: row.original.username
			});
		}
	},
	{
		id: 'email',
		header: 'Email',
		accessorKey: 'email',
		cell: ({ row }) => {
			return renderComponent(EmailCell, {
				email: row.original.email
			});
		}
	},
	{
		id: 'roles',
		header: 'Roles',
		accessorFn: (row) => row.roles.join(', '),
		cell: ({ row }) => {
			return renderComponent(RolesCell, {
				roles: row.original.roles
			});
		}
	},
	{
		id: 'actions',
		header: '',
		cell: ({ row }) => {
			return renderComponent(UserTableActions, {
				userId: row.original.id,
				username: row.original.username,
				user: row.original,
				onRemove: onRemoveUser,
				onEdit: onEdit
			});
		},
		enableSorting: false
	}
];
