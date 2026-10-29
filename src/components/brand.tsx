import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export function Logo({ className = "" }: { className?: string }) {
  const { t } = useTranslation("nav");
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`} aria-label={t("header.home")}>
      <img src="/puntrlogo.png" alt="Puntr" className="h-9" />
    </Link>
  );
}
