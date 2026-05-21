"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Car,
  Map,
  TrendingUp,
  Shield,
  Activity,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/",          label: "Garage",            icon: Car },
  { href: "/tracks",    label: "Tracks",             icon: Map },
  { href: "/predict",   label: "Predict",            icon: TrendingUp },
  { href: "/defense",   label: "Defense Optimizer",  icon: Shield },
  { href: "/calibrate", label: "Log & Calibrate",    icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-r border-border bg-card flex flex-col min-h-screen">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-border">
        <span className="text-sm font-semibold tracking-widest uppercase text-muted-foreground">
          Gauntlet
        </span>
        <h1 className="text-lg font-bold leading-tight">Predictor</h1>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border">
        <p className="text-xs text-muted-foreground">Asphalt Legends Unite</p>
      </div>
    </aside>
  );
}
