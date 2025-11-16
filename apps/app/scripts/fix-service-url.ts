import { prisma } from "@repo/db";

async function fixServiceUrl() {
  const endpoint = await prisma.endpoint.update({
    where: {
      id: "cmi1q6xdp0006fpfkxif04u4p",
    },
    data: {
      serviceUrl: "https://aiforge-cmi1q6xdp0006fpfkxif-n2v5xbqiba-el.a.run.app",
      deployedAt: new Date(),
    },
  });

  console.log("✅ Service URL updated:");
  console.log(`- Endpoint: ${endpoint.name}`);
  console.log(`- Service URL: ${endpoint.serviceUrl}`);
  console.log(`\n🎯 Playground URL:`);
  console.log(`http://localhost:3000/aliyan-sajid-team-3236/image-classification/endpoints/${endpoint.id}`);
}

fixServiceUrl()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
