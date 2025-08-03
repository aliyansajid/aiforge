"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "./columns-header";
import { DataTableRowActions } from "./row-actions";
import z from "zod";

export const sessionSchema = z.object({
  id: z.string(),
  location: z.string(),
  createdOn: z.string(),
  expiresOn: z.string(),
});

export type Task = z.infer<typeof sessionSchema>;

export const columns: ColumnDef<Task>[] = [
  {
    accessorKey: "location",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Location" />
    ),
  },
  {
    accessorKey: "createdOn",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created On" />
    ),
  },
  {
    accessorKey: "expiresOn",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Expires On" />
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];
