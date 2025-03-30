
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell, Camera, CheckCircle, Edit, FileText, GitPullRequest, LogOut, Mail, MessageSquare, Settings, User } from "lucide-react";
import { Header } from "@/components/Header";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchUserProfile, updateUserProfile, fetchProjects, fetchTasks } from "@/services/projectService";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie } from 'recharts';
import { useQueryClient } from "@tanstack/react-query";

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [profileForm, setProfileForm] = useState({
    username: "",
    full_name: "",
    job_title: "",
    bio: "",
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  // Stats states
  const [projectStats, setProjectStats] = useState({
    total: 0,
    active: 0,
    completed: 0
  });
  const [taskStats, setTaskStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    review: 0,
    todo: 0
  });
  const [priorityStats, setPriorityStats] = useState({
    high: 0,
    medium: 0,
    low: 0
  });

  // Task status data for chart
  const [statusChartData, setStatusChartData] = useState<any[]>([]);
  const [priorityChartData, setPriorityChartData] = useState<any[]>([]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Fetch user profile
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: () => fetchUserProfile(user?.id || ""),
    enabled: !!user,
  });

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
    enabled: !!user,
  });

  // Load user profile data
  useEffect(() => {
    if (userProfile) {
      setProfileForm({
        username: userProfile.username || "",
        full_name: userProfile.full_name || "",
        job_title: userProfile.job_title || "",
        bio: userProfile.bio || "",
      });
      setAvatarUrl(userProfile.avatar_url);
    }
  }, [userProfile]);

  // Load statistics
  useEffect(() => {
    const loadStats = async () => {
      if (!projects.length || !user) return;
      
      // Calculate project stats
      setProjectStats({
        total: projects.length,
        active: projects.length, // For demo, all projects are active
        completed: 0 // For demo, no completed projects yet
      });
      
      // Fetch all tasks
      let allTasks = [];
      for (const project of projects) {
        const tasks = await fetchTasks(project.id);
        allTasks.push(...tasks);
      }
      
      // Calculate task stats
      const taskStatsData = {
        total: allTasks.length,
        completed: allTasks.filter(t => t.status === 'completed').length,
        inProgress: allTasks.filter(t => t.status === 'in-progress').length,
        review: allTasks.filter(t => t.status === 'review').length,
        todo: allTasks.filter(t => t.status === 'todo').length
      };
      setTaskStats(taskStatsData);
      
      // Calculate priority stats
      const priorityStatsData = {
        high: allTasks.filter(t => t.priority === 'high').length,
        medium: allTasks.filter(t => t.priority === 'medium').length,
        low: allTasks.filter(t => t.priority === 'low').length
      };
      setPriorityStats(priorityStatsData);
      
      // Prepare chart data
      const statusData = [
        { name: 'To Do', value: taskStatsData.todo, color: '#94a3b8' },
        { name: 'In Progress', value: taskStatsData.inProgress, color: '#3b82f6' },
        { name: 'In Review', value: taskStatsData.review, color: '#f59e0b' },
        { name: 'Completed', value: taskStatsData.completed, color: '#22c55e' }
      ].filter(item => item.value > 0);
      setStatusChartData(statusData);
      
      const priorityData = [
        { name: 'Low', value: priorityStatsData.low, color: '#3b82f6' },
        { name: 'Medium', value: priorityStatsData.medium, color: '#f59e0b' },
        { name: 'High', value: priorityStatsData.high, color: '#ef4444' }
      ].filter(item => item.value > 0);
      setPriorityChartData(priorityData);
    };
    
    loadStats();
  }, [projects, user]);

  // Update profile handler
  const handleUpdateProfile = async () => {
    if (!user) return;
    
    setIsUpdating(true);
    try {
      await updateUserProfile(user.id, {
        ...profileForm,
        avatar_url: avatarUrl
      });
      await queryClient.invalidateQueries({ 
        queryKey: ['userProfile', user.id] 
      });
      toast.success("Profile updated successfully");
      setIsEditProfileOpen(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Error updating profile");
    } finally {
      setIsUpdating(false);
    }
  };

  // Upload avatar handler
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      
      // Upload the file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      setAvatarUrl(publicUrl);
      toast.success("Avatar uploaded successfully");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Error uploading avatar");
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/auth");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Error signing out");
    }
  };

  // Show loading skeleton while user is loading
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container px-4 py-6 mx-auto animate-pulse">
          <div className="h-64 bg-muted rounded-lg mb-6"></div>
          <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
            <div className="h-48 bg-muted rounded-lg"></div>
            <div className="h-48 bg-muted rounded-lg"></div>
            <div className="h-48 bg-muted rounded-lg"></div>
          </div>
        </main>
      </div>
    );
  }

  // Calculate total tasks for priority percentages
  const priorityTotal = priorityStats.high + priorityStats.medium + priorityStats.low;

  return (
    <div className="min-h-screen flex flex-col relative">
      <AnimatedBackground />
      <Header />
      <main className="flex-1 container px-4 py-6 mx-auto space-y-8 relative z-10">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Profile Information */}
          <div className="md:w-1/3">
            <Card className="relative">
              <CardHeader className="flex justify-center items-center pb-2">
                <div className="relative group">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={avatarUrl || ""} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {userProfile?.username 
    ? userProfile.username[0].toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <CardTitle className="text-center mt-4">
                  {userProfile?.full_name || userProfile?.username || user?.email?.split('@')[0]}
                </CardTitle>
                <CardDescription className="text-center">
                  {userProfile?.job_title || "No job title set"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-center">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <Mail className="h-4 w-4" />
                    {user?.email}
                  </p>
                  {userProfile?.username && (
                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                      <User className="h-4 w-4" />
                      @{userProfile.username}
                    </p>
                  )}
                </div>
                {userProfile?.bio && (
                  <div className="pt-2 border-t">
                    <p className="text-sm">{userProfile.bio}</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={() => setIsEditProfileOpen(true)}
                >
                  <Edit className="h-4 w-4" />
                  Edit Profile
                </Button>
                <Button 
                  variant="destructive" 
                  className="w-full gap-2"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          {/* Profile Stats */}
          <div className="md:w-2/3 space-y-6">
            <Tabs defaultValue="overview">
              <TabsList className="mb-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="projects">Projects</TabsTrigger>
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Statistics</CardTitle>
                    <CardDescription>
                      Your activity and progress summary
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="flex flex-col items-center justify-center p-4 border rounded-lg">
                      <GitPullRequest className="h-8 w-8 text-blue-500 mb-2" />
                      <h3 className="text-xl font-bold">{projectStats.total}</h3>
                      <p className="text-sm text-muted-foreground">Projects</p>
                    </div>
                    <div className="flex flex-col items-center justify-center p-4 border rounded-lg">
                      <FileText className="h-8 w-8 text-amber-500 mb-2" />
                      <h3 className="text-xl font-bold">{taskStats.total}</h3>
                      <p className="text-sm text-muted-foreground">Total Tasks</p>
                    </div>
                    <div className="flex flex-col items-center justify-center p-4 border rounded-lg">
                      <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                      <h3 className="text-xl font-bold">{taskStats.completed}</h3>
                      <p className="text-sm text-muted-foreground">Completed Tasks</p>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Task Status</CardTitle>
                      <CardDescription>Distribution by status</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                      {statusChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={statusChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={80}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {statusChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <p className="text-muted-foreground">No task data available</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Priority Distribution</CardTitle>
                      <CardDescription>Tasks by priority</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                      {priorityChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={priorityChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value">
                              {priorityChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <p className="text-muted-foreground">No priority data available</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="projects">
                <Card>
                  <CardHeader>
                    <CardTitle>Your Projects</CardTitle>
                    <CardDescription>
                      Projects you've created or are a member of
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {projects.length > 0 ? (
                      <div className="space-y-4">
                        {projects.map(project => (
                          <div 
                            key={project.id} 
                            className="p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                            onClick={() => navigate(`/project/${project.id}`)}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-medium">{project.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {project.description || "No description"}
                                </p>
                              </div>
                              <Button variant="ghost" size="sm">View</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Projects Yet</h3>
                        <p className="text-muted-foreground mb-4">
                          You haven't created any projects yet.
                        </p>
                        <Button 
                          onClick={() => navigate("/projects")}
                          className="bg-primary hover:bg-primary/90"
                        >
                          Go to Projects
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="tasks">
                <Card>
                  <CardHeader>
                    <CardTitle>Your Tasks</CardTitle>
                    <CardDescription>
                      Summary of your tasks across all projects
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                      <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                        <p className="text-sm font-medium text-muted-foreground">To Do</p>
                        <h3 className="text-2xl font-bold">{taskStats.todo}</h3>
                      </div>
                      <div className="p-4 border rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                        <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                        <h3 className="text-2xl font-bold">{taskStats.inProgress}</h3>
                      </div>
                      <div className="p-4 border rounded-lg bg-amber-50 dark:bg-amber-900/20">
                        <p className="text-sm font-medium text-muted-foreground">In Review</p>
                        <h3 className="text-2xl font-bold">{taskStats.review}</h3>
                      </div>
                      <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-900/20">
                        <p className="text-sm font-medium text-muted-foreground">Completed</p>
                        <h3 className="text-2xl font-bold">{taskStats.completed}</h3>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <h3 className="text-lg font-medium mb-2">By Priority</h3>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                            <div 
                              className="bg-red-500 h-2.5 rounded-full" 
                              style={{ width: `${priorityTotal ? (priorityStats.high / priorityTotal) * 100 : 0}%` }}
                            ></div>
                          </div>
                          <span className="ml-2 text-sm whitespace-nowrap">High: {priorityStats.high}</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                            <div 
                              className="bg-amber-500 h-2.5 rounded-full" 
                              style={{ width: `${priorityTotal ? (priorityStats.medium / priorityTotal) * 100 : 0}%` }}
                            ></div>
                          </div>
                          <span className="ml-2 text-sm whitespace-nowrap">Medium: {priorityStats.medium}</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                            <div 
                              className="bg-blue-500 h-2.5 rounded-full" 
                              style={{ width: `${priorityTotal ? (priorityStats.low / priorityTotal) * 100 : 0}%` }}
                            ></div>
                          </div>
                          <span className="ml-2 text-sm whitespace-nowrap">Low: {priorityStats.low}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => navigate("/projects")}
                    >
                      View All Projects
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      
      {/* Edit Profile Dialog */}
      <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your profile information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarUrl || ""} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {profileForm.full_name?.charAt(0) || profileForm.username?.charAt(0) || user?.email?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <Label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1.5 cursor-pointer"
                >
                  <Camera className="h-4 w-4" />
                  <Input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleAvatarUpload}
                  />
                </Label>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Username
              </Label>
              <Input
                id="username"
                value={profileForm.username}
                onChange={(e) => setProfileForm({...profileForm, username: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="full_name" className="text-right">
                Full Name
              </Label>
              <Input
                id="full_name"
                value={profileForm.full_name}
                onChange={(e) => setProfileForm({...profileForm, full_name: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="job_title" className="text-right">
                Job Title
              </Label>
              <Input
                id="job_title"
                value={profileForm.job_title}
                onChange={(e) => setProfileForm({...profileForm, job_title: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bio" className="text-right">
                Bio
              </Label>
              <Textarea
                id="bio"
                value={profileForm.bio}
                onChange={(e) => setProfileForm({...profileForm, bio: e.target.value})}
                className="col-span-3"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsEditProfileOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateProfile}
              disabled={isUpdating}
              className="bg-primary hover:bg-primary/90"
            >
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilePage;
