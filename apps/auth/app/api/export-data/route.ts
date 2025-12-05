import { NextResponse } from "next/server";
import { exportUserData } from "@/actions/data-export-actions";

export async function GET() {
  try {
    const result = await exportUserData();

    if (result.success && result.data) {
      return NextResponse.json(result.data);
    } else {
      return NextResponse.json(
        { error: result.error || "Failed to export data" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in export-data API:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}
