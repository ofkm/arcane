import { containerRegistryAPI } from '$lib/services/api';

export const load = async () => {
	const registries = await containerRegistryAPI.getAllRegistries();

	return { registries };
};
