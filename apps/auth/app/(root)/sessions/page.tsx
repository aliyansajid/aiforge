import { getCurrentSession, getActiveSessions } from "@/actions/session";
import SessionsClient from "@/components/SessionClient";

const Sessions = async () => {
  const [currentSession, activeSessions] = await Promise.all([
    getCurrentSession(),
    getActiveSessions(),
  ]);

  return (
    <SessionsClient session={currentSession} activeSessions={activeSessions} />
  );
};

export default Sessions;
