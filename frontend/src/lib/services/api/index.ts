import SystemAPIService from './system-api-service';
import TemplateAPIService from './template-api-service';
import UserAPIService from './user-api-service';
import SettingsAPIService from './settings-api-service';
import OidcAPIService from './oidc-api-service';
import ConverterAPIService from './converter-api-service';
import ContainerRegistryAPIService from './container-registry-api-service';
import { EnvironmentAPIService } from './environment-api-service';
import EnvironmentManagementAPIService from './environment-management-api-service';
import EventAPIService from './event-api-service';

export const systemAPI = new SystemAPIService();
export const templateAPI = new TemplateAPIService();
export const userAPI = new UserAPIService();
export const settingsAPI = new SettingsAPIService();
export const oidcAPI = new OidcAPIService();
export const converterAPI = new ConverterAPIService();
export const containerRegistryAPI = new ContainerRegistryAPIService();
export const environmentAPI = new EnvironmentAPIService();
export const environmentManagementAPI = new EnvironmentManagementAPIService();
export const eventAPI = new EventAPIService();

interface APIServices {
	system: SystemAPIService;
	template: TemplateAPIService;
	user: UserAPIService;
	settings: SettingsAPIService;
	oidc: OidcAPIService;
	converter: ConverterAPIService;
	containerRegistry: ContainerRegistryAPIService;
	environment: EnvironmentAPIService;
	environmentManagement: EnvironmentManagementAPIService;
	event: EventAPIService;
}

const apiServices: APIServices = {
	system: systemAPI,
	template: templateAPI,
	user: userAPI,
	settings: settingsAPI,
	oidc: oidcAPI,
	converter: converterAPI,
	containerRegistry: containerRegistryAPI,
	environment: environmentAPI,
	environmentManagement: environmentManagementAPI,
	event: eventAPI
};

export default apiServices;
