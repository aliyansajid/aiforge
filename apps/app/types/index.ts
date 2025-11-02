export interface Team {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  role: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  teamId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActionResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

export interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
}
