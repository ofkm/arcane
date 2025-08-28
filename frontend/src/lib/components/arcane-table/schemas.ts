import { z } from 'zod/v4';

export const taskSchema = z.object({
	id: z.string(),
	title: z.string(),
	status: z.string(),
	label: z.string(),
	priority: z.string()
});

export type Task = z.output<typeof taskSchema>;
