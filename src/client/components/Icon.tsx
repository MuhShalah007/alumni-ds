import type { ReactNode } from "react";

// Remixicon CSS classes — import in index.css: @import "remixicon/fonts/remixicon.css"
// Usage: <Icon name="dashboard-line" size={20} />

interface IconProps {
  name: string;
  size?: number;
  className?: string;
  title?: string;
}

export function Icon({ name, size = 20, className = "", title }: IconProps) {
  return (
    <i
      className={`ri-${name} ${className}`}
      style={{ fontSize: size }}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    />
  );
}

// Convenience icon map for navigation and common actions
export const Icons = {
  // Nav
  Dashboard: ({ size = 20, className = "" }: { size?: number; className?: string }) => (
    <Icon name="dashboard-line" size={size} className={className} />
  ),
  DataAlumni: ({ size = 20, className = "" }: { size?: number; className?: string }) => (
    <Icon name="file-list-3-line" size={size} className={className} />
  ),
  BukuAlumni: ({ size = 20, className = "" }: { size?: number; className?: string }) => (
    <Icon name="book-open-line" size={size} className={className} />
  ),
  ImportExport: ({ size = 20, className = "" }: { size?: number; className?: string }) => (
    <Icon name="upload-download-line" size={size} className={className} />
  ),
  Broadcast: ({ size = 20, className = "" }: { size?: number; className?: string }) => (
    <Icon name="notification-3-line" size={size} className={className} />
  ),
  ManageAdmins: ({ size = 20, className = "" }: { size?: number; className?: string }) => (
    <Icon name="group-line" size={size} className={className} />
  ),
  // Actions
  Print: ({ size = 18, className = "" }: { size?: number; className?: string }) => (
    <Icon name="printer-line" size={size} className={className} />
  ),
  Check: ({ size = 18, className = "" }: { size?: number; className?: string }) => (
    <Icon name="check-line" size={size} className={className} />
  ),
  Close: ({ size = 18, className = "" }: { size?: number; className?: string }) => (
    <Icon name="close-line" size={size} className={className} />
  ),
  ArrowLeft: ({ size = 18, className = "" }: { size?: number; className?: string }) => (
    <Icon name="arrow-left-line" size={size} className={className} />
  ),
  ArrowRight: ({ size = 18, className = "" }: { size?: number; className?: string }) => (
    <Icon name="arrow-right-line" size={size} className={className} />
  ),
  User: ({ size = 24, className = "" }: { size?: number; className?: string }) => (
    <Icon name="user-3-line" size={size} className={className} />
  ),
  Edit: ({ size = 18, className = "" }: { size?: number; className?: string }) => (
    <Icon name="edit-line" size={size} className={className} />
  ),
  Share: ({ size = 18, className = "" }: { size?: number; className?: string }) => (
    <Icon name="share-forward-line" size={size} className={className} />
  ),
  Copy: ({ size = 18, className = "" }: { size?: number; className?: string }) => (
    <Icon name="clipboard-line" size={size} className={className} />
  ),
  Download: ({ size = 18, className = "" }: { size?: number; className?: string }) => (
    <Icon name="download-line" size={size} className={className} />
  ),
  QrCode: ({ size = 18, className = "" }: { size?: number; className?: string }) => (
    <Icon name="qr-code-line" size={size} className={className} />
  ),
  Link: ({ size = 18, className = "" }: { size?: number; className?: string }) => (
    <Icon name="link" size={size} className={className} />
  ),
  Search: ({ size = 18, className = "" }: { size?: number; className?: string }) => (
    <Icon name="search-line" size={size} className={className} />
  ),
  Home: ({ size = 18, className = "" }: { size?: number; className?: string }) => (
    <Icon name="home-line" size={size} className={className} />
  ),
  Form: ({ size = 18, className = "" }: { size?: number; className?: string }) => (
    <Icon name="edit-2-line" size={size} className={className} />
  ),
  Chart: ({ size = 18, className = "" }: { size?: number; className?: string }) => (
    <Icon name="bar-chart-2-line" size={size} className={className} />
  ),
  Bell: ({ size = 20, className = "" }: { size?: number; className?: string }) => (
    <Icon name="notification-3-line" size={size} className={className} />
  ),
  Inbox: ({ size = 20, className = "" }: { size?: number; className?: string }) => (
    <Icon name="inbox-line" size={size} className={className} />
  ),
  Send: ({ size = 18, className = "" }: { size?: number; className?: string }) => (
    <Icon name="send-plane-line" size={size} className={className} />
  ),
  Trash: ({ size = 18, className = "" }: { size?: number; className?: string }) => (
    <Icon name="delete-bin-line" size={size} className={className} />
  ),
  Eye: ({ size = 18, className = "" }: { size?: number; className?: string }) => (
    <Icon name="eye-line" size={size} className={className} />
  ),
  Logout: ({ size = 18, className = "" }: { size?: number; className?: string }) => (
    <Icon name="logout-box-r-line" size={size} className={className} />
  ),
  Lightbulb: ({ size = 18, className = "" }: { size?: number; className?: string }) => (
    <Icon name="lightbulb-line" size={size} className={className} />
  ),
  Success: ({ size = 24, className = "" }: { size?: number; className?: string }) => (
    <Icon name="checkbox-circle-line" size={size} className={className} />
  ),
  Warning: ({ size = 18, className = "" }: { size?: number; className?: string }) => (
    <Icon name="alert-line" size={size} className={className} />
  ),
  Error: ({ size = 18, className = "" }: { size?: number; className?: string }) => (
    <Icon name="error-warning-line" size={size} className={className} />
  ),
} satisfies Record<string, (props: { size?: number; className?: string }) => ReactNode>;
