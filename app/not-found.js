"use client";
import Link from "next/link";
import { Compass } from "lucide-react";
import { useApp } from "@/components/Providers";
import { EmptyState } from "@/components/ui";

export default function NotFound() {
  const { t } = useApp();
  return (
    <EmptyState icon={Compass} title={t("err.notFound")} text={t("err.notFoundText")}
      action={<Link href="/" className="btn btn-primary">{t("err.home")}</Link>} />
  );
}

