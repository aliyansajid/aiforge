import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/db";
import { auth } from "@repo/auth";

// Function to get client IP address from request
function getClientIP(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }

  if (realIp) {
    return realIp;
  }

  console.log("Forwarded IP:", forwarded, "Read IP:", realIp);

  // No reliable way to get IP if headers are missing
  return null;
}

// Function to get location data from IP
async function getLocationFromIP(ipAddress: string) {
  try {
    const response = await fetch(
      `http://ip-api.com/json/${ipAddress}?fields=status,country,countryCode,region,regionName,city,lat,lon,timezone`
    );
    const data = await response.json();

    if (data.status === "success") {
      return {
        country: data.countryCode,
        region: data.regionName,
        city: data.city,
        lat: data.lat,
        lon: data.lon,
        timezone: data.timezone,
      };
    }
    console.log("Location data from IP:", data);
  } catch (error) {
    console.error("Failed to get location from IP:", error);
  }

  return {
    country: null,
    region: null,
    city: null,
    lat: null,
    lon: null,
    timezone: null,
  };
}

export async function POST(request: NextRequest) {
  try {
    // Get the current session
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userAgent = request.headers.get("user-agent");
    const ipAddress = getClientIP(request);

    // Get location data from IP
    let locationData = {
      country: null,
      region: null,
      city: null,
      lat: null,
      lon: null,
      timezone: null,
    };

    if (ipAddress) {
      locationData = await getLocationFromIP(ipAddress);
    }

    // Find the user's most recent session and update it
    const latestSession = await prisma.session.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    if (latestSession) {
      await prisma.session.update({
        where: { id: latestSession.id },
        data: {
          ipAddress,
          userAgent,
          country: locationData.country,
          region: locationData.region,
          city: locationData.city,
          lat: locationData.lat,
          lon: locationData.lon,
          timezone: locationData.timezone,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to capture session info:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
