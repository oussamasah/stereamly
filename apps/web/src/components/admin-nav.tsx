"use client";
import Link from "next/link";
import { Locale } from "../i18n";
import { useAuth } from "./auth-provider";
type ModuleId = "dashboard" | "sources" | "imports" | "live" | "catalog" | "epg" | "users" | "help";
const modules: Array<{ id: ModuleId; label: string; roles?: string[] }> = [
  { id: "dashboard", label: "Tableau de bord" },
  { id: "sources", label: "Sources", roles: ["TECHNICAL_ADMIN", "SUPER_ADMIN"] },
  { id: "imports", label: "Bibliothèque TV", roles: ["TECHNICAL_ADMIN", "SUPER_ADMIN"] },
  { id: "live", label: "Événements Live", roles: ["CONTENT_MANAGER", "TECHNICAL_ADMIN", "SUPER_ADMIN"] },
  { id: "catalog", label: "Catalogue", roles: ["CONTENT_MANAGER", "SUPER_ADMIN"] },
  { id: "epg", label: "Guide & EPG", roles: ["CONTENT_MANAGER", "TECHNICAL_ADMIN", "SUPER_ADMIN"] },
  { id: "users", label: "Utilisateurs", roles: ["SUPER_ADMIN"] },
  { id: "help", label: "Aide" },
];
export function AdminNav({ locale, current = "dashboard" }: { locale: Locale; current?: ModuleId | "providers" }) {
  const { user } = useAuth();
  return <nav className="admin-nav" aria-label="Navigation du back-office"><div className="admin-tabs">
    {modules.filter((module) => !module.roles || (user && module.roles.includes(user.role))).map((module) => {
      const href = module.id === "dashboard" ? `/${locale}/admin` : `/${locale}/admin/${module.id}`;
      const active = current === module.id || (current === "providers" && module.id === "sources");
      return <Link className={`admin-tab ${active ? "active" : ""}`} href={href} aria-current={active ? "page" : undefined} key={module.id}>{module.label}</Link>;
    })}
  </div><Link className="admin-public-link" href={`/${locale}`}>Voir le site <span aria-hidden="true">↗</span></Link></nav>;
}
