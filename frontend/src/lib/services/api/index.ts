import ContainerAPIService from './container-api-service';
import ImageAPIService from './image-api-service';
import ImageMaturityAPIService from './image-maturity-api-service';
import VolumeAPIService from './volume-api-service';
import StackAPIService from './stack-api-service';
import SystemAPIService from './system-api-service';
import TemplateAPIService from './template-api-service';
import UserAPIService from './user-api-service';
import SessionAPIService from './session-api-service';
import SettingsAPIService from './settings-api-service';
import TemplateRegistryAPIService from './template-registry-api-service';
import OidcAPIService from './oidc-api-service';
import EncryptionAPIService from './encryption-api-service';
import DeploymentAPIService from './deployment-api-service';
import ValidationAPIService from './validation-api-service';
import AppConfigAPIService from './appconfig-api-service';
import AgentAPIService from './agent-api-service';
import AgentStackAPIService from './agent-stack-api-service';
import AutoUpdateAPIService from './autoupdate-api-service';
import ConverterAPIService from './converter-api-service';
import ContainerRegistryAPIService from './container-registry-api-service';
import { EnvironmentAPIService } from './environment-api-service';
import EnvironmentManagementAPIService from './environment-management-api-service';

export const containerAPI = new ContainerAPIService();
export const imageAPI = new ImageAPIService();
export const imageMaturityAPI = new ImageMaturityAPIService();
export const volumeAPI = new VolumeAPIService();
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
export const agentAPI = new AgentAPIService();
export const agentStackAPI = new AgentStackAPIService();
export const converterAPI = new ConverterAPIService();
export const containerRegistryAPI = new ContainerRegistryAPIService();
export const autoUpdateAPI = new AutoUpdateAPIService();
export const environmentAPI = new EnvironmentAPIService();
export const environmentManagementAPI = new EnvironmentManagementAPIService();

interface APIServices {
	container: ContainerAPIService;
	image: ImageAPIService;
	imageMaturity: ImageMaturityAPIService;
	volume: VolumeAPIService;
	stack: StackAPIService;
	system: SystemAPIService;
	template: TemplateAPIService;
	user: UserAPIService;
	session: SessionAPIService;
	settings: SettingsAPIService;
	templateRegistry: TemplateRegistryAPIService;
	oidc: OidcAPIService;
	encryption: EncryptionAPIService;
	deployment: DeploymentAPIService;
	validation: ValidationAPIService;
	appConfig: AppConfigAPIService;
	agent: AgentAPIService;
	converter: ConverterAPIService;
	containerRegistry: ContainerRegistryAPIService;
	autoUpdate: AutoUpdateAPIService;
	environment: EnvironmentAPIService;
	environmentManagement: EnvironmentManagementAPIService;
}

const apiServices: APIServices = {
	container: containerAPI,
	image: imageAPI,
	imageMaturity: imageMaturityAPI,
	volume: volumeAPI,
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
	appConfig: appConfigAPI,
	agent: agentAPI,
	converter: converterAPI,
	containerRegistry: containerRegistryAPI,
	autoUpdate: autoUpdateAPI,
	environment: environmentAPI,
	environmentManagement: environmentManagementAPI
};

export default apiServices;
