import { userAPI } from './api';
import type { User } from '$lib/types/user.type';
import type { Role } from './api/user-api-service';

// Simple wrapper around the API service for backward compatibility
export async function getUserById(id: string): Promise<User | null> {
	try {
		return await userAPI.get(id);
	} catch (error) {
		console.error('Error getting user by ID:', error);
		return null;
	}
}

export async function getUserByUsername(username: string): Promise<User | null> {
	try {
		// Since the API doesn't have a direct getUserByUsername endpoint,
		// we'll need to get all users and filter (or add this endpoint to the backend)
		const users = await userAPI.list();
		return users.find((user) => user.username.toLowerCase() === username.toLowerCase()) || null;
	} catch (error) {
		console.error('Error getting user by username:', error);
		return null;
	}
}

export async function getUserByOidcSubjectId(oidcSubjectId: string): Promise<User | null> {
	try {
		// Similar to getUserByUsername, we'll filter from the list
		// In the future, you might want to add a specific API endpoint for this
		const users = await userAPI.list();
		return users.find((user) => user.oidcSubjectId === oidcSubjectId) || null;
	} catch (error) {
		console.error('Error getting user by OIDC subject ID:', error);
		return null;
	}
}

export async function listUsers(): Promise<User[]> {
	try {
		return await userAPI.list();
	} catch (error) {
		console.error('Error listing users:', error);
		return [];
	}
}

export async function saveUser(user: User): Promise<User | null> {
	try {
		if (user.id) {
			// Update existing user
			return await userAPI.update(user.id, user);
		} else {
			// Create new user
			return await userAPI.create(user);
		}
	} catch (error) {
		console.error('Error saving user:', error);
		return null;
	}
}

export async function createUser(
	user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>
): Promise<User | null> {
	try {
		return await userAPI.create(user);
	} catch (error) {
		console.error('Error creating user:', error);
		return null;
	}
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User | null> {
	try {
		return await userAPI.update(id, updates);
	} catch (error) {
		console.error('Error updating user:', error);
		return null;
	}
}

export async function deleteUser(id: string): Promise<boolean> {
	try {
		await userAPI.delete(id);
		return true;
	} catch (error) {
		console.error('Error deleting user:', error);
		return false;
	}
}

// Authentication functions
export async function login(credentials: {
	username: string;
	password: string;
	rememberMe?: boolean;
}) {
	try {
		return await userAPI.login(credentials);
	} catch (error) {
		console.error('Error during login:', error);
		throw error;
	}
}

export async function logout(): Promise<void> {
	try {
		await userAPI.logout();
	} catch (error) {
		console.error('Error during logout:', error);
		throw error;
	}
}

export async function changePassword(
	userId: string,
	currentPassword: string,
	newPassword: string
): Promise<boolean> {
	try {
		await userAPI.changePassword(userId, { currentPassword, newPassword });
		return true;
	} catch (error) {
		console.error('Error changing password:', error);
		return false;
	}
}

export async function resetPassword(userId: string, newPassword: string): Promise<boolean> {
	try {
		await userAPI.resetPassword(userId, newPassword);
		return true;
	} catch (error) {
		console.error('Error resetting password:', error);
		return false;
	}
}

// RBAC functions
export async function getRoles(): Promise<Role[]> {
	try {
		return await userAPI.getRoles();
	} catch (error) {
		console.error('Error getting roles:', error);
		return [];
	}
}

export async function getRole(id: string): Promise<Role | null> {
	try {
		return await userAPI.getRole(id);
	} catch (error) {
		console.error('Error getting role:', error);
		return null;
	}
}

export async function createRole(role: Omit<Role, 'id'>): Promise<Role | null> {
	try {
		return await userAPI.createRole(role);
	} catch (error) {
		console.error('Error creating role:', error);
		return null;
	}
}

export async function updateRole(id: string, updates: Partial<Role>): Promise<Role | null> {
	try {
		return await userAPI.updateRole(id, updates);
	} catch (error) {
		console.error('Error updating role:', error);
		return null;
	}
}

export async function deleteRole(id: string): Promise<boolean> {
	try {
		await userAPI.deleteRole(id);
		return true;
	} catch (error) {
		console.error('Error deleting role:', error);
		return false;
	}
}

export async function assignRole(userId: string, roleId: string): Promise<boolean> {
	try {
		await userAPI.assignRole(userId, roleId);
		return true;
	} catch (error) {
		console.error('Error assigning role:', error);
		return false;
	}
}

export async function removeRole(userId: string, roleId: string): Promise<boolean> {
	try {
		await userAPI.removeRole(userId, roleId);
		return true;
	} catch (error) {
		console.error('Error removing role:', error);
		return false;
	}
}

export async function getUserRoles(userId: string): Promise<Role[]> {
	try {
		return await userAPI.getUserRoles(userId);
	} catch (error) {
		console.error('Error getting user roles:', error);
		return [];
	}
}

export async function getPermissions(): Promise<string[]> {
	try {
		return await userAPI.getPermissions();
	} catch (error) {
		console.error('Error getting permissions:', error);
		return [];
	}
}

// Password utilities - these can be moved to the backend eventually
export async function verifyPassword(user: User, password: string): Promise<boolean> {
	// This should ideally be handled by the backend during login
	// For now, we'll return false and let the backend handle verification
	console.warn('verifyPassword should be handled by the backend during login');
	return false;
}

export async function hashPassword(password: string): Promise<string> {
	// This should be handled by the backend
	console.warn('hashPassword should be handled by the backend');
	return password; // Return as-is, let backend handle hashing
}

export async function deriveKeyFromPassword(password: string, salt: string): Promise<string> {
	// This should be handled by the backend for security
	console.warn('deriveKeyFromPassword should be handled by the backend');
	return '';
}
