import { p as push, c as copy_payload, d as assign_payload, a as pop, h as head, e as bind_props, t as escape_html, j as ensure_array_like, b as spread_props } from './index3-DI1Ivwzg.js';
import { C as Card } from './card-BHGzpLb_.js';
import { a as Card_header, C as Card_content, b as Card_title } from './card-title-Cbe9TU5i.js';
import { C as Card_description } from './card-description-D9_vEbkT.js';
import { B as Button } from './button-CUTwDrbo.js';
import { a as toast } from './Toaster.svelte_svelte_type_style_lang-B5vkOu6x.js';
import { U as Universal_table, T as Table_cell, E as Ellipsis } from './universal-table-CB6RbjtA.js';
import { R as Root, D as Dialog_content, a as Dialog_header, g as Dialog_title, b as Dialog_footer } from './index7-tn3QlYte.js';
import { I as Input } from './input-Bs5Bjqyo.js';
import { L as Label } from './label-DF0BU6VF.js';
import { R as Root$1, S as Select_trigger, a as Select_content, G as Group, b as Select_item } from './index11-Bwdsa0vi.js';
import { D as Dialog_description } from './dialog-description-R10GNeQ8.js';
import { L as Loader_circle } from './loader-circle-BJifzSLw.js';
import { S as Save } from './save-C3QNHVRC.js';
import { I as Icon } from './Icon-DbVCNmsR.js';
import { R as Root$2, T as Trigger, D as Dropdown_menu_content, G as Group$1 } from './index10-CY-2AYBF.js';
import { h as handleApiResultWithCallbacks } from './api.util-Ci3Q0GvL.js';
import { t as tryCatch } from './try-catch-KtE72Cop.js';
import { U as UserAPIService } from './27-C-R7t7Nc.js';
import { i as invalidateAll } from './client-Cc1XkR80.js';
import { o as openConfirmDialog } from './index8-BdgpbvMa.js';
import { S as Status_badge } from './status-badge-55QtloxC.js';
import { D as Dropdown_menu_item } from './dropdown-menu-item-avPBUpKU.js';
import { P as Pencil } from './pencil-BtmIOgHr.js';
import './utils-CqJ6pTf-.js';
import './false-CRHihH2U.js';
import './index-server-_G0R5Qhl.js';
import '@tanstack/table-core';
import './create-id-DRrkdd12.js';
import './noop-BrWcRgZY.js';
import './get-directional-keys-4fLrGlIs.js';
import './use-id-BSIc2y_F.js';
import './chevron-right-EG31JOyw.js';
import './checkbox-CMEX2hM2.js';
import './hidden-input-BsZkZal-.js';
import './check-CkcwyHfy.js';
import './chevron-down-DOg7W4Qb.js';
import './scroll-lock-C_EWKkAl.js';
import './events-CVA3EDdV.js';
import './x-BTRU5OLu.js';
import './popper-layer-force-mount-A94KrKTq.js';
import './is-using-keyboard.svelte-DKF6IOQr.js';
import './use-roving-focus.svelte-Cnaf6bhO.js';
import './use-grace-area.svelte-DYFPGt31.js';
import './errors.util-g315AnHn.js';
import './api-service-DMPLrOP8.js';
import 'axios';
import './user-service-DRkBleBJ.js';
import 'node:fs/promises';
import 'node:path';
import 'bcryptjs';
import './encryption-service-C1I869gF.js';
import 'node:crypto';
import 'node:util';
import './schema-CDkq0ub_.js';
import 'drizzle-orm/sqlite-core';
import 'drizzle-orm';
import './index4-SoK3Vczo.js';
import './exports-Cv9LZeD1.js';
import './index2-Da1jJcEh.js';
import './menu-item-iytmaAC5.js';

function User_check($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    ["path", { "d": "m16 11 2 2 4-4" }],
    [
      "path",
      {
        "d": "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
      }
    ],
    ["circle", { "cx": "9", "cy": "7", "r": "4" }]
  ];
  Icon($$payload, spread_props([
    { name: "user-check" },
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
function User_plus($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "path",
      {
        "d": "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
      }
    ],
    ["circle", { "cx": "9", "cy": "7", "r": "4" }],
    [
      "line",
      {
        "x1": "19",
        "x2": "19",
        "y1": "8",
        "y2": "14"
      }
    ],
    [
      "line",
      {
        "x1": "22",
        "x2": "16",
        "y1": "11",
        "y2": "11"
      }
    ]
  ];
  Icon($$payload, spread_props([
    { name: "user-plus" },
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
function User_x($$payload, $$props) {
  push();
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "path",
      {
        "d": "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
      }
    ],
    ["circle", { "cx": "9", "cy": "7", "r": "4" }],
    [
      "line",
      {
        "x1": "17",
        "x2": "22",
        "y1": "8",
        "y2": "13"
      }
    ],
    [
      "line",
      {
        "x1": "22",
        "x2": "17",
        "y1": "8",
        "y2": "13"
      }
    ]
  ];
  Icon($$payload, spread_props([
    { name: "user-x" },
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
function User_form_dialog($$payload, $$props) {
  push();
  let {
    open = false,
    userToEdit = null,
    roles = [],
    isLoading = false,
    onSubmit = () => {
    },
    allowUsernameEdit = false
  } = $$props;
  let username = "";
  let password = "";
  let displayName = "";
  let email = "";
  let selectedRole = "user";
  let isEditMode = !!userToEdit;
  let dialogTitle = isEditMode ? "Edit User" : "Create User";
  let submitButtonText = isEditMode ? "Save Changes" : "Create User";
  let SubmitIcon = isEditMode ? Save : User_plus;
  let canEditUsername = !isEditMode || allowUsernameEdit;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out += `<!---->`;
    Root($$payload2, {
      get open() {
        return open;
      },
      set open($$value) {
        open = $$value;
        $$settled = false;
      },
      children: ($$payload3) => {
        $$payload3.out += `<!---->`;
        Dialog_content($$payload3, {
          class: "sm:max-w-[425px]",
          children: ($$payload4) => {
            $$payload4.out += `<!---->`;
            Dialog_header($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->`;
                Dialog_title($$payload5, {
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->${escape_html(dialogTitle)}`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----> `;
                if (!isEditMode) {
                  $$payload5.out += "<!--[-->";
                  $$payload5.out += `<!---->`;
                  Dialog_description($$payload5, {
                    children: ($$payload6) => {
                      $$payload6.out += `<!---->Enter the details for the new user.`;
                    },
                    $$slots: { default: true }
                  });
                  $$payload5.out += `<!---->`;
                } else {
                  $$payload5.out += "<!--[!-->";
                }
                $$payload5.out += `<!--]-->`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <form class="grid gap-4 py-4" autocomplete="off"><div class="grid grid-cols-4 items-center gap-4">`;
            Label($$payload4, {
              for: "username",
              class: "text-right",
              children: ($$payload5) => {
                $$payload5.out += `<!---->Username`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> `;
            Input($$payload4, {
              autocomplete: "off",
              id: "username",
              required: true,
              class: "col-span-3",
              disabled: !canEditUsername,
              get value() {
                return username;
              },
              set value($$value) {
                username = $$value;
                $$settled = false;
              }
            });
            $$payload4.out += `<!----></div> <div class="grid grid-cols-4 items-center gap-4">`;
            Label($$payload4, {
              for: "password",
              class: "text-right",
              children: ($$payload5) => {
                $$payload5.out += `<!---->Password`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> `;
            Input($$payload4, {
              autocomplete: "off",
              id: "password",
              type: "password",
              required: !isEditMode,
              placeholder: isEditMode ? "Leave blank to keep current" : "Required",
              class: "col-span-3",
              get value() {
                return password;
              },
              set value($$value) {
                password = $$value;
                $$settled = false;
              }
            });
            $$payload4.out += `<!----></div> <div class="grid grid-cols-4 items-center gap-4">`;
            Label($$payload4, {
              for: "displayName",
              class: "text-right",
              children: ($$payload5) => {
                $$payload5.out += `<!---->Display Name`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> `;
            Input($$payload4, {
              autocomplete: "off",
              id: "displayName",
              class: "col-span-3",
              get value() {
                return displayName;
              },
              set value($$value) {
                displayName = $$value;
                $$settled = false;
              }
            });
            $$payload4.out += `<!----></div> <div class="grid grid-cols-4 items-center gap-4">`;
            Label($$payload4, {
              for: "email",
              class: "text-right",
              children: ($$payload5) => {
                $$payload5.out += `<!---->Email`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> `;
            Input($$payload4, {
              autocomplete: "off",
              id: "email",
              type: "email",
              class: "col-span-3",
              get value() {
                return email;
              },
              set value($$value) {
                email = $$value;
                $$settled = false;
              }
            });
            $$payload4.out += `<!----></div> <div class="grid grid-cols-4 items-center gap-4">`;
            Label($$payload4, {
              for: "role",
              class: "text-right",
              children: ($$payload5) => {
                $$payload5.out += `<!---->Role`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <!---->`;
            Root$1($$payload4, {
              name: "role",
              type: "single",
              disabled: true,
              get value() {
                return selectedRole;
              },
              set value($$value) {
                selectedRole = $$value;
                $$settled = false;
              },
              children: ($$payload5) => {
                $$payload5.out += `<!---->`;
                Select_trigger($$payload5, {
                  class: "col-span-3",
                  children: ($$payload6) => {
                    $$payload6.out += `<span>${escape_html(roles.find((r) => r.id === selectedRole)?.name || "Select a role")}</span>`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----> <!---->`;
                Select_content($$payload5, {
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->`;
                    Group($$payload6, {
                      children: ($$payload7) => {
                        const each_array = ensure_array_like(roles);
                        $$payload7.out += `<!--[-->`;
                        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                          let role = each_array[$$index];
                          $$payload7.out += `<!---->`;
                          Select_item($$payload7, {
                            value: role.id,
                            children: ($$payload8) => {
                              $$payload8.out += `<!---->${escape_html(role.name)}`;
                            },
                            $$slots: { default: true }
                          });
                          $$payload7.out += `<!---->`;
                        }
                        $$payload7.out += `<!--]-->`;
                      },
                      $$slots: { default: true }
                    });
                    $$payload6.out += `<!---->`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!---->`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----></div> `;
            {
              $$payload4.out += "<!--[!-->";
            }
            $$payload4.out += `<!--]--> <!---->`;
            Dialog_footer($$payload4, {
              children: ($$payload5) => {
                Button($$payload5, {
                  type: "button",
                  class: "arcane-button-cancel",
                  variant: "outline",
                  onclick: () => open = false,
                  disabled: isLoading,
                  children: ($$payload6) => {
                    $$payload6.out += `<!---->Cancel`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!----> `;
                Button($$payload5, {
                  type: "submit",
                  class: "arcane-button-create",
                  disabled: isLoading,
                  children: ($$payload6) => {
                    if (isLoading) {
                      $$payload6.out += "<!--[-->";
                      Loader_circle($$payload6, { class: "animate-spin size-4" });
                      $$payload6.out += `<!----> Creating...`;
                    } else {
                      $$payload6.out += "<!--[!-->";
                      $$payload6.out += `<!---->`;
                      SubmitIcon($$payload6, { class: "size-4" });
                      $$payload6.out += `<!----> ${escape_html(submitButtonText)}`;
                    }
                    $$payload6.out += `<!--]-->`;
                  },
                  $$slots: { default: true }
                });
                $$payload5.out += `<!---->`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----></form>`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!---->`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!---->`;
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { open, userToEdit, isLoading, onSubmit });
  pop();
}
function _page($$payload, $$props) {
  push();
  let { data } = $$props;
  const userApi = new UserAPIService();
  let userPageStates = {
    users: data.users,
    isUserDialogOpen: false,
    userToEdit: null
  };
  let isLoading = { saving: false };
  const roles = [
    { id: "admin", name: "Administrator" },
    { id: "user", name: "Standard User" },
    { id: "viewer", name: "Viewer (read-only)" }
  ];
  function openCreateUserDialog() {
    userPageStates.userToEdit = null;
    userPageStates.isUserDialogOpen = true;
  }
  function openEditUserDialog(user) {
    userPageStates.userToEdit = user;
    userPageStates.isUserDialogOpen = true;
  }
  async function handleDialogSubmit({ user: userData, isEditMode, userId }) {
    isLoading.saving = true;
    handleApiResultWithCallbacks({
      result: await tryCatch(isEditMode ? userApi.update(userId || "", userData) : userApi.create(userData)),
      message: isEditMode ? "Error Updating User" : "Error Creating User",
      setLoadingState: (value) => isLoading.saving = value,
      onSuccess: async () => {
        userPageStates.isUserDialogOpen = false;
        toast.success(isEditMode ? "User Updated Successfully" : "User Created Successfully");
        await invalidateAll();
        isLoading.saving = false;
      }
    });
  }
  async function handleRemoveUser(userId) {
    openConfirmDialog({
      title: "Delete User",
      message: "Are you sure you want to delete this user? This action cannot be undone.",
      confirm: {
        label: "Delete",
        destructive: true,
        action: async () => {
          handleApiResultWithCallbacks({
            result: await tryCatch(userApi.delete(userId)),
            message: "Failed to Delete User",
            setLoadingState: (value) => isLoading.saving = value,
            onSuccess: async () => {
              toast.success("User Deleted Successfully.");
              await invalidateAll();
            }
          });
        }
      }
    });
  }
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    head($$payload2, ($$payload3) => {
      $$payload3.title = `<title>User Management - Arcane</title>`;
    });
    User_form_dialog($$payload2, {
      roles,
      onSubmit: handleDialogSubmit,
      isLoading: isLoading.saving,
      allowUsernameEdit: true,
      get open() {
        return userPageStates.isUserDialogOpen;
      },
      set open($$value) {
        userPageStates.isUserDialogOpen = $$value;
        $$settled = false;
      },
      get userToEdit() {
        return userPageStates.userToEdit;
      },
      set userToEdit($$value) {
        userPageStates.userToEdit = $$value;
        $$settled = false;
      }
    });
    $$payload2.out += `<!----> <div class="space-y-6"><div><h1 class="text-3xl font-bold tracking-tight">User Management</h1> <p class="text-sm text-muted-foreground mt-1">Manage user accounts and permissions</p></div> <div class="grid grid-cols-1 gap-6 h-full"><!---->`;
    Card($$payload2, {
      class: "border shadow-sm flex flex-col",
      children: ($$payload3) => {
        $$payload3.out += `<!---->`;
        Card_header($$payload3, {
          class: "pb-3 flex flex-row items-center justify-between space-y-0",
          children: ($$payload4) => {
            $$payload4.out += `<div class="flex items-center gap-2"><div class="bg-blue-500/10 p-2 rounded-full">`;
            User_check($$payload4, { class: "text-blue-500 size-5" });
            $$payload4.out += `<!----></div> <div><!---->`;
            Card_title($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->User Accounts`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----> <!---->`;
            Card_description($$payload4, {
              children: ($$payload5) => {
                $$payload5.out += `<!---->Manage local user accounts`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!----></div></div> `;
            Button($$payload4, {
              class: "arcane-button-save",
              onclick: openCreateUserDialog,
              children: ($$payload5) => {
                User_plus($$payload5, { class: "size-4" });
                $$payload5.out += `<!----> Create User`;
              },
              $$slots: { default: true }
            });
            $$payload4.out += `<!---->`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!----> <!---->`;
        Card_content($$payload3, {
          class: "flex-1 flex flex-col",
          children: ($$payload4) => {
            if (userPageStates.users.length > 0) {
              $$payload4.out += "<!--[-->";
              $$payload4.out += `<div class="flex-1 flex flex-col h-full">`;
              {
                let rows = function($$payload5, { item }) {
                  $$payload5.out += `<!---->`;
                  Table_cell($$payload5, {
                    children: ($$payload6) => {
                      $$payload6.out += `<!---->${escape_html(item.displayName)}`;
                    },
                    $$slots: { default: true }
                  });
                  $$payload5.out += `<!----> <!---->`;
                  Table_cell($$payload5, {
                    children: ($$payload6) => {
                      $$payload6.out += `<div class="flex items-center gap-1.5">${escape_html(item.email)}</div>`;
                    },
                    $$slots: { default: true }
                  });
                  $$payload5.out += `<!----> <!---->`;
                  Table_cell($$payload5, {
                    children: ($$payload6) => {
                      const each_array = ensure_array_like(item.roles);
                      $$payload6.out += `<div class="flex flex-wrap"><!--[-->`;
                      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                        let role = each_array[$$index];
                        const isAdmin = role === "admin";
                        Status_badge($$payload6, {
                          text: isAdmin ? "Admin" : "User",
                          variant: isAdmin ? "amber" : "blue"
                        });
                      }
                      $$payload6.out += `<!--]--></div>`;
                    },
                    $$slots: { default: true }
                  });
                  $$payload5.out += `<!----> <!---->`;
                  Table_cell($$payload5, {
                    children: ($$payload6) => {
                      Status_badge($$payload6, {
                        text: item.oidcSubjectId ? "OIDC" : "Local",
                        variant: item.oidcSubjectId ? "blue" : "purple"
                      });
                    },
                    $$slots: { default: true }
                  });
                  $$payload5.out += `<!----> <!---->`;
                  Table_cell($$payload5, {
                    children: ($$payload6) => {
                      $$payload6.out += `<!---->`;
                      Root$2($$payload6, {
                        children: ($$payload7) => {
                          $$payload7.out += `<!---->`;
                          Trigger($$payload7, {
                            children: ($$payload8) => {
                              Button($$payload8, {
                                variant: "ghost",
                                size: "icon",
                                class: "size-8",
                                children: ($$payload9) => {
                                  Ellipsis($$payload9, { class: "size-4" });
                                  $$payload9.out += `<!----> <span class="sr-only">Open menu</span>`;
                                },
                                $$slots: { default: true }
                              });
                            },
                            $$slots: { default: true }
                          });
                          $$payload7.out += `<!----> <!---->`;
                          Dropdown_menu_content($$payload7, {
                            align: "end",
                            children: ($$payload8) => {
                              $$payload8.out += `<!---->`;
                              Group$1($$payload8, {
                                children: ($$payload9) => {
                                  if (!item.oidcSubjectId) {
                                    $$payload9.out += "<!--[-->";
                                    $$payload9.out += `<!---->`;
                                    Dropdown_menu_item($$payload9, {
                                      onclick: () => openEditUserDialog(item),
                                      children: ($$payload10) => {
                                        Pencil($$payload10, { class: "size-4" });
                                        $$payload10.out += `<!----> Edit`;
                                      },
                                      $$slots: { default: true }
                                    });
                                    $$payload9.out += `<!---->`;
                                  } else {
                                    $$payload9.out += "<!--[!-->";
                                  }
                                  $$payload9.out += `<!--]--> <!---->`;
                                  Dropdown_menu_item($$payload9, {
                                    class: "text-red-500 focus:text-red-700!",
                                    onclick: () => handleRemoveUser(item.id),
                                    children: ($$payload10) => {
                                      User_x($$payload10, { class: "size-4" });
                                      $$payload10.out += `<!----> Remove User`;
                                    },
                                    $$slots: { default: true }
                                  });
                                  $$payload9.out += `<!---->`;
                                },
                                $$slots: { default: true }
                              });
                              $$payload8.out += `<!---->`;
                            },
                            $$slots: { default: true }
                          });
                          $$payload7.out += `<!---->`;
                        },
                        $$slots: { default: true }
                      });
                      $$payload6.out += `<!---->`;
                    },
                    $$slots: { default: true }
                  });
                  $$payload5.out += `<!---->`;
                };
                Universal_table($$payload4, {
                  data: userPageStates.users,
                  columns: [
                    { accessorKey: "user", header: "User" },
                    { accessorKey: "email", header: "Email" },
                    { accessorKey: "roles", header: "Roles" },
                    {
                      accessorKey: "source",
                      header: "Source",
                      enableSorting: false
                    },
                    { accessorKey: "actions", header: " " }
                  ],
                  features: {
                    sorting: true,
                    filtering: true,
                    selection: false
                  },
                  pagination: {
                    pageSize: 10,
                    pageSizeOptions: [5, 10, 15, 20]
                  },
                  display: {
                    filterPlaceholder: "Filter users...",
                    noResultsMessage: "No users found"
                  },
                  sort: { defaultSort: { id: "user", desc: false } },
                  rows,
                  $$slots: { rows: true }
                });
              }
              $$payload4.out += `<!----></div>`;
            } else {
              $$payload4.out += "<!--[!-->";
              $$payload4.out += `<div class="text-center py-8 text-muted-foreground italic">No local users found</div>`;
            }
            $$payload4.out += `<!--]-->`;
          },
          $$slots: { default: true }
        });
        $$payload3.out += `<!---->`;
      },
      $$slots: { default: true }
    });
    $$payload2.out += `<!----></div></div>`;
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  pop();
}

export { _page as default };
//# sourceMappingURL=_page.svelte-Bh2xcwln.js.map
