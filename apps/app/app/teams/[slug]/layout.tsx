import { TeamSidebar } from "@/components/team-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@repo/ui/components/sidebar";
import { getUserTeams } from "@/actions/team-actions";
import { redirect } from "next/navigation";
import { auth } from "@repo/auth";
import { Separator } from "@repo/ui/components/separator";
import { DynamicBreadcrumb } from "@/components/breadcrumb";

export default async function TeamLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // ✅ Await params
  const { slug } = await params;

  const result = await getUserTeams();
  const teams = result.success ? result.data : [];

  // Check if user has access to this team
  const hasAccess = teams.some((team: any) => team.slug === slug);

  if (!hasAccess) {
    redirect("/");
  }

  return (
    <SidebarProvider>
      <TeamSidebar teams={teams} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <DynamicBreadcrumb />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
