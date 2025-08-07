export interface DialogAction {
  label?: string;
  handler: (...any) => void;
  class?: string;
}

export interface DialogActions {
  [key: string]: DialogAction;
}

export interface DialogEvents {
  onShow?: (dialog: HTMLElement) => void;
  onClose?: (dialog: HTMLElement) => void;
}
