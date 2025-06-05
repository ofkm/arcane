export interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
	warnings: ValidationWarning[];
}

export interface ValidationError {
	field?: string;
	message: string;
	code?: string;
	line?: number;
	column?: number;
}

export interface ValidationWarning {
	field?: string;
	message: string;
	code?: string;
	line?: number;
	column?: number;
}

export interface DockerComposeValidation extends ValidationResult {
	services?: ServiceValidation[];
	networks?: NetworkValidation[];
	volumes?: VolumeValidation[];
}

export interface ServiceValidation {
	name: string;
	valid: boolean;
	errors: ValidationError[];
	warnings: ValidationWarning[];
}

export interface NetworkValidation {
	name: string;
	valid: boolean;
	errors: ValidationError[];
}

export interface VolumeValidation {
	name: string;
	valid: boolean;
	errors: ValidationError[];
}
