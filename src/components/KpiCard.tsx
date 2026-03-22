import { ReactNode } from "react";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  accentColor: "primary" | "info" | "destructive" | "success";
  delay?: number;
}

const borderMap = {
  primary: "border-t-primary",
  info: "border-t-info",
  destructive: "border-t-destructive",
  success: "border-t-success",
};

const iconBgMap = {
  primary: "bg-primary/10 text-primary",
  info: "bg-info/10 text-info",
  destructive: "bg-destructive/10 text-destructive",
  success: "bg-success/10 text-success",
};

export function KpiCard({ title, value, icon, accentColor, delay = 0 }: KpiCardProps) {
  return (
    <div
      className={`animate-fade-in-up rounded-3xl border border-border/40 bg-card/50 backdrop-blur-sm p-6 shadow-xl transition-all hover:shadow-2xl hover:-translate-y-1 ${borderMap[accentColor]} border-t-4`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">
          {title}
        </span>
        <div className={`rounded-2xl p-3 shadow-inner ${iconBgMap[accentColor]}`}>{icon}</div>
      </div>
      <div className="text-3xl font-black tabular-nums tracking-tighter text-foreground">{value}</div>
    </div>
  );
}
