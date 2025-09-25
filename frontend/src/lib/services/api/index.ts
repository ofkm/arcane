import TemplateAPIService from './template-api-service';
import ConverterAPIService from './converter-api-service';
import ContainerRegistryAPIService from './container-registry-api-service';
import EnvironmentManagementAPIService from './environment-management-api-service';

export const templateAPI = new TemplateAPIService();
export const converterAPI = new ConverterAPIService();
export const containerRegistryAPI = new ContainerRegistryAPIService();
export const environmentManagementAPI = new EnvironmentManagementAPIService();

interface APIServices {
	template: TemplateAPIService;
	converter: ConverterAPIService;
	containerRegistry: ContainerRegistryAPIService;
	environmentManagement: EnvironmentManagementAPIService;
}

const apiServices: APIServices = {
	template: templateAPI,
	converter: converterAPI,
	containerRegistry: containerRegistryAPI,
	environmentManagement: environmentManagementAPI
};

export default apiServices;
