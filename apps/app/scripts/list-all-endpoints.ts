import { prisma } from "@repo/db";

async function listAllEndpoints() {
  const endpoints = await prisma.endpoint.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
    select: {
      id: true,
      name: true,
      status: true,
      serviceUrl: true,
      framework: true,
      createdAt: true,
      project: {
        select: {
          slug: true,
          team: {
            select: {
              slug: true,
            },
          },
        },
      },
    },
  });

  console.log(`\n📊 Found ${endpoints.length} endpoints:\n`);

  endpoints.forEach((endpoint, index) => {
    console.log(`${index + 1}. ${endpoint.name}`);
    console.log(`   ID: ${endpoint.id}`);
    console.log(`   Status: ${endpoint.status}`);
    console.log(`   Framework: ${endpoint.framework}`);
    console.log(`   Service URL: ${endpoint.serviceUrl || "Not deployed"}`);
    console.log(`   URL: http://localhost:3000/${endpoint.project.team.slug}/${endpoint.project.slug}/endpoints/${endpoint.id}`);
    console.log(`   Created: ${endpoint.createdAt.toLocaleString()}`);
    console.log("");
  });
}

listAllEndpoints()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
