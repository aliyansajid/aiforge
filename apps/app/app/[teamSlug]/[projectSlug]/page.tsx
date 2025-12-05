"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Button } from "@repo/ui/components/button";
import { Badge } from "@repo/ui/components/badge";
import {
  Brain,
  Search,
  Activity,
  Calendar,
  Bot,
  SearchX,
  PlusCircle,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from "@repo/ui/src/components/input-group";
import {
  getProjectWithEndpoints,
  type ProjectWithEndpoints,
} from "@/app/actions/project-actions";
import { toast } from "sonner";
import { Spinner } from "@repo/ui/src/components/spinner";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@repo/ui/src/components/empty";

export default function ProjectPage() {
  const router = useRouter();
  const params = useParams();
  const [project, setProject] = useState<ProjectWithEndpoints | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [frameworkFilter, setFrameworkFilter] = useState<string>("all");

  const teamSlug = params.teamSlug as string;
  const projectSlug = params.projectSlug as string;

  useEffect(() => {
    loadProject();
  }, []);

  const loadProject = async () => {
    setLoading(true);
    const result = await getProjectWithEndpoints(teamSlug, projectSlug);

    if (result.success && result.data) {
      setProject(result.data);
    } else {
      toast.error(result.message);
      router.push(`/${teamSlug}`);
    }
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DEPLOYED":
        return "bg-green-500";
      case "BUILDING":
      case "DEPLOYING":
        return "bg-blue-500";
      case "UPLOADING":
        return "bg-yellow-500";
      case "FAILED":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const filteredEndpoints =
    project?.endpoints.filter((endpoint) => {
      const matchesSearch =
        endpoint.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        endpoint.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || endpoint.status === statusFilter;

      const matchesFramework =
        frameworkFilter === "all" || endpoint.framework === frameworkFilter;

      return matchesSearch && matchesStatus && matchesFramework;
    }) || [];

  const frameworks = Array.from(
    new Set(project?.endpoints.map((e) => e.framework) || [])
  );

  const handleEndpointClick = (endpointSlug: string) => {
    router.push(`/${teamSlug}/${projectSlug}/${endpointSlug}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Manage endpoint model deployments
          </p>
        </div>
        <Button asChild>
          <Link href={`/${teamSlug}/${projectSlug}/create-endpoint`}>
            <PlusCircle />
            Create Endpoint
          </Link>
        </Button>
      </div>

      {project.endpoints.length > 0 && (
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <InputGroup>
              <InputGroupInput
                placeholder="Search endpoints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
            </InputGroup>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="DEPLOYED">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  Deployed
                </div>
              </SelectItem>
              <SelectItem value="BUILDING">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  Building
                </div>
              </SelectItem>
              <SelectItem value="DEPLOYING">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  Deploying
                </div>
              </SelectItem>
              <SelectItem value="FAILED">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  Failed
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={frameworkFilter} onValueChange={setFrameworkFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Framework" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Frameworks</SelectItem>
              {frameworks.map((framework) => (
                <SelectItem key={framework} value={framework}>
                  {framework}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {filteredEndpoints.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredEndpoints.map((endpoint) => (
            <Card
              key={endpoint.id}
              className="cursor-pointer"
              onClick={() => handleEndpointClick(endpoint.slug)}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Brain className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">
                      {endpoint.name}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      /{endpoint.slug}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  <Badge className={getStatusColor(endpoint.status)}>
                    {endpoint.status}
                  </Badge>
                  <Badge variant="outline">{endpoint.framework}</Badge>
                  <Badge variant="outline">{endpoint.inputType}</Badge>
                  <Badge variant="outline">{endpoint.accessType}</Badge>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      Created:&nbsp;
                      {new Date(endpoint.createdAt).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }
                      )}
                    </span>
                  </div>

                  {endpoint.deployedAt && (
                    <div className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      <span>
                        Deployed:&nbsp;
                        {new Date(endpoint.deployedAt).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent>
            {project.endpoints.length === 0 ? (
              <>
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Bot />
                    </EmptyMedia>
                    <EmptyTitle>No Endpoints Yet</EmptyTitle>
                    <EmptyDescription>
                      You haven&apos;t created any endpoints yet. Get started by
                      creating your first endpoint.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button>
                      <Link
                        href={`/${teamSlug}/${projectSlug}/create-endpoint`}
                      >
                        Create Endpoint
                      </Link>
                    </Button>
                  </EmptyContent>
                </Empty>
              </>
            ) : (
              <>
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <SearchX />
                    </EmptyMedia>
                    <EmptyTitle>No endpoints found</EmptyTitle>
                    <EmptyDescription>
                      Try adjusting your filters or search query
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("all");
                        setFrameworkFilter("all");
                      }}
                    >
                      Clear Filters
                    </Button>
                  </EmptyContent>
                </Empty>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
