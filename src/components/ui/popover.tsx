import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type PopoverProps = {
  children: ReactNode;
  className?: string;
  onClose: () => void;
  open: boolean;
  triggerRef: React.RefObject<HTMLElement | null>;
};

function Popover({ children, className, onClose, open, triggerRef }: PopoverProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    },
    [onClose, triggerRef],
  );

  const handleEscape = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  const recalc = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPosition({
      left: rect.left + window.scrollX,
      top: rect.bottom + window.scrollY + 4,
    });
  }, [triggerRef]);

  useEffect(() => {
    if (!open) return;

    recalc();

    const handleScroll = () => {
      if (open) recalc();
    };
    const handleResize = () => {
      if (open) recalc();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [open, handleClickOutside, handleEscape, recalc]);

  if (!open) return null;

  return createPortal(
    <div
      ref={contentRef}
      className={cn(
        "fixed z-50 border border-border/80 bg-background shadow-[0_14px_38px_rgba(15,23,42,0.15)] backdrop-blur-xl",
        className,
      )}
      style={{ left: position.left, top: position.top }}
    >
      {children}
    </div>,
    document.body,
  );
}

export { Popover };
