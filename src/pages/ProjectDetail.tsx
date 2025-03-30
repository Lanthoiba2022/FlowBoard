
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { KanbanBoard } from "@/components/KanbanBoard";
import { ProjectHeader } from "@/components/ProjectHeader";
import { useAuth } from "@/context/AuthContext";
import { Project, Task, fetchProjects, fetchTasks } from "@/services/projectService";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { supabase } from "@/integrations/supabase/client";

const ProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // If not loading auth and user is null, redirect to auth page
    if (!loading && !user) {
      navigate("/auth");
      return;
    }

    const loadProjectAndTasks = async () => {
      if (!projectId || !user) return;

      setIsLoading(true);
      try {
        // Load project
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();

        if (projectError) throw projectError;
        setProject(projectData as Project);

        // Load tasks
        const tasksData = await fetchTasks(projectId);
        setTasks(tasksData);
      } catch (error) {
        console.error("Error loading project:", error);
        navigate("/projects");
      } finally {
        setIsLoading(false);
      }
    };

    loadProjectAndTasks();
  }, [projectId, user, loading, navigate]);

  // Set up realtime subscription for tasks
  useEffect(() => {
    if (!projectId || !user) return;

    const channel = supabase
      .channel('public:tasks')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTasks(prev => [payload.new as Task, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTasks(prev => 
              prev.map(task => task.id === payload.new.id ? payload.new as Task : task)
            );
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(task => task.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, user]);

  if (isLoading || !project) {
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
        <ProjectHeader project={project} />
        <KanbanBoard tasks={tasks} projectId={projectId} />
      </main>
    </div>
  );
};

export default ProjectDetail;
