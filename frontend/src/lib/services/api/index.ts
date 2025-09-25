import TemplateAPIService from './template-api-service';
import ContainerRegistryAPIService from './container-registry-api-service';

export const templateAPI = new TemplateAPIService();
export const containerRegistryAPI = new ContainerRegistryAPIService();

interface APIServices {
	template: TemplateAPIService;
	containerRegistry: ContainerRegistryAPIService;
}

const apiServices: APIServices = {
	template: templateAPI,
	containerRegistry: containerRegistryAPI
};

export default apiServices;
