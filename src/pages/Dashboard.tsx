
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart as BarChartIcon, 
  CheckCircle, 
  Clock, 
  Plus,
  AlertCircle,
  Calendar,
  ArrowUpRight,
  ArrowRight,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon
} from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { useAuth } from "@/context/AuthContext";
import { fetchProjects, fetchTasks, Project, Task } from "@/services/projectService";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateProjectDialog } from "@/components/CreateProjectDialog";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

// Helper function to format date
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};

// Helper function to check if a date is in the next 7 days
const isInNextSevenDays = (dateString: string | null) => {
  if (!dateString) return false;
  
  const date = new Date(dateString);
  const today = new Date();
  const inSevenDays = new Date();
  inSevenDays.setDate(today.getDate() + 7);
  
  return date >= today && date <= inSevenDays;
};

// Helper to check if a task is overdue
const isOverdue = (dateString: string | null) => {
  if (!dateString) return false;
  
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return date < today;
};

// Get priority color
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return '#ef4444';
    case 'medium': return '#f59e0b';
    case 'low': return '#3b82f6';
    default: return '#3b82f6';
  }
};

// Get status color
const getStatusColor = (status: string) => {
  switch (status) {
    case 'todo': return '#94a3b8';
    case 'in-progress': return '#3b82f6';
    case 'review': return '#f59e0b';
    case 'completed': return '#22c55e';
    default: return '#94a3b8';
  }
};

// Get status icon
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'todo': return <AlertCircle className="h-4 w-4 text-slate-400" />;
    case 'in-progress': return <Clock className="h-4 w-4 text-blue-500" />;
    case 'review': return <Clock className="h-4 w-4 text-amber-500" />;
    case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
    default: return <AlertCircle className="h-4 w-4 text-slate-400" />;
  }
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isCreateProjectDialogOpen, setIsCreateProjectDialogOpen] = useState(false);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Task[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
    enabled: !!user,
  });

  // Get tasks across all projects
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [taskStats, setTaskStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    todo: 0,
    review: 0,
    overdue: 0
  });

  // Prepare data for charts
  const [statusChartData, setStatusChartData] = useState<any[]>([]);
  const [priorityChartData, setPriorityChartData] = useState<any[]>([]);
  const [completionTrendData, setCompletionTrendData] = useState<any[]>([]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Fetch all tasks for all projects
  useEffect(() => {
    const loadAllTasks = async () => {
      if (!projects.length) return;
      
      const allTasksArray: Task[] = [];
      
      for (const project of projects) {
        const tasks = await fetchTasks(project.id);
        allTasksArray.push(...tasks);
      }
      
      setAllTasks(allTasksArray);
      
      // Calculate task statistics
      const stats = {
        total: allTasksArray.length,
        completed: allTasksArray.filter(t => t.status === 'completed').length,
        inProgress: allTasksArray.filter(t => t.status === 'in-progress').length,
        todo: allTasksArray.filter(t => t.status === 'todo').length,
        review: allTasksArray.filter(t => t.status === 'review').length,
        overdue: allTasksArray.filter(t => isOverdue(t.due_date) && t.status !== 'completed').length
      };
      setTaskStats(stats);
      
      // Set upcoming tasks
      const upcoming = allTasksArray.filter(task => 
        isInNextSevenDays(task.due_date) && task.status !== 'completed'
      ).sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      });
      setUpcomingTasks(upcoming);
      
      // Prepare chart data
      const statusData = [
        { name: 'To Do', value: stats.todo, color: '#94a3b8' },
        { name: 'In Progress', value: stats.inProgress, color: '#3b82f6' },
        { name: 'In Review', value: stats.review, color: '#f59e0b' },
        { name: 'Completed', value: stats.completed, color: '#22c55e' }
      ].filter(item => item.value > 0);
      setStatusChartData(statusData);
      
      const priorityData = [
        { name: 'Low', value: allTasksArray.filter(t => t.priority === 'low').length, color: '#3b82f6' },
        { name: 'Medium', value: allTasksArray.filter(t => t.priority === 'medium').length, color: '#f59e0b' },
        { name: 'High', value: allTasksArray.filter(t => t.priority === 'high').length, color: '#ef4444' }
      ].filter(item => item.value > 0);
      setPriorityChartData(priorityData);
      
      // Generate dummy trend data if no task history is available
      const today = new Date();
      const trend = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        // Create some artificial variation for demo
        const completed = Math.floor(Math.random() * 5) + (6 - i);
        trend.push({
          date: dateStr,
          completed: completed
        });
      }
      setCompletionTrendData(trend);
    };
    
    loadAllTasks();
  }, [projects]);

  // Handle global search
  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      // Search for tasks across all projects
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      
      if (error) throw error;
      setSearchResults(data as Task[]);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Redirect to task's project
  const goToTask = (task: Task) => {
    navigate(`/project/${task.project_id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container px-4 py-6 mx-auto">
          <div className="animate-pulse grid gap-6">
            <div className="h-20 bg-muted rounded-lg"></div>
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
              <div className="h-32 bg-muted rounded-lg"></div>
              <div className="h-32 bg-muted rounded-lg"></div>
              <div className="h-32 bg-muted rounded-lg"></div>
              <div className="h-32 bg-muted rounded-lg"></div>
            </div>
            <div className="h-64 bg-muted rounded-lg"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      <AnimatedBackground />
      <Header setSearchQuery={setSearchQuery} handleGlobalSearch={handleSearch} />
      <main className="flex-1 container px-4 py-6 mx-auto space-y-8 relative z-10">
        {searchQuery && searchResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Search Results for "{searchQuery}"</CardTitle>
              <CardDescription>Found {searchResults.length} results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {searchResults.map(task => (
                  <div 
                    key={task.id} 
                    className="p-3 border rounded-md hover:bg-accent cursor-pointer flex items-center justify-between"
                    onClick={() => goToTask(task)}
                  >
                    <div className="flex items-center gap-2">
                      {getStatusIcon(task.status)}
                      <span>{task.title}</span>
                    </div>
                    <Button variant="ghost" size="sm">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={() => setSearchQuery("")}>
                Clear Results
              </Button>
            </CardFooter>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {user?.email?.split('@')[0]}</p>
          </div>
          <Button 
            className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 gap-2"
            onClick={() => setIsCreateProjectDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{taskStats.total}</div>
              <div className="flex items-center gap-2 mt-2">
                <div className="bg-primary/10 text-primary text-xs rounded-full px-2 py-0.5">
                  {projects.length} {projects.length === 1 ? 'Project' : 'Projects'}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{taskStats.completed}</div>
              <div className="flex items-center gap-2 mt-2">
                <div className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-xs rounded-full px-2 py-0.5">
                  {taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0}% Completion
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{taskStats.inProgress + taskStats.review}</div>
              <div className="flex items-center gap-2 mt-2">
                <div className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 text-xs rounded-full px-2 py-0.5">
                  {taskStats.inProgress} in development
                </div>
                <div className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 text-xs rounded-full px-2 py-0.5">
                  {taskStats.review} in review
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{taskStats.todo}</div>
              <div className="flex items-center gap-2 mt-2">
                <div className={cn(
                  "text-xs rounded-full px-2 py-0.5",
                  taskStats.overdue > 0 
                    ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" 
                    : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                )}>
                  {taskStats.overdue > 0 ? `${taskStats.overdue} overdue` : 'On schedule'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Task Completion Rate</CardTitle>
              <CardDescription>
                Completed tasks over the past 7 days
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {completionTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={completionTrendData}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="completed" 
                      stroke="#6366f1" 
                      strokeWidth={2}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center">
                  <LineChartIcon className="h-16 w-16 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground text-center">
                    Complete tasks to see your progress over time
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Task Distribution</CardTitle>
              <CardDescription>
                Task breakdown by status
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {statusChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center">
                  <PieChartIcon className="h-16 w-16 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground text-center">
                    Create tasks to see your task distribution
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Upcoming Deadlines</CardTitle>
                <CardDescription>
                  Tasks due in the next 7 days
                </CardDescription>
              </div>
              <Button variant="ghost" className="gap-1" onClick={() => navigate('/projects')}>
                <span className="hidden sm:inline">All Projects</span>
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {upcomingTasks.length > 0 ? (
                <div className="space-y-3">
                  {upcomingTasks.map(task => (
                    <div
                      key={task.id}
                      className="flex items-center gap-4 p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/project/${task.project_id}`)}
                    >
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center",
                        task.priority === 'high' 
                          ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" 
                          : task.priority === 'medium'
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                      )}>
                        {getStatusIcon(task.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{task.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="capitalize">{task.priority} priority</span>
                          <span>•</span>
                          <span className="capitalize">{task.status.replace('-', ' ')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "flex items-center gap-1 text-xs rounded-full px-2 py-1",
                          isOverdue(task.due_date)
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                        )}>
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{task.due_date ? formatDate(task.due_date) : 'No date'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center border rounded-lg border-dashed">
                  <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground text-center">
                    Upcoming tasks with deadlines will appear here<br />when you add due dates to your tasks.
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => navigate('/projects')}
                  >
                    Go to Projects
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Tasks by Priority</CardTitle>
              <CardDescription>
                Distribution of tasks by priority level
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {priorityChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityChartData} layout="vertical">
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={80} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {priorityChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center">
                  <BarChartIcon className="h-16 w-16 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground text-center">
                    Add tasks with different priorities to see this chart
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.slice(0, 3).map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/project/${project.id}`)}>
              <CardHeader>
                <CardTitle className="truncate">{project.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {project.description || "No description provided"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Total Tasks</span>
                    <span className="text-xl font-semibold">
                      {allTasks.filter(t => t.project_id === project.id).length}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Completed</span>
                    <span className="text-xl font-semibold">
                      {allTasks.filter(t => t.project_id === project.id && t.status === 'completed').length}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <Button variant="ghost" className="gap-1 ml-auto" size="sm">
                  View Project
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
          
          {projects.length === 0 && (
            <Card className="md:col-span-2 lg:col-span-3">
              <CardHeader>
                <CardTitle>Get Started</CardTitle>
                <CardDescription>Create your first project to organize your tasks</CardDescription>
              </CardHeader>
              <CardContent className="pb-2 flex justify-center">
                <Button 
                  onClick={() => setIsCreateProjectDialogOpen(true)}
                  className="gap-2 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600"
                >
                  <Plus className="h-4 w-4" />
                  Create Your First Project
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      
      <CreateProjectDialog
        open={isCreateProjectDialogOpen}
        onOpenChange={setIsCreateProjectDialogOpen}
      />
    </div>
  );
};

export default Dashboard;
