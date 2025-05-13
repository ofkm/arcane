import { z } from 'zod'; // Import Zod
import type { AuthSettings } from '$lib/types/settings.type';

export function preventDefault(fn: (event: Event) => any) {
	return function (this: any, event: Event) {
		event.preventDefault();
		fn.call(this, event);
	};
}

export function getPasswordSchema(
	policy: AuthSettings['passwordPolicy'],
	isEdit: boolean,
	currentPasswordValue?: string | null // Pass the current password value from the form
) {
	let schema = z.string();

	// Determine if validation rules should be applied
	// Rules apply if:
	// 1. It's not an edit (i.e., creating a new user, password is required and must meet policy)
	// 2. It is an edit AND a new password has been entered (currentPasswordValue is not empty)
	const shouldApplyPolicy = !isEdit || (isEdit && currentPasswordValue && currentPasswordValue.length > 0);

	if (shouldApplyPolicy) {
		// Base requirement for new users if policy isn't 'strong' enough to imply it
		if (!isEdit) {
			schema = schema.min(1, 'Password is required'); // Ensure password is not empty for new users
		}

		switch (policy) {
			case 'basic':
				schema = schema.min(8, 'Password must be at least 8 characters');
				break;
			case 'standard':
				schema = schema.min(8, 'Password must be at least 8 characters').regex(/[a-z]/, 'Password must contain a lowercase letter').regex(/[A-Z]/, 'Password must contain an uppercase letter').regex(/[0-9]/, 'Password must contain a number');
				break;
			case 'strong':
			default: // Default to strong
				schema = schema
					.min(10, 'Password must be at least 10 characters')
					.regex(/[a-z]/, 'Password must contain a lowercase letter')
					.regex(/[A-Z]/, 'Password must contain an uppercase letter')
					.regex(/[0-9]/, 'Password must contain a number')
					.regex(/[^a-zA-Z0-9]/, 'Password must contain a special character');
				break;
		}
		return schema;
	} else if (isEdit && (!currentPasswordValue || currentPasswordValue.length === 0)) {
		// If editing and password field is empty, it's optional (no change to password)
		return z.string().optional();
	}

	// Fallback for new user if somehow currentPasswordValue was empty but !isEdit
	// This case should ideally be caught by the `!isEdit` in `shouldApplyPolicy`
	if (!isEdit) {
		return schema.min(1, 'Password is required');
	}

	// Default to optional if no other conditions met (should be rare)
	return z.string().optional();
}
