import ImageAPIService from './image-api-service';
import ImageUpdateAPIService from './image-update-api-service';
import SystemAPIService from './system-api-service';
import TemplateAPIService from './template-api-service';
import UserAPIService from './user-api-service';
import SettingsAPIService from './settings-api-service';
import TemplateRegistryAPIService from './template-registry-api-service';
import OidcAPIService from './oidc-api-service';
import AppConfigAPIService from './appconfig-api-service';
import AutoUpdateAPIService from './autoupdate-api-service';
import ConverterAPIService from './converter-api-service';
import ContainerRegistryAPIService from './container-registry-api-service';
import { EnvironmentAPIService } from './environment-api-service';
import EnvironmentManagementAPIService from './environment-management-api-service';
import EventAPIService from './event-api-service';

export const imageAPI = new ImageAPIService();
export const imageUpdateAPI = new ImageUpdateAPIService();
export const systemAPI = new SystemAPIService();
export const templateAPI = new TemplateAPIService();
export const userAPI = new UserAPIService();
export const settingsAPI = new SettingsAPIService();
export const templateRegistryAPI = new TemplateRegistryAPIService();
export const oidcAPI = new OidcAPIService();
export const appConfigAPI = new AppConfigAPIService();
export const converterAPI = new ConverterAPIService();
export const containerRegistryAPI = new ContainerRegistryAPIService();
export const autoUpdateAPI = new AutoUpdateAPIService();
export const environmentAPI = new EnvironmentAPIService();
export const environmentManagementAPI = new EnvironmentManagementAPIService();
export const eventAPI = new EventAPIService();

interface APIServices {
	image: ImageAPIService;
	imageUpdate: ImageUpdateAPIService;
	system: SystemAPIService;
	template: TemplateAPIService;
	user: UserAPIService;
	settings: SettingsAPIService;
	templateRegistry: TemplateRegistryAPIService;
	oidc: OidcAPIService;
	appConfig: AppConfigAPIService;
	converter: ConverterAPIService;
	containerRegistry: ContainerRegistryAPIService;
	autoUpdate: AutoUpdateAPIService;
	environment: EnvironmentAPIService;
	environmentManagement: EnvironmentManagementAPIService;
	event: EventAPIService;
}

const apiServices: APIServices = {
	image: imageAPI,
	imageUpdate: imageUpdateAPI,
	system: systemAPI,
	template: templateAPI,
	user: userAPI,
	settings: settingsAPI,
	templateRegistry: templateRegistryAPI,
	oidc: oidcAPI,
	appConfig: appConfigAPI,
	converter: converterAPI,
	containerRegistry: containerRegistryAPI,
	autoUpdate: autoUpdateAPI,
	environment: environmentAPI,
	environmentManagement: environmentManagementAPI,
	event: eventAPI
};

export default apiServices;
