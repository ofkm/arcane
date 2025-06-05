import { j as spread_props, a as pop, p as push } from "./index3.js";
import { I as Icon } from "./Icon.js";
function Layout_template($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "rect",
      {
        "width": "18",
        "height": "7",
        "x": "3",
        "y": "3",
        "rx": "1"
      }
    ],
    [
      "rect",
      {
        "width": "9",
        "height": "7",
        "x": "3",
        "y": "14",
        "rx": "1"
      }
    ],
    [
      "rect",
      {
        "width": "5",
        "height": "7",
        "x": "16",
        "y": "14",
        "rx": "1"
      }
    ]
  ];
  Icon($$payload, spread_props([
    { name: "layout-template" },
    props,
    {
      iconNode,
      children: ($$payload2) => {
        props.children?.($$payload2);
        $$payload2.out += `<!---->`;
      },
      $$slots: { default: true }
    }
  ]));
  pop();
}
export {
  Layout_template as L
};
