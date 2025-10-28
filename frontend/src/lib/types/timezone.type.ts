export interface TimezoneOption {
	value: string;
	label: string;
	offset: string;
}

export interface TimezoneListResponse {
	timezones: TimezoneOption[];
	common: string[];
}
