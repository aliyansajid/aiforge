import { getUserTeams } from "@/app/actions/team-actions";
import { getTeamProjects } from "@/app/actions/project-actions";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  Boxes,
  Rocket,
  Activity,
  TrendingUp,
  Users,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@repo/ui/components/button";
import { Badge } from "@repo/ui/components/badge";

interface DashboardPageProps {
  params: Promise<{
    teamSlug: string;
  }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const resolvedParams = await params;

  const teamsResult = await getUserTeams();
  const teams = teamsResult.data ?? [];

  const currentTeam = teams.find(
    (team) => team.slug === resolvedParams.teamSlug
  );

  if (!currentTeam) {
    notFound();
  }

  // Fetch projects and their endpoints
  const projectsResult = await getTeamProjects(resolvedParams.teamSlug);
  const projects = projectsResult.data ?? [];

  // Calculate statistics
  const totalProjects = projects.length;
  const totalEndpoints = projects.reduce(
    (sum, project) => sum + (project._count?.endpoints || 0),
    0
  );

  // Get team members count
  const teamMembersCount = currentTeam._count?.members || 0;

  // Get recent projects (last 5)
  const recentProjects = projects.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back to {currentTeam.name}
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Projects
            </CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              Active ML projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Endpoints
            </CardTitle>
            <Rocket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEndpoints}</div>
            <p className="text-xs text-muted-foreground">
              Deployed models
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamMembersCount}</div>
            <p className="text-xs text-muted-foreground">
              Active collaborators
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Role</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentTeam.role}</div>
            <p className="text-xs text-muted-foreground">
              Team access level
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
            <CardDescription>
              Your most recently updated projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentProjects.length > 0 ? (
              <div className="space-y-4">
                {recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/${resolvedParams.teamSlug}/${project.slug}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-md bg-primary/10 p-2">
                        <Boxes className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {project._count?.endpoints || 0} endpoints
                        </p>
                      </div>
                    </div>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
                <Link href={`/${resolvedParams.teamSlug}`}>
                  <Button variant="outline" className="w-full">
                    View All Projects
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Boxes className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-4">
                  No projects yet
                </p>
                <Link href={`/${resolvedParams.teamSlug}`}>
                  <Button>Create Your First Project</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link href={`/${resolvedParams.teamSlug}`}>
                <Button variant="outline" className="w-full justify-start">
                  <Boxes className="mr-2 h-4 w-4" />
                  View All Projects
                </Button>
              </Link>
              {["OWNER", "ADMIN"].includes(currentTeam.role) && (
                <Link href={`/${resolvedParams.teamSlug}/settings/members`}>
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="mr-2 h-4 w-4" />
                    Manage Team Members
                  </Button>
                </Link>
              )}
              <Link href={`/${resolvedParams.teamSlug}/analytics/usage`}>
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  View Analytics
                </Button>
              </Link>
              {currentTeam.role === "OWNER" && (
                <Link href={`/${resolvedParams.teamSlug}/settings/billing`}>
                  <Button variant="outline" className="w-full justify-start">
                    <Activity className="mr-2 h-4 w-4" />
                    Billing & Usage
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Info */}
      <Card>
        <CardHeader>
          <CardTitle>Team Information</CardTitle>
          <CardDescription>Details about your team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium">Team Name</p>
              <p className="text-sm text-muted-foreground">{currentTeam.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Your Role</p>
              <Badge variant={currentTeam.role === "OWNER" ? "default" : "secondary"}>
                {currentTeam.role}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium">Team Slug</p>
              <p className="text-sm text-muted-foreground font-mono">
                {currentTeam.slug}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Members</p>
              <p className="text-sm text-muted-foreground">
                {teamMembersCount} {teamMembersCount === 1 ? "member" : "members"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
