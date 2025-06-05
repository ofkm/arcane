import { p as push, u as copy_payload, v as assign_payload, t as bind_props, a as pop } from "./index3.js";
import { linter } from "@codemirror/lint";
import yaml from "js-yaml";
import "thememirror";
function Yaml_editor($$payload, $$props) {
  push();
  let {
    value = "",
    placeholder = "Enter YAML content",
    readOnly = false
  } = $$props;
  function yamlLinter(view) {
    const diagnostics = [];
    try {
      yaml.load(view.state.doc.toString());
    } catch (e) {
      const err = e;
      const start = err.mark?.position || 0;
      const end = err.mark?.position !== void 0 ? Math.max(start + 1, err.mark.position + 1) : start + 1;
      diagnostics.push({
        from: start,
        to: end,
        severity: "error",
        message: err.message
      });
    }
    return diagnostics;
  }
  linter(yamlLinter);
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    {
      $$payload2.out += "<!--[!-->";
    }
    $$payload2.out += `<!--]-->`;
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { value });
  pop();
}
function Env_editor($$payload, $$props) {
  push();
  let {
    value = "",
    placeholder = "# Add environment variables here",
    readOnly = false
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    {
      $$payload2.out += "<!--[!-->";
    }
    $$payload2.out += `<!--]-->`;
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { value });
  pop();
}
export {
  Env_editor as E,
  Yaml_editor as Y
};
