"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const role = (session.user as { role?: string })?.role;
      const path =
        role === "admin"
          ? "/admin/dashboard"
          : role === "super_admin"
            ? "/control_panel"
            : "/client/dashboard";
      router.replace(path);
    } else {
      // Redirect to the static auth/login page
      router.replace("/auth/login");
    }
  }, [session, status, router]);

  // Return null - no loading screen
  return null;
}
