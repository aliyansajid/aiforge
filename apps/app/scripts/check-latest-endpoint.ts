import { prisma } from "@repo/db";

async function checkLatestEndpoint() {
  const endpoint = await prisma.endpoint.findFirst({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      status: true,
      serviceUrl: true,
      buildLogs: true,
      errorMessage: true,
      framework: true,
      createdAt: true,
      apiKey: true,
    },
  });

  if (!endpoint) {
    console.log("❌ No endpoints found");
    return;
  }

  console.log("\n📊 Latest Endpoint:");
  console.log(`- ID: ${endpoint.id}`);
  console.log(`- Name: ${endpoint.name}`);
  console.log(`- Status: ${endpoint.status}`);
  console.log(`- Framework: ${endpoint.framework}`);
  console.log(`- Service URL: ${endpoint.serviceUrl || "⚠️  NOT SET"}`);
  console.log(`- API Key: ${endpoint.apiKey}`);
  console.log(`- Created: ${endpoint.createdAt.toLocaleString()}`);

  if (endpoint.errorMessage) {
    console.log(`\n❌ Error Message:`);
    console.log(endpoint.errorMessage);
  }

  if (endpoint.buildLogs) {
    console.log(`\n📝 Build Logs:`);
    console.log(endpoint.buildLogs);
  } else {
    console.log(`\n⚠️  No build logs found`);
  }
}

checkLatestEndpoint()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
