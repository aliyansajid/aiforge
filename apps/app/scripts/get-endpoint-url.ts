import { prisma } from "@repo/db";

async function getEndpointUrl() {
  const endpoint = await prisma.endpoint.findFirst({
    where: {
      status: "DEPLOYED",
    },
    include: {
      project: {
        include: {
          team: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!endpoint) {
    console.log("No deployed endpoints found");
    return;
  }

  const url = `http://localhost:3000/${endpoint.project.team.slug}/${endpoint.project.slug}/endpoints/${endpoint.id}`;

  console.log("\n🎯 Playground URL:");
  console.log(url);
  console.log("\n📊 Endpoint Details:");
  console.log(`- Name: ${endpoint.name}`);
  console.log(`- Framework: ${endpoint.framework}`);
  console.log(`- Status: ${endpoint.status}`);
  console.log(`- Service URL: ${endpoint.serviceUrl}`);
  console.log(`- API Key: ${endpoint.apiKey}`);
}

getEndpointUrl()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
