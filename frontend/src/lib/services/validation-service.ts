import type { ValidationMode } from '$lib/utils/compose-validate.utils';

export interface ValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
	mode?: ValidationMode;
}

export class ValidationService {
	/**
	 * Validate compose configuration via API
	 */
	static async validateComposeConfiguration(composeContent: string, envContent: string = '', mode: ValidationMode = 'default'): Promise<ValidationResult> {
		try {
			const response = await fetch('/api/stacks/validate', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					composeContent,
					envContent,
					mode
				})
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				return {
					valid: false,
					errors: [errorData.error || 'Validation request failed'],
					warnings: []
				};
			}

			return await response.json();
		} catch (error) {
			return {
				valid: false,
				errors: [error instanceof Error ? error.message : 'Network error during validation'],
				warnings: []
			};
		}
	}

	/**
	 * Validate stack by ID via API
	 */
	static async validateStackById(stackId: string, mode: ValidationMode = 'default'): Promise<ValidationResult> {
		try {
			const response = await fetch(`/api/stacks/${stackId}/validate?mode=${mode}`);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				return {
					valid: false,
					errors: [errorData.error || 'Stack validation request failed'],
					warnings: []
				};
			}

			return await response.json();
		} catch (error) {
			return {
				valid: false,
				errors: [error instanceof Error ? error.message : 'Network error during validation'],
				warnings: []
			};
		}
	}
}
