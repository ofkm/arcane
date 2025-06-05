import { w as writable } from './index2-Da1jJcEh.js';
import './button-CUTwDrbo.js';

const confirmDialogStore = writable({
  open: false,
  title: "",
  message: "",
  confirm: {
    label: "Confirm",
    destructive: false,
    action: () => {
    }
  }
});
function openConfirmDialog({
  title,
  message,
  confirm,
  checkboxes
}) {
  confirmDialogStore.update((val) => ({
    open: true,
    title,
    message,
    confirm: {
      ...val.confirm,
      ...confirm
    },
    checkboxes
  }));
}

export { confirmDialogStore as c, openConfirmDialog as o };
//# sourceMappingURL=index8-BdgpbvMa.js.map
