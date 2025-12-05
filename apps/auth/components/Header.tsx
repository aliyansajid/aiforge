"use client";

import {
  Moon,
  Search,
  Sun,
  User,
  Mail,
  Lock,
  Shield,
  Smartphone,
  RotateCcw,
  Users,
  LogOut,
  Database,
  UserCircle,
  Command,
  LayoutDashboard,
  MonitorSmartphone,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@repo/ui/components/button";
import { Badge } from "@repo/ui/components/badge";
import { signOut, useSession } from "@repo/auth/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@repo/ui/components/command";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

const Header = () => {
  const { setTheme } = useTheme();
  const { data: session } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    // Detect platform on client side only
    setIsMac(navigator.userAgent.toUpperCase().indexOf("MAC") >= 0);

    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleCommandSelect = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <header className="bg-background flex items-center justify-between sticky z-50 top-0 px-4 py-3">
      <Image src={"/logo-light.svg"} alt="logo" height={"40"} width={"40"} />
      <div className="flex items-center gap-2">
        <Button
          variant={"outline"}
          className="rounded-full gap-4 transition-all duration-150 hover:gap-8"
          onClick={() => setOpen(true)}
        >
          <Search />
          <Badge className="bg-muted text-muted-foreground">
            {isMac ? "⌘K" : "Ctrl+K"}
          </Badge>
        </Button>

        <CommandDialog open={open} onOpenChange={setOpen}>
          <CommandInput placeholder="Type a command or search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>

            {/* Account Section */}
            <CommandGroup heading="Account">
              <CommandItem
                onSelect={() =>
                  handleCommandSelect(() => router.push("/account"))
                }
              >
                <UserCircle className="mr-2 h-4 w-4" />
                <span>View Account</span>
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  handleCommandSelect(() => router.push("/account"))
                }
              >
                <User className="mr-2 h-4 w-4" />
                <span>Update Name</span>
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  handleCommandSelect(() => router.push("/account"))
                }
              >
                <Mail className="mr-2 h-4 w-4" />
                <span>Update Email</span>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            {/* Security Section */}
            <CommandGroup heading="Security">
              <CommandItem
                onSelect={() =>
                  handleCommandSelect(() => router.push("/security"))
                }
              >
                <Lock className="mr-2 h-4 w-4" />
                <span>Update Password</span>
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  handleCommandSelect(() =>
                    router.push("/security/mfa/add-device")
                  )
                }
              >
                <Smartphone className="mr-2 h-4 w-4" />
                <span>Add MFA Device</span>
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  handleCommandSelect(() => router.push("/security"))
                }
              >
                <Shield className="mr-2 h-4 w-4" />
                <span>Manage MFA Devices</span>
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  handleCommandSelect(() => router.push("/security"))
                }
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                <span>Regenerate Recovery Codes</span>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            {/* Sessions Section */}
            <CommandGroup heading="Sessions">
              <CommandItem
                onSelect={() =>
                  handleCommandSelect(() => router.push("/sessions"))
                }
              >
                <Users className="mr-2 h-4 w-4" />
                <span>View Sessions</span>
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  handleCommandSelect(() => signOut({ redirect: false }))
                }
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            {/* Data Section */}
            <CommandGroup heading="Data">
              <CommandItem
                onSelect={() => handleCommandSelect(() => router.push("/data"))}
              >
                <Database className="mr-2 h-4 w-4" />
                <span>Manage Account Data</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </CommandDialog>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="rounded-full">
              <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun />
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon />
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              <MonitorSmartphone />
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild className="cursor-pointer">
            <Avatar className="size-9">
              <AvatarImage src={session?.user.image || undefined} />
              <AvatarFallback>
                {session?.user.firstName?.charAt(0)}
                {session?.user.lastName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={session?.user.image || undefined} />
                  <AvatarFallback>
                    {session?.user.firstName?.charAt(0)}
                    {session?.user.lastName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {session?.user.name}
                  </span>
                  <span className="truncate text-xs">
                    {session?.user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setOpen(true)}>
              <Command />
              Command Menu
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => window.open(process.env.NEXT_PUBLIC_DASHBOARD_URL || "http://localhost:3001", "_blank")}
            >
              <LayoutDashboard />
              AIForge
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ redirect: false })}>
              <LogOut />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
