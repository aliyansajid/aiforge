// apps/auth/components/data-table/columns.tsx
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

export type SessionTableData = z.infer<typeof sessionSchema>;

export const columns: ColumnDef<SessionTableData>[] = [
  {
    accessorKey: "location",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Location" />
    ),
    cell: ({ row }) => {
      return <div className="font-medium">{row.getValue("location")}</div>;
    },
  },
  {
    accessorKey: "createdOn",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created On" />
    ),
    cell: ({ row }) => {
      return <div>{row.getValue("createdOn")}</div>;
    },
  },
  {
    accessorKey: "expiresOn",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Expires On" />
    ),
    cell: ({ row }) => {
      return <div>{row.getValue("expiresOn")}</div>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];
