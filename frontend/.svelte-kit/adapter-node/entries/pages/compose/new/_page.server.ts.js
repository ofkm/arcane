import { T as TemplateService } from "../../../../chunks/template-service.js";
import { a as defaultComposeTemplate } from "../../../../chunks/constants.js";
import { l as listAgents } from "../../../../chunks/agent-manager.js";
const load = async () => {
  try {
    const templateService = new TemplateService();
    const [allTemplates, envTemplate] = await Promise.all([templateService.loadAllTemplates(), TemplateService.getEnvTemplate()]);
    const agents = await listAgents();
    const now = /* @__PURE__ */ new Date();
    const timeout = 5 * 60 * 1e3;
    const agentsWithStatus = agents.map((agent) => {
      const lastSeen = new Date(agent.lastSeen);
      const timeSinceLastSeen = now.getTime() - lastSeen.getTime();
      return {
        ...agent,
        status: timeSinceLastSeen > timeout ? "offline" : agent.status
      };
    });
    return {
      composeTemplates: allTemplates,
      envTemplate,
      defaultTemplate: defaultComposeTemplate,
      agents: agentsWithStatus
    };
  } catch (error) {
    console.error("Error loading templates:", error);
    return {
      composeTemplates: [],
      envTemplate: defaultComposeTemplate,
      defaultTemplate: defaultComposeTemplate,
      agents: []
    };
  }
};
export {
  load
};
