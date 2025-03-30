
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRightCircle, 
  MoreHorizontal,
  Trash2
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Task } from "@/services/projectService";

interface TaskCardProps {
  task: Task;
  onDelete: () => Promise<void>;
}

export function TaskCard({ task, onDelete }: TaskCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const priorityColor = {
    low: "bg-blue-100 text-blue-800",
    medium: "bg-amber-100 text-amber-800",
    high: "bg-red-100 text-red-800",
  };

  const statusIcons = {
    'todo': <AlertCircle className="h-4 w-4 text-slate-400" />,
    'in-progress': <ArrowRightCircle className="h-4 w-4 text-blue-500" />,
    'review': <Clock className="h-4 w-4 text-amber-500" />,
    'completed': <CheckCircle2 className="h-4 w-4 text-green-500" />
  };

  const statusText = {
    'todo': 'To Do',
    'in-progress': 'In Progress',
    'review': 'In Review',
    'completed': 'Completed'
  };

  const isOverdue = task.due_date && new Date() > new Date(task.due_date) && task.status !== 'completed';
  
  const formattedDate = task.due_date 
    ? new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
      }).format(new Date(task.due_date))
    : null;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ id: task.id, status: task.status }));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "glass-card rounded-lg p-4 mb-3 cursor-grab active:cursor-grabbing animate-fade-in",
        isHovered ? "shadow-premium-hover" : "shadow-premium"
      )}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-1.5">
          {statusIcons[task.status]}
          <span className="text-sm text-muted-foreground">{statusText[task.status]}</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="opacity-50 hover:opacity-100 transition-opacity">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Edit Task</DropdownMenuItem>
            <DropdownMenuItem>Change Status</DropdownMenuItem>
            <DropdownMenuItem>Change Priority</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive"
              onClick={() => onDelete()}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <h3 className="font-medium text-lg mb-1.5">{task.title}</h3>
      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{task.description}</p>
      
      <div className="flex flex-wrap gap-1.5 mb-3">
        <Badge variant="outline" className={priorityColor[task.priority]}>
          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
        </Badge>
      </div>
      
      {formattedDate && (
        <div className="flex justify-between items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "flex items-center gap-1.5", 
                  isOverdue ? "text-red-500" : "text-muted-foreground"
                )}>
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="text-xs">{formattedDate}</span>
                  {isOverdue && <span className="text-xs font-medium">(Overdue)</span>}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isOverdue ? "Overdue!" : "Due date"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
}
