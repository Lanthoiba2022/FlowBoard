
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  MoreHorizontal, 
  Star, 
  Calendar,
  Clock,
  UsersRound,
  Edit,
  Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Project, Task, updateProject, deleteProject } from "@/services/projectService";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { EditProjectDialog } from "./EditProjectDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ProjectHeaderProps {
  project: Project;
  tasks?: Task[];
}

export function ProjectHeader({ project }: ProjectHeaderProps) {
  const [isStarred, setIsStarred] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const navigate = useNavigate();
  
  const handleDeleteProject = async () => {
    const success = await deleteProject(project.id);
    if (success) {
      navigate('/projects');
    }
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={() => setIsStarred(!isStarred)}
            >
              <Star 
                className={`h-5 w-5 ${isStarred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} 
              />
            </Button>
          </div>
          <p className="text-muted-foreground">{project.description}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Project
              </DropdownMenuItem>
              <DropdownMenuItem>Duplicate Project</DropdownMenuItem>
              <DropdownMenuItem>Add to Favorites</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card rounded-lg p-4 flex items-center gap-3">
          <div className="bg-blue-100 text-blue-700 p-2 rounded">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Created</p>
            <p className="font-medium">{new Date(project.created_at).toLocaleDateString()}</p>
          </div>
        </div>
        
        <div className="glass-card rounded-lg p-4 flex items-center gap-3">
          <div className="bg-purple-100 text-purple-700 p-2 rounded">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Last updated</p>
            <p className="font-medium">{new Date(project.updated_at).toLocaleDateString()}</p>
          </div>
        </div>
        
        <div className="glass-card rounded-lg p-4 flex items-center gap-3">
          <div className="bg-green-100 text-green-700 p-2 rounded">
            <UsersRound className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between">
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="text-sm font-medium">60%</p>
            </div>
            <Progress value={60} className="h-2 mt-1" />
          </div>
        </div>
      </div>
      
      <Tabs defaultValue="board" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="board" className="flex gap-2">
            Board
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex gap-2">
            Timeline
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex gap-2">
            Calendar
          </TabsTrigger>
          <TabsTrigger value="files" className="flex gap-2">
            Files
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Edit Project Dialog */}
      <EditProjectDialog
        project={project}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project
              and all associated tasks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
