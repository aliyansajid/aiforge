"use client";

import { Row } from "@tanstack/react-table";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { DropdownMenu } from "@radix-ui/react-dropdown-menu";
import { deleteSession } from "@/actions/session";
import { toast } from "sonner";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { SessionTableData } from "./columns";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const session = row.original as SessionTableData;

  const handleDeleteSession = async () => {
    startTransition(async () => {
      try {
        await deleteSession(session.id);
        toast.success("Session deleted successfully");
        router.refresh();
      } catch (error) {
        toast.error("An unexpected error occurred. Please try again later.");
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={handleDeleteSession}
          disabled={isPending}
          className="text-destructive"
        >
          <Trash2 size={16} />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
