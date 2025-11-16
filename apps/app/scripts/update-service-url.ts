import { prisma } from "@repo/db";

async function updateServiceUrl() {
  const endpoint = await prisma.endpoint.update({
    where: {
      id: "cmi1lkp040006d9e9ysktke5q",
    },
    data: {
      serviceUrl: "https://aiforge-cmi1lkp040006d9e9ysk-459799433178.asia-south1.run.app",
    },
  });

  console.log("✅ Service URL updated:");
  console.log(`- Endpoint: ${endpoint.name}`);
  console.log(`- Service URL: ${endpoint.serviceUrl}`);
}

updateServiceUrl()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
