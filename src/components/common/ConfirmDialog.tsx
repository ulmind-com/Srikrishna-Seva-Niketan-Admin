import { type ReactNode, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = true,
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-3">
            <div
              className={`grid h-10 w-10 place-items-center rounded-xl ${
                destructive
                  ? "bg-destructive/10 text-destructive"
                  : "bg-secondary text-accent"
              } [&_svg]:size-5`}
            >
              <AlertTriangle />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Convenience hook to drive a confirm dialog imperatively. */
export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean;
    onConfirm: () => void;
    props?: Partial<ConfirmDialogProps>;
  }>({ open: false, onConfirm: () => {} });

  return {
    dialogProps: {
      open: state.open,
      onOpenChange: (open: boolean) => setState((s) => ({ ...s, open })),
      onConfirm: () => {
        state.onConfirm();
      },
      ...state.props,
    } as ConfirmDialogProps,
    confirm: (onConfirm: () => void, props?: Partial<ConfirmDialogProps>) =>
      setState({ open: true, onConfirm, props }),
    close: () => setState((s) => ({ ...s, open: false })),
  };
}
