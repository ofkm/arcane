import SystemAPIService from './system-api-service';
import TemplateAPIService from './template-api-service';
import OidcAPIService from './oidc-api-service';
import ConverterAPIService from './converter-api-service';
import ContainerRegistryAPIService from './container-registry-api-service';
import EnvironmentManagementAPIService from './environment-management-api-service';
import EventAPIService from './event-api-service';

export const systemAPI = new SystemAPIService();
export const templateAPI = new TemplateAPIService();
export const oidcAPI = new OidcAPIService();
export const converterAPI = new ConverterAPIService();
export const containerRegistryAPI = new ContainerRegistryAPIService();
export const environmentManagementAPI = new EnvironmentManagementAPIService();
export const eventAPI = new EventAPIService();

interface APIServices {
	system: SystemAPIService;
	template: TemplateAPIService;
	oidc: OidcAPIService;
	converter: ConverterAPIService;
	containerRegistry: ContainerRegistryAPIService;
	environmentManagement: EnvironmentManagementAPIService;
	event: EventAPIService;
}

const apiServices: APIServices = {
	system: systemAPI,
	template: templateAPI,
	oidc: oidcAPI,
	converter: converterAPI,
	containerRegistry: containerRegistryAPI,
	environmentManagement: environmentManagementAPI,
	event: eventAPI
};

export default apiServices;
