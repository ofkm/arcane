import { p as push, k as escape_html, a as pop } from "./index3.js";
import "clsx";
import { B as Button, c as cn } from "./button.js";
import { C as Card } from "./card.js";
import { a as Card_header, b as Card_title, C as Card_content } from "./card-title.js";
import { C as Card_description } from "./card-description.js";
import { C as Chevron_down } from "./chevron-down.js";
function Dropdown_card($$payload, $$props) {
  push();
  let {
    id,
    title,
    description,
    defaultExpanded = false,
    icon,
    children
  } = $$props;
  let expanded = defaultExpanded;
  function saveExpandedState() {
    const state = JSON.parse(localStorage.getItem("collapsible-cards-expanded") || "{}");
    state[id] = expanded;
    localStorage.setItem("collapsible-cards-expanded", JSON.stringify(state));
  }
  function toggleExpanded() {
    expanded = !expanded;
    saveExpandedState();
  }
  $$payload.out += `<!---->`;
  Card($$payload, {
    children: ($$payload2) => {
      $$payload2.out += `<!---->`;
      Card_header($$payload2, {
        class: "cursor-pointer p-5",
        onclick: toggleExpanded,
        children: ($$payload3) => {
          $$payload3.out += `<div class="flex items-center justify-between"><div><!---->`;
          Card_title($$payload3, {
            class: "flex items-center gap-2 text-xl font-semibold mb-2",
            children: ($$payload4) => {
              if (icon) {
                $$payload4.out += "<!--[-->";
                const Icon = icon;
                $$payload4.out += `<!---->`;
                Icon($$payload4, { class: "text-primary/80 size-5" });
                $$payload4.out += `<!---->`;
              } else {
                $$payload4.out += "<!--[!-->";
              }
              $$payload4.out += `<!--]--> ${escape_html(title)}`;
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!----> `;
          if (description) {
            $$payload3.out += "<!--[-->";
            $$payload3.out += `<!---->`;
            Card_description($$payload3, {
              class: "mt-1",
              children: ($$payload4) => {
                $$payload4.out += `<!---->${escape_html(description)}`;
              },
              $$slots: { default: true }
            });
            $$payload3.out += `<!---->`;
          } else {
            $$payload3.out += "<!--[!-->";
          }
          $$payload3.out += `<!--]--></div> `;
          Button($$payload3, {
            class: "ml-10 h-8 p-3",
            variant: "ghost",
            "aria-label": "Expand Card",
            children: ($$payload4) => {
              Chevron_down($$payload4, {
                class: cn("size-5 transition-transform duration-200", expanded && "rotate-180 transform")
              });
            },
            $$slots: { default: true }
          });
          $$payload3.out += `<!----></div>`;
        },
        $$slots: { default: true }
      });
      $$payload2.out += `<!----> `;
      if (expanded) {
        $$payload2.out += "<!--[-->";
        $$payload2.out += `<div><!---->`;
        Card_content($$payload2, {
          class: "bg-muted/20 pt-5",
          children: ($$payload3) => {
            children($$payload3);
            $$payload3.out += `<!---->`;
          },
          $$slots: { default: true }
        });
        $$payload2.out += `<!----></div>`;
      } else {
        $$payload2.out += "<!--[!-->";
      }
      $$payload2.out += `<!--]-->`;
    },
    $$slots: { default: true }
  });
  $$payload.out += `<!---->`;
  pop();
}
export {
  Dropdown_card as D
};
