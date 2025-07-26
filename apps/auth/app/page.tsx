import { auth } from "@repo/auth";

const Home = async () => {
  const session = await auth();
  return (
    <div>
      <div>{session?.user?.id}</div>
      <div>{session?.user?.name}</div>
      <div>{session?.user?.email}</div>
      <div>{session?.user?.image}</div>
    </div>
  );
};

export default Home;
