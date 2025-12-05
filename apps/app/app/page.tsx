import { redirect } from "next/navigation";
import { getUserTeams } from "./actions/team-actions";
import { auth } from "@repo/auth";

const Home = async () => {
  const session = await auth();

  // If not logged in, redirect to auth app
  if (!session?.user) {
    redirect(`${process.env.NEXT_PUBLIC_AUTH_URL || 'https://aiforge-auth.vercel.app'}/login`);
  }

  const result = await getUserTeams();
  const teams = result?.data ?? [];

  if (teams.length > 0) {
    const firstTeam = teams[0];
    if (firstTeam?.slug) {
      redirect(`/${firstTeam.slug}`);
    }
  }

  // If logged in but no teams, show a message or redirect to create team
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Welcome to AIForge</h1>
        <p className="text-muted-foreground mb-4">You don't have any teams yet.</p>
        <p className="text-sm text-muted-foreground">
          Debug info: Session user: {session.user.email}, Teams count: {teams.length}
        </p>
      </div>
    </div>
  );
};

export default Home;
