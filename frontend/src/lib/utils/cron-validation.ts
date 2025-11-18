import { z } from 'zod';

/**
 * Shared cron expression validation schema.
 * Validates standard 5-field cron expressions: minute hour day month weekday
 * Empty/null values are considered valid (representing immediate updates).
 */
export const cronExpressionSchema = z
	.string()
	.nullable()
	.default(null)
	.refine(
		(val) => {
			if (!val || val.trim() === '') return true; // Empty is valid (immediate)

			// Basic 5-part cron regex: minute hour day month weekday
			const cronRegex =
				/^(\*|[0-5]?\d|[0-5]?\d-[0-5]?\d|[0-5]?\d\/[0-5]?\d|\*\/[0-5]?\d|[0-5]?\d(,[0-5]?\d)+)\s+(\*|[01]?\d|2[0-3]|[01]?\d-[01]?\d|[01]?\d\/[01]?\d|\*\/[01]?\d|[01]?\d(,[01]?\d)+)\s+(\*|[1-9]|[12]\d|3[01]|[1-9]-[1-9]|[1-9]\/[1-9]|\*\/[1-9]|[1-9](,[1-9])+)\s+(\*|[1-9]|1[0-2]|[1-9]-[1-9]|[1-9]\/[1-9]|\*\/[1-9]|[1-9](,[1-9])+)\s+(\*|[0-6]|[0-6]-[0-6]|[0-6]\/[0-6]|\*\/[0-6]|[0-6](,[0-6])+)$/;

			return cronRegex.test(val.trim());
		},
		{
			message: 'Invalid cron expression format. Expected 5 fields: minute hour day month weekday'
		}
	);
