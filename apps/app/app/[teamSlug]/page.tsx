import { getUserTeams } from "@/app/actions/team-actions";
import { getTeamProjects } from "@/app/actions/project-actions";
import { notFound } from "next/navigation";
import { ProjectCard } from "@/components/project-card";
import { CreateProjectButton } from "@/components/create-project-button";

interface ProjectsPageProps {
  params: Promise<{
    teamSlug: string;
  }>;
}

export default async function ProjectsPage({ params }: ProjectsPageProps) {
  const resolvedParams = await params;

  const teamsResult = await getUserTeams();
  const teams = teamsResult.data ?? [];

  const currentTeam = teams.find(
    (team) => team.slug === resolvedParams.teamSlug
  );

  if (!currentTeam) {
    notFound();
  }

  // Fetch projects for this team
  const projectsResult = await getTeamProjects(resolvedParams.teamSlug);
  const projects = projectsResult.data ?? [];

  const canCreateProject = ["OWNER", "ADMIN"].includes(currentTeam.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage AI model deployments for {currentTeam.name}
          </p>
        </div>
        {canCreateProject && <CreateProjectButton teamId={currentTeam.id} />}
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <div className="space-y-3">
            <h3 className="text-2xl font-semibold">No projects yet</h3>
            <p className="text-muted-foreground max-w-sm">
              Get started by creating your first project to deploy and manage AI
              models.
            </p>
            {canCreateProject && (
              <div className="pt-4">
                <CreateProjectButton teamId={currentTeam.id} />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              teamSlug={resolvedParams.teamSlug}
            />
          ))}
        </div>
      )}
    </div>
  );
}
