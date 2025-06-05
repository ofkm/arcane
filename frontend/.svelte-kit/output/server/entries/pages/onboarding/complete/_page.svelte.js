import "clsx";
import { B as Button } from "../../../../chunks/button.js";
import { C as Circle_check_big } from "../../../../chunks/circle-check-big.js";
function _page($$payload) {
  $$payload.out += `<div class="max-w-2xl mx-auto text-center"><div class="mb-6 flex justify-center"><div class="rounded-full bg-green-100 p-4 dark:bg-green-900/20">`;
  Circle_check_big($$payload, {
    class: "text-green-600 dark:text-green-400 size-12"
  });
  $$payload.out += `<!----></div></div> <h1 class="text-3xl font-bold mb-6">Setup Complete!</h1> <div class="prose dark:prose-invert max-w-xl mx-auto mb-8"><p>Congratulations! You've successfully completed the initial setup for Arcane.</p> <p>You can now start using the application to manage your Docker containers and compose stacks.</p></div> `;
  Button($$payload, {
    href: "/",
    size: "lg",
    children: ($$payload2) => {
      $$payload2.out += `<!---->Go to Dashboard`;
    },
    $$slots: { default: true }
  });
  $$payload.out += `<!----></div>`;
}
export {
  _page as default
};
