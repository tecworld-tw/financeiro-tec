import { useEffect, useRef, ReactNode } from "react";
import { X } from "lucide-react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 animate-fade-in backdrop-blur-sm" />

      {/* Sheet / Dialog */}
      <div
        ref={contentRef}
        className="animate-slide-up md:animate-zoom-in relative w-full max-w-lg rounded-t-[2.5rem] md:rounded-[2.5rem] bg-card border border-border/60 shadow-2xl safe-bottom overflow-hidden"
        style={{ maxHeight: "92vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (Mobile only) */}
        <div className="flex md:hidden justify-center pt-3 pb-1">
          <div className="h-1.5 w-12 rounded-full bg-muted-foreground/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 md:py-6 border-b border-border/10">
          <h2 className="font-display text-xl md:text-2xl font-black uppercase tracking-tighter text-primary">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="rounded-2xl p-2.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all active:scale-95 bg-muted/20 md:bg-transparent"
          >
            <X className="h-5 w-5 md:h-6 md:w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-6 py-6 no-scrollbar" style={{ maxHeight: "calc(92vh - 100px)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}