import { useState } from "react";
import { toast } from "sonner";
import { TaskCard } from "./TaskCard";
import { Task, updateTaskStatus, deleteTask } from "@/services/projectService";
import { Plus, Filter, Search, Calendar as CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CreateTaskDialog } from "./CreateTaskDialog";

interface KanbanColumnProps {
  title: string;
  count: number;
  status: Task["status"];
  tasks: Task[];
  onDrop: (task: Task, newStatus: Task["status"]) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  projectId: string;
}

function KanbanColumn({ 
  title, 
  count, 
  status, 
  tasks, 
  onDrop, 
  onDeleteTask, 
  projectId 
}: KanbanColumnProps) {
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isDropping, setIsDropping] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropping(true);
  };

  const handleDragLeave = () => {
    setIsDropping(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropping(false);
    const taskData = e.dataTransfer.getData('application/json');
    if (taskData) {
      const task = JSON.parse(taskData);
      if (task.status !== status) {
        const fullTask = tasks.find(t => t.id === task.id);
        if (fullTask) {
          onDrop(fullTask, status);
        }
      }
    }
  };

  return (
    <div 
      className={cn(
        "flex flex-col bg-premium-gray-100 rounded-lg p-4 animate-fade-in transition-colors",
        isDropping && "bg-primary/10"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{title}</h3>
          <span className="bg-premium-gray-200 text-premium-gray-600 px-2 py-0.5 rounded-full text-xs font-medium">
            {count}
          </span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8" 
          onClick={() => setIsCreateTaskOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="space-y-3 overflow-y-auto">
        {tasks
          .filter(task => task.status === status)
          .map(task => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onDelete={() => onDeleteTask(task.id)}
            />
          ))}
      </div>

      <CreateTaskDialog
        projectId={projectId}
        open={isCreateTaskOpen}
        onOpenChange={setIsCreateTaskOpen}
        defaultStatus={status}
      />
    </div>
  );
}

interface KanbanBoardProps {
  tasks: Task[];
  projectId: string;
}

export function KanbanBoard({ tasks, projectId }: KanbanBoardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    priority: [] as string[],
    tags: [] as string[],
  });
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);

  const handleTaskDrop = async (task: Task, newStatus: Task["status"]) => {
    try {
      await updateTaskStatus(task.id, newStatus);
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTask(id);
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const filteredTasks = tasks.filter(task => {
    // Search term filter
    const matchesSearch = 
      searchTerm === "" || 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Priority filter
    const matchesPriority = 
      filters.priority.length === 0 || 
      filters.priority.includes(task.priority);
    
    return matchesSearch && matchesPriority;
  });

  const columns: { title: string; status: Task["status"] }[] = [
    { title: "To Do", status: "todo" },
    { title: "In Progress", status: "in-progress" },
    { title: "In Review", status: "review" },
    { title: "Completed", status: "completed" }
  ];

  const allPriorities = ["low", "medium", "high"];

  const columnCounts = {
    todo: filteredTasks.filter(t => t.status === "todo").length,
    "in-progress": filteredTasks.filter(t => t.status === "in-progress").length,
    review: filteredTasks.filter(t => t.status === "review").length,
    completed: filteredTasks.filter(t => t.status === "completed").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative w-full md:w-auto md:min-w-[300px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Priority</DropdownMenuLabel>
              {allPriorities.map(priority => (
                <DropdownMenuCheckboxItem
                  key={priority}
                  checked={filters.priority.includes(priority)}
                  onCheckedChange={(checked) => {
                    setFilters(prev => ({
                      ...prev,
                      priority: checked
                        ? [...prev.priority, priority]
                        : prev.priority.filter(p => p !== priority)
                    }));
                  }}
                >
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            View Calendar
          </Button>
          
          <Button 
            className="gap-2 bg-premium-gradient hover:opacity-90"
            onClick={() => setIsCreateTaskOpen(true)}
          >
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        </div>
      </div>

      <div className={cn(
        "grid gap-6",
        "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      )}>
        {columns.map(({ title, status }) => (
          <KanbanColumn
            key={status}
            title={title}
            status={status}
            count={columnCounts[status]}
            tasks={filteredTasks}
            onDrop={handleTaskDrop}
            onDeleteTask={handleDeleteTask}
            projectId={projectId}
          />
        ))}
      </div>

      <CreateTaskDialog
        projectId={projectId}
        open={isCreateTaskOpen}
        onOpenChange={setIsCreateTaskOpen}
      />
    </div>
  );
}
