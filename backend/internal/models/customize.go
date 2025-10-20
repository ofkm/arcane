package models

// CustomizeItem represents a customization configuration item
// This struct uses reflection tags to define customization categories and metadata
type CustomizeItem struct {
	DefaultProjectTemplate   CustomizeVariable `key:"defaultProjectTemplate" meta:"label=Default Project Template;type=select;keywords=template,default,project,scaffold,boilerplate,starter;category=defaults;description=Set the default template for new projects"`
	DefaultContainerSettings CustomizeVariable `key:"defaultContainerSettings" meta:"label=Default Container Settings;type=object;keywords=container,default,settings,docker,configuration,runtime;category=defaults;description=Configure default container runtime settings"`
	DefaultNetworkMode       CustomizeVariable `key:"defaultNetworkMode" meta:"label=Default Network Mode;type=select;keywords=network,default,mode,bridge,host,none,container;category=defaults;description=Set the default network mode for containers"`

	CustomTemplates    CustomizeVariable `key:"customTemplates" meta:"label=Custom Templates;type=array;keywords=templates,custom,project,compose,docker-compose,yaml,stack;category=templates;description=Add and manage custom project templates"`
	TemplateCategories CustomizeVariable `key:"templateCategories" meta:"label=Template Categories;type=array;keywords=categories,organization,grouping,tags,classification;category=templates;description=Organize templates into categories"`
	TemplateValidation CustomizeVariable `key:"templateValidation" meta:"label=Template Validation;type=boolean;keywords=validation,check,verify,lint,syntax,schema;category=templates;description=Enable validation for template files"`

	ContainerRegistries CustomizeVariable `key:"containerRegistries" meta:"label=Container Registries;type=array;keywords=registry,docker,images,hub,private,authentication,credentials;category=registries;description=Manage container registry connections"`
	RegistryCredentials CustomizeVariable `key:"registryCredentials" meta:"label=Registry Credentials;type=secure;keywords=credentials,auth,username,password,token,login,security;category=registries;description=Configure authentication for container registries"`
	RegistryMirrors     CustomizeVariable `key:"registryMirrors" meta:"label=Registry Mirrors;type=array;keywords=mirrors,proxy,cache,performance,cdn,regional;category=registries;description=Configure registry mirrors and proxies"`

	GlobalVariables   CustomizeVariable `key:"globalVariables" meta:"label=Global Variables;type=object;keywords=variables,environment,env,global,config,settings,parameters;category=variables;description=Define reusable variables for all projects"`
	SecretVariables   CustomizeVariable `key:"secretVariables" meta:"label=Secret Variables;type=secure;keywords=secrets,sensitive,secure,encrypted,password,api,key;category=variables;description=Manage sensitive and encrypted variables"`
	VariableTemplates CustomizeVariable `key:"variableTemplates" meta:"label=Variable Templates;type=array;keywords=templates,reusable,preset,configuration,standard,common;category=variables;description=Create reusable variable configurations"`
}

type CustomizeVariable struct {
	Value string
}
