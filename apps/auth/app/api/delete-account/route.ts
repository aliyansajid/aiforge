import { NextRequest, NextResponse } from "next/server";
import { deleteAccount } from "@/actions/account-deletion-actions";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const result = await deleteAccount(formData);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { error: result.error || "Failed to delete account" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error in delete-account API:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
