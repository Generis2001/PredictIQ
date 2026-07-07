"use client";

import { usePathname } from "next/navigation";
import ProfilePanel from "@/components/ProfilePanel";

export default function AppProfilePanel() {
  const pathname = usePathname();

  if (pathname === "/") return null;

  return <ProfilePanel />;
}
