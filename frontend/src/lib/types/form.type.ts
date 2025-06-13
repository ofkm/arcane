export type FormInput<T> = {
	value: T;
	valid: boolean;
	touched: boolean;
	error: string | null;
	errors: string[];
};
