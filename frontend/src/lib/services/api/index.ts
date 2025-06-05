import ContainerAPIService from './container-api-service';
import ImageAPIService from './image-api-service';
import VolumeAPIService from './volume-api-service';
import NetworkAPIService from './network-api-service';
import StackAPIService from './stack-api-service';
import SystemAPIService from './system-api-service';
import TemplateAPIService from './template-api-service';
import UserAPIService from './user-api-service';
import SessionAPIService from './session-api-service';
import SettingsAPIService from './settings-api-service';
import TemplateRegistryAPIService from './template-api-service';
import OidcAPIService from './oidc-api-service';
import EncryptionAPIService from './encryption-api-service';
import DeploymentAPIService from './deployment-api-service';
import ValidationAPIService from './validation-api-service';
import AppConfigAPIService from './appconfig-api-service';

// Create singleton instances
export const containerAPI = new ContainerAPIService();
export const imageAPI = new ImageAPIService();
export const volumeAPI = new VolumeAPIService();
export const networkAPI = new NetworkAPIService();
export const stackAPI = new StackAPIService();
export const systemAPI = new SystemAPIService();
export const templateAPI = new TemplateAPIService();
export const userAPI = new UserAPIService();
export const sessionAPI = new SessionAPIService();
export const settingsAPI = new SettingsAPIService();
export const templateRegistryAPI = new TemplateRegistryAPIService();
export const oidcAPI = new OidcAPIService();
export const encryptionAPI = new EncryptionAPIService();
export const deploymentAPI = new DeploymentAPIService();
export const validationAPI = new ValidationAPIService();
export const appConfigAPI = new AppConfigAPIService();

export default {
	container: containerAPI,
	image: imageAPI,
	volume: volumeAPI,
	network: networkAPI,
	stack: stackAPI,
	system: systemAPI,
	template: templateAPI,
	user: userAPI,
	session: sessionAPI,
	settings: settingsAPI,
	templateRegistry: templateRegistryAPI,
	oidc: oidcAPI,
	encryption: encryptionAPI,
	deployment: deploymentAPI,
	validation: validationAPI,
	appConfig: appConfigAPI
};
