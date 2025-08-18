import DeletionConfirmationDialog from "@/components/DeletionConfirmationDialog";
import { ButtonVariant, CustomButton } from "@repo/ui/components/CustomButton";

const Data = () => {
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
            data includes everything stored in all AIForge products.
          </p>
        </div>
        <CustomButton
          variant={ButtonVariant.OUTLINE}
          text="Download"
          size="sm"
          className="rounded-full"
        />
      </div>

      <hr className="border-border h-px w-full border-x-0 border-b-0 border-t-[1px]" />

      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2 w-full sm:max-w-md">
          <h4 className="text-base font-medium">Download account data</h4>
          <p className="text-sm text-muted-foreground">
            You can download all data associated with your account below. This
            data includes everything stored in all AIForge products.
          </p>
        </div>
        <DeletionConfirmationDialog />
      </div>
    </div>
  );
};

export default Data;
