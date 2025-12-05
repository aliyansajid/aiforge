"use client";

import { useSession } from "@repo/auth/client";
import { cn } from "@repo/ui/lib/utils";
import { Database, GlobeLock, Lock, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const sideBarLinks = [
  { label: "Account", icon: <User size={20} />, route: "/account" },
  { label: "Security", icon: <Lock size={20} />, route: "/security" },
  { label: "Sessions", icon: <GlobeLock size={20} />, route: "/sessions" },
  { label: "Data", icon: <Database size={20} />, route: "/data" },
];

const Sidebar = () => {
  const { data: session } = useSession();
  const pathname = usePathname();
  return (
    <aside className="flex flex-col gap-6 p-6 sticky top-0 lg:w-full lg:max-w-sm lg:pt-12 xl:max-w-md">
      <h1 className="text-2xl font-medium tracking-tight xl:text-3xl">
        <span>Welcome, {session?.user.firstName}.</span>
        <br />
        <span className="text-muted-foreground text-2xl">
          Manage your AIForge account.
        </span>
      </h1>

      <nav className="flex flex-col gap-2 w-60">
        {sideBarLinks.map((item) => {
          const isActive = pathname === item.route;
          return (
            <Link
              key={item.label}
              href={item.route}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                {
                  "bg-primary text-primary-foreground": isActive,
                  "text-muted-foreground hover:bg-muted": !isActive,
                }
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
