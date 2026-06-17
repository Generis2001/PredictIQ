export default function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-8 h-8" }[size];
  return (
    <div
      className={`${s} border-2 border-electric-blue border-t-transparent rounded-full animate-spin`}
    />
  );
}

export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted">
      <Spinner size="lg" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center text-muted text-xl">
        ○
      </div>
      <p className="font-semibold text-foreground">{title}</p>
      {description && <p className="text-sm text-muted max-w-xs">{description}</p>}
      {action}
    </div>
  );
}
