
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Download, Filter } from "lucide-react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { fetchProjects, fetchTasks } from "@/services/projectService";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { supabase } from "@/integrations/supabase/client";

// Helper function to get color for status
const getStatusColor = (status: string) => {
  switch (status) {
    case 'todo': return '#94a3b8';
    case 'in-progress': return '#3b82f6';
    case 'review': return '#f59e0b';
    case 'completed': return '#22c55e';
    default: return '#94a3b8';
  }
};

// Helper function to get color for priority
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return '#ef4444';
    case 'medium': return '#f59e0b';
    case 'low': return '#3b82f6';
    default: return '#3b82f6';
  }
};

const ReportsPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState("last-7-days");
  const [selectedProject, setSelectedProject] = useState("all");
  
  // Stats states
  const [taskStats, setTaskStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    todo: 0,
    review: 0,
    high: 0,
    medium: 0,
    low: 0
  });
  
  // Chart data states
  const [statusChartData, setStatusChartData] = useState<any[]>([]);
  const [priorityChartData, setPriorityChartData] = useState<any[]>([]);
  const [completionTrendData, setCompletionTrendData] = useState<any[]>([]);
  const [teamPerformanceData, setTeamPerformanceData] = useState<any[]>([]);
  
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
    enabled: !!user,
  });

  // Fetch task history
  const fetchTaskHistory = async () => {
    if (!user) return [];
    
    try {
      const { data, error } = await supabase
        .from('task_history')
        .select(`
          *,
          task:task_id (
            id,
            title,
            project_id
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching task history:", error);
      return [];
    }
  };

  // Load task stats and prepare chart data
  useEffect(() => {
    const loadStats = async () => {
      if (!projects.length) return;
      
      const projectsToFetch = selectedProject === 'all' 
        ? projects 
        : projects.filter(p => p.id === selectedProject);
      
      const allTasks = [];
      for (const project of projectsToFetch) {
        const tasks = await fetchTasks(project.id);
        allTasks.push(...tasks);
      }
      
      // Filter tasks by period
      let filteredTasks = allTasks;
      if (selectedPeriod !== 'all-time') {
        const today = new Date();
        let daysToSubtract = 7;
        
        if (selectedPeriod === 'last-30-days') daysToSubtract = 30;
        else if (selectedPeriod === 'last-90-days') daysToSubtract = 90;
        
        const startDate = new Date();
        startDate.setDate(today.getDate() - daysToSubtract);
        
        filteredTasks = allTasks.filter(task => {
          const taskDate = new Date(task.created_at);
          return taskDate >= startDate;
        });
      }
      
      // Calculate task stats
      const stats = {
        total: filteredTasks.length,
        completed: filteredTasks.filter(t => t.status === 'completed').length,
        inProgress: filteredTasks.filter(t => t.status === 'in-progress').length,
        todo: filteredTasks.filter(t => t.status === 'todo').length,
        review: filteredTasks.filter(t => t.status === 'review').length,
        high: filteredTasks.filter(t => t.priority === 'high').length,
        medium: filteredTasks.filter(t => t.priority === 'medium').length,
        low: filteredTasks.filter(t => t.priority === 'low').length
      };
      setTaskStats(stats);
      
      // Prepare chart data for status
      const statusData = [
        { name: 'To Do', value: stats.todo, color: getStatusColor('todo') },
        { name: 'In Progress', value: stats.inProgress, color: getStatusColor('in-progress') },
        { name: 'In Review', value: stats.review, color: getStatusColor('review') },
        { name: 'Completed', value: stats.completed, color: getStatusColor('completed') }
      ].filter(item => item.value > 0);
      setStatusChartData(statusData);
      
      // Prepare chart data for priority
      const priorityData = [
        { name: 'Low', value: stats.low, color: getPriorityColor('low') },
        { name: 'Medium', value: stats.medium, color: getPriorityColor('medium') },
        { name: 'High', value: stats.high, color: getPriorityColor('high') }
      ].filter(item => item.value > 0);
      setPriorityChartData(priorityData);
      
      // Fetch task history for trend data
      const taskHistory = await fetchTaskHistory();
      
      // Create completion trend data
      const now = new Date();
      const completionByDay: {[key: string]: number} = {};
      
      // Initialize all days in the selected period
      let daysToShow = 7;
      if (selectedPeriod === 'last-30-days') daysToShow = 30;
      else if (selectedPeriod === 'last-90-days') daysToShow = 90;
      else if (selectedPeriod === 'all-time') daysToShow = 90; // Cap at 90 days for all-time view
      
      for (let i = daysToShow - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(now.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        completionByDay[dateStr] = 0;
      }
      
      // Count completed tasks by day from history
      if (taskHistory.length > 0) {
        taskHistory.forEach((entry: any) => {
          if (entry.new_status === 'completed') {
            const dateStr = new Date(entry.created_at).toISOString().split('T')[0];
            if (completionByDay[dateStr] !== undefined) {
              completionByDay[dateStr]++;
            }
          }
        });
      } else {
        // Create dummy data if no history
        Object.keys(completionByDay).forEach((date, index) => {
          completionByDay[date] = Math.floor(Math.random() * 5) + (index % 3);
        });
      }
      
      // Format trend data for chart
      const trendData = Object.keys(completionByDay).map(date => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: completionByDay[date]
      }));
      setCompletionTrendData(trendData);
      
      // Create mock team performance data
      const teamMembers = [
        { name: 'Alex', completed: Math.floor(Math.random() * 20) + 5 },
        { name: 'Taylor', completed: Math.floor(Math.random() * 20) + 5 },
        { name: 'Jordan', completed: Math.floor(Math.random() * 20) + 5 },
        { name: 'Casey', completed: Math.floor(Math.random() * 20) + 5 },
        { name: 'Riley', completed: Math.floor(Math.random() * 20) + 5 }
      ];
      setTeamPerformanceData(teamMembers);
    };
    
    loadStats();
  }, [projects, selectedPeriod, selectedProject, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container px-4 py-6 mx-auto space-y-8 animate-pulse">
          <div className="h-32 bg-muted rounded-lg"></div>
          <div className="h-64 bg-muted rounded-lg"></div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      <AnimatedBackground />
      <Header />
      <main className="flex-1 container px-4 py-6 mx-auto space-y-8 relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Reports & Analytics</h1>
            <p className="text-muted-foreground mt-1">
              View and analyze your project performance and productivity
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last-7-days">Last 7 days</SelectItem>
                <SelectItem value="last-30-days">Last 30 days</SelectItem>
                <SelectItem value="last-90-days">Last 90 days</SelectItem>
                <SelectItem value="all-time">All time</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              More Filters
            </Button>
            
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{taskStats.total}</div>
              <div className="flex mt-2 text-xs text-muted-foreground">
                <span className={`inline-flex items-center px-2 py-1 rounded-full ${taskStats.total > 0 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
                  {taskStats.total} tasks
                </span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{taskStats.completed}</div>
              <div className="flex mt-2 text-xs text-muted-foreground">
                <span className={`inline-flex items-center px-2 py-1 rounded-full ${taskStats.completed > 0 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
                  {taskStats.total > 0 ? `${Math.round((taskStats.completed / taskStats.total) * 100)}%` : '0%'} completion rate
                </span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{taskStats.inProgress}</div>
              <div className="flex mt-2 text-xs text-muted-foreground">
                <span className={`inline-flex items-center px-2 py-1 rounded-full ${taskStats.inProgress > 0 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
                  {taskStats.total > 0 ? `${Math.round((taskStats.inProgress / taskStats.total) * 100)}%` : '0%'} of all tasks
                </span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">To Do</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{taskStats.todo}</div>
              <div className="flex mt-2 text-xs text-muted-foreground">
                <span className={`inline-flex items-center px-2 py-1 rounded-full ${taskStats.todo > 0 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
                  {taskStats.total > 0 ? `${Math.round((taskStats.todo / taskStats.total) * 100)}%` : '0%'} pending
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md mb-4">
            <TabsTrigger value="tasks">Task Analytics</TabsTrigger>
            <TabsTrigger value="productivity">Productivity</TabsTrigger>
            <TabsTrigger value="team">Team Performance</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tasks">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Tasks by Status</CardTitle>
                  <CardDescription>
                    Distribution of tasks by their current status
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
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {statusChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} tasks`, 'Count']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-center">
                      <div>
                        <p className="text-muted-foreground mb-2">
                          Task distribution visualization will appear here as you add more tasks.
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate('/projects')}
                        >
                          Go to Projects
                        </Button>
                      </div>
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
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={100} />
                        <Tooltip formatter={(value) => [`${value} tasks`, 'Count']} />
                        <Legend />
                        <Bar dataKey="value" name="Tasks" radius={[0, 4, 4, 0]}>
                          {priorityChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-center">
                      <div>
                        <p className="text-muted-foreground mb-2">
                          Task priority visualization will appear here as you add more tasks.
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate('/projects')}
                        >
                          Go to Projects
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="productivity">
            <Card>
              <CardHeader>
                <CardTitle>Productivity Trends</CardTitle>
                <CardDescription>
                  Task completion rate over time
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {completionTrendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={completionTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value} tasks`, 'Completed']} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        name="Completed Tasks" 
                        stroke="#6366f1" 
                        strokeWidth={2}
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-center">
                    <div>
                      <p className="text-muted-foreground mb-2">
                        Productivity trends will be visualized here as you complete more tasks.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate('/projects')}
                      >
                        Go to Projects
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle>Team Performance</CardTitle>
                <CardDescription>
                  Task completion rates by team member
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {teamPerformanceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={teamPerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value} tasks`, 'Completed']} />
                      <Legend />
                      <Bar 
                        dataKey="completed" 
                        name="Completed Tasks" 
                        fill="#6366f1" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-center">
                    <div>
                      <p className="text-muted-foreground mb-2">
                        Team performance metrics will be visualized here as you add team members and assign tasks.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate('/teams')}
                      >
                        Go to Teams
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ReportsPage;
