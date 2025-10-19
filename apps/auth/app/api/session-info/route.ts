import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/db";
import { auth } from "@repo/auth";
import { sendNewLoginEmail } from "@/lib/email/nodemailer";

/**
 * Extracts client IP address from request headers.
 * Supports common proxy headers `x-forwarded-for` and `x-real-ip`.
 */
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

  // Fallback: no reliable IP found
  return null;
}

/**
 * Retrieves geolocation data based on provided IP address.
 * Uses ip-api.com for location enrichment.
 */
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

  // Default fallback when location lookup fails
  return {
    country: null,
    region: null,
    city: null,
    lat: null,
    lon: null,
    timezone: null,
  };
}

/**
 * Formats location data into a readable string.
 */
function formatLocation(locationData: any): string {
  const parts = [];

  if (locationData.city) parts.push(locationData.city);
  if (locationData.region) parts.push(locationData.region);
  if (locationData.country) parts.push(locationData.country);

  return parts.length > 0 ? parts.join(", ") : "Unknown Location";
}

/**
 * Checks if this is a new IP address for the user.
 */
async function isNewIPAddress(
  userId: string,
  ipAddress: string
): Promise<boolean> {
  if (!ipAddress) return false;

  const existingSession = await prisma.session.findFirst({
    where: {
      userId,
      ipAddress,
    },
  });

  return !existingSession;
}

/**
 * Updates the user's most recent session with IP, user agent, and location data.
 * Sends email alert if login is from a new IP address.
 */
export async function POST(request: NextRequest) {
  try {
    // Retrieve the authenticated user session
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userAgent = request.headers.get("user-agent") || "Unknown Browser";
    const ipAddress = getClientIP(request);

    // Attempt to enrich session with geolocation data
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

    // Check if this is a new IP address
    const isNewIP = ipAddress
      ? await isNewIPAddress(session.user.id, ipAddress)
      : false;

    // Get the latest session entry for the user
    const latestSession = await prisma.session.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    // Update session record with IP and location data
    if (latestSession) {
      await prisma.session.update({
        where: { id: latestSession.id },
        data: {
          ipAddress,
          userAgent,
          country: locationData.country,
          region: locationData.region,
          city: locationData.city,
          latitude: locationData.lat,
          longitude: locationData.lon,
          timezone: locationData.timezone,
        },
      });
    }

    // Send email alert for new IP address login
    if (isNewIP && session.user.email) {
      try {
        await sendNewLoginEmail(session.user.email, {
          firstName: session.user.name?.split(" ")[0] || "User",
          loginTime: new Date().toUTCString(),
          ipAddress: ipAddress || "Unknown IP",
          location: formatLocation(locationData),
          browser: userAgent,
        });

        console.log("New login email sent successfully");
      } catch (emailError) {
        console.error("Failed to send new login email:", emailError);
        // Don't fail the entire request if email sending fails
      }
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
