"use client";

import { useState, useTransition } from "react";
import DeletionConfirmationDialog from "@/components/dialogs/deletion-confirmation-dialog";
import { ButtonVariant, CustomButton } from "@repo/ui/components/custom-button";
import { toast } from "sonner";
import { Download } from "lucide-react";

const Data = () => {
  const [isExporting, startTransition] = useTransition();

  const handleDownloadData = () => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/export-data");

        if (!response.ok) {
          const error = await response.json();
          toast.error(error.error || "Failed to export data");
          return;
        }

        const data = await response.json();

        // Convert data to JSON string
        const jsonString = JSON.stringify(data, null, 2);

        // Create blob and download
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `aiforge-account-data-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success("Your account data has been downloaded successfully");
      } catch (error) {
        console.error("Error downloading data:", error);
        toast.error("An unexpected error occurred");
      }
    });
  };

  const handleDeleteAccount = async (formData: FormData) => {
    try {
      const response = await fetch("/api/delete-account", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || "Failed to delete account",
        };
      }

      return result;
    } catch (error) {
      console.error("Error deleting account:", error);
      return {
        success: false,
        error: "An unexpected error occurred",
      };
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-medium">Your data</h1>
        <p className="text-muted-foreground text-base text-balance">
          Manage your personal data stored with AIForge.
        </p>
      </div>

      <hr className="border-border h-px w-full border-x-0 border-b-0 border-t-[1px]" />

      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2 w-full sm:max-w-md">
          <h4 className="text-base font-medium">Download account data</h4>
          <p className="text-sm text-muted-foreground">
            You can download all data associated with your account below. This
            data includes your profile information, teams, projects, endpoints,
            and active sessions.
          </p>
        </div>
        <CustomButton
          variant={ButtonVariant.OUTLINE}
          text="Download"
          size="sm"
          className="rounded-full"
          onClick={handleDownloadData}
          isLoading={isExporting}
          icon={<Download size={16} />}
        />
      </div>

      <hr className="border-border h-px w-full border-x-0 border-b-0 border-t-[1px]" />

      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2 w-full sm:max-w-md">
          <h4 className="text-base font-medium">Delete account</h4>
          <p className="text-sm text-muted-foreground">
            Permanently delete your AIForge account and all associated data. This
            action cannot be undone.
          </p>
        </div>
        <DeletionConfirmationDialog onDelete={handleDeleteAccount} />
      </div>
    </div>
  );
};

export default Data;
