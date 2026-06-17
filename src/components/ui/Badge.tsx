interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "yes" | "no" | "neutral" | "active" | "resolved";
  className?: string;
}

const variantClasses: Record<string, string> = {
  default: "bg-surface border-border text-muted",
  yes: "bg-yes/10 border-yes/30 text-yes",
  no: "bg-no/10 border-no/30 text-no",
  neutral: "bg-electric-blue/10 border-electric-blue/30 text-electric-blue",
  active: "bg-cyan/10 border-cyan/30 text-cyan",
  resolved: "bg-surface border-border text-muted",
};

export default function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
