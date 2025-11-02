import { redirect } from "next/navigation";
import { getUserTeams } from "./actions/team-actions";

const Home = async () => {
  const result = await getUserTeams();
  const teams = result?.data ?? [];

  if (teams.length > 0) {
    const firstTeam = teams[0];
    if (firstTeam?.slug) {
      redirect(`/${firstTeam.slug}`);
    }
  }
};

export default Home;
