import { prisma } from "@repo/db";

async function checkEndpointStatus() {
  const endpoint = await prisma.endpoint.findUnique({
    where: {
      id: "cmi1pvqxo0002fpfk118ff67i",
    },
    select: {
      id: true,
      name: true,
      status: true,
      serviceUrl: true,
      buildLogs: true,
      errorMessage: true,
      gcsModelPath: true,
      gcsRequirementsPath: true,
      framework: true,
      createdAt: true,
    },
  });

  if (!endpoint) {
    console.log("❌ Endpoint not found");
    return;
  }

  console.log("\n📊 Endpoint Status:");
  console.log(`- ID: ${endpoint.id}`);
  console.log(`- Name: ${endpoint.name}`);
  console.log(`- Status: ${endpoint.status}`);
  console.log(`- Framework: ${endpoint.framework}`);
  console.log(`- Service URL: ${endpoint.serviceUrl || "Not deployed"}`);
  console.log(`- Created: ${endpoint.createdAt.toLocaleString()}`);

  if (endpoint.errorMessage) {
    console.log(`\n❌ Error: ${endpoint.errorMessage}`);
  }

  if (endpoint.buildLogs) {
    console.log("\n📝 Build Logs:");
    console.log(endpoint.buildLogs);
  }

  console.log("\n📦 GCS Files:");
  console.log(`- Model: ${endpoint.gcsModelPath || "Not uploaded"}`);
  console.log(`- Requirements: ${endpoint.gcsRequirementsPath || "Not uploaded"}`);
}

checkEndpointStatus()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
