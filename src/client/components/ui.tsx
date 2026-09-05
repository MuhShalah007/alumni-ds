import { type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from "react";

// ===== DocuForge Design System Components =====

// Button — Primary #2563EB, Secondary white+border, Ghost transparent, Destructive #DC2626
type ButtonVariant = "primary" | "secondary" | "outline" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-[#2563EB] text-white hover:bg-[#1D4ED8] focus:ring-[#2563EB]",
  secondary: "bg-white text-[#2563EB] border border-[#2563EB] hover:bg-[#EFF6FF] focus:ring-[#2563EB]",
  outline: "border border-[#E4E4E7] text-[#52525B] hover:bg-[#F4F4F5] focus:ring-[#2563EB]",
  danger: "bg-[#DC2626] text-white hover:bg-[#B91C1C] focus:ring-[#DC2626]",
  ghost: "text-[#52525B] hover:bg-[#F4F4F5] focus:ring-[#2563EB]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3.5 text-sm gap-1.5",
  md: "h-9.5 px-5 text-sm gap-2",
  lg: "h-11.5 px-7 text-base gap-2",
};

export function Button({ variant = "primary", size = "md", className = "", children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// Input — 8px radius, label above with 6px gap, #E4E4E7 border, focus 2px #2563EB
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = "", id, ...props }: InputProps) {
  const inputId = id || props.name;
  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={inputId} className="block text-sm font-medium text-[#52525B]">{label}</label>}
      <input
        id={inputId}
        className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors ${
          error
            ? "border-[#DC2626] focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]"
            : "border-[#E4E4E7] hover:border-[#D4D4D8] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]"
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-[#DC2626]">{error}</p>}
    </div>
  );
}

// Select — same styling as Input
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: ReactNode;
}

export function Select({ label, error, className = "", id, children, ...props }: SelectProps) {
  const selectId = id || props.name;
  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={selectId} className="block text-sm font-medium text-[#52525B]">{label}</label>}
      <select
        id={selectId}
        className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors bg-white ${
          error
            ? "border-[#DC2626] focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]"
            : "border-[#E4E4E7] hover:border-[#D4D4D8] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]"
        } ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-[#DC2626]">{error}</p>}
    </div>
  );
}

// Textarea — same styling as Input
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = "", id, ...props }: TextareaProps) {
  const textareaId = id || props.name;
  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={textareaId} className="block text-sm font-medium text-[#52525B]">{label}</label>}
      <textarea
        id={textareaId}
        className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors ${
          error
            ? "border-[#DC2626] focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]"
            : "border-[#E4E4E7] hover:border-[#D4D4D8] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]"
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-[#DC2626]">{error}</p>}
    </div>
  );
}

// Card — 8px radius, 1px #F4F4F5 border, subtle shadow, 24px padding
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-lg border border-[#F4F4F5] shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${className}`}>
      {children}
    </div>
  );
}

// Badge — 4px radius, method badge colors
type BadgeColor = "green" | "yellow" | "red" | "blue" | "gray";
const badgeColors: Record<BadgeColor, string> = {
  green: "bg-[#F0FDF4] text-[#16A34A]",
  yellow: "bg-[#FFF7ED] text-[#CA8A04]",
  red: "bg-[#FEF2F2] text-[#DC2626]",
  blue: "bg-[#EFF6FF] text-[#2563EB]",
  gray: "bg-[#F4F4F5] text-[#52525B]",
};

export function Badge({ color = "gray", children }: { color?: BadgeColor; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badgeColors[color]}`}>
      {children}
    </span>
  );
}

// Modal — 12px radius, large shadow, overlay backdrop
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print">
      <div className="absolute inset-0 bg-black/35" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.10)] max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {title && (
          <div className="px-6 py-4 border-b border-[#F4F4F5]">
            <h3 className="font-semibold text-[#18181B]">{title}</h3>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
