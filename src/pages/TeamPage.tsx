
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, User, Users, Search, UserPlus, Mail, Copy, Share2, Check } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/context/AuthContext";
import { fetchTeams, createTeam } from "@/services/projectService";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Define types
interface TeamWithMembers {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  members: any[];
}

// Form schemas
const teamFormSchema = z.object({
  name: z.string().min(1, "Team name is required").max(100, "Team name is too long"),
  description: z.string().optional(),
});

const inviteFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(["member", "admin"], {
    required_error: "Please select a role"
  })
});

type TeamFormValues = z.infer<typeof teamFormSchema>;
type InviteFormValues = z.infer<typeof inviteFormSchema>;

const TeamPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [currentTeam, setCurrentTeam] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedLinks, setCopiedLinks] = useState<{[key: string]: boolean}>({});

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Create team form
  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Invite form
  const inviteForm = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      role: "member",
    },
  });

  // Fetch teams and members
  const { data: teams = [], refetch } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data: teamsData } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false });
      
      const teamsWithMembers: TeamWithMembers[] = [];
      
      if (teamsData) {
        for (const team of teamsData) {
          const { data: members } = await supabase
            .from('team_members')
            .select(`
              *,
              user_profiles:user_id (id, username, full_name, avatar_url)
            `)
            .eq('team_id', team.id);
          
          teamsWithMembers.push({
            ...team,
            members: members || []
          });
        }
      }
      
      return teamsWithMembers;
    },
    enabled: !!user,
  });

  // Create team submission
  const onSubmit = async (values: TeamFormValues) => {
    if (!user) return;
    
    try {
      setIsSubmitting(true);
      
      await createTeam({
        name: values.name,
        description: values.description || null,
        created_by: user.id,
      });
      
      form.reset();
      setIsCreateDialogOpen(false);
      refetch();
      toast.success("Team created successfully");
    } catch (error: any) {
      console.error("Error creating team:", error);
      toast.error(`Error creating team: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Invite submission
  const handleInvite = async (values: InviteFormValues) => {
    if (!user || !currentTeam) return;
    
    try {
      setIsInviting(true);
      
      const { data, error } = await supabase
        .from('team_invitations')
        .insert({
          team_id: currentTeam,
          email: values.email,
          role: values.role,
          invited_by: user.id
        })
        .select()
        .single();
      
      if (error) throw error;
      
      inviteForm.reset();
      setIsInviteDialogOpen(false);
      toast.success(`Invitation sent to ${values.email}`);
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      toast.error(`Error sending invitation: ${error.message}`);
    } finally {
      setIsInviting(false);
    }
  };

  // Copy invitation link
  const copyInvitationLink = async (token: string) => {
    const link = `${window.location.origin}/team/invite/${token}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLinks(prev => ({ ...prev, [token]: true }));
      setTimeout(() => {
        setCopiedLinks(prev => ({ ...prev, [token]: false }));
      }, 2000);
      toast.success("Invitation link copied to clipboard");
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  // Generate invitation link
  const getInvitationLink = async (teamId: string) => {
    try {
      // First check if we already have an invitation for the user's email
      const { data: existingInvitations, error: fetchError } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('team_id', teamId)
        .eq('status', 'pending');
      
      if (fetchError) throw fetchError;
      
      let token;
      
      // If there's an existing invitation, use its token
      if (existingInvitations && existingInvitations.length > 0) {
        token = existingInvitations[0].token;
      } else {
        // Create a new general invitation
        const { data, error } = await supabase
          .from('team_invitations')
          .insert({
            team_id: teamId,
            email: 'general_invite@example.com', // This is a placeholder email
            role: 'member',
            invited_by: user?.id || ''
          })
          .select()
          .single();
        
        if (error) throw error;
        token = data.token;
      }
      
      await copyInvitationLink(token);
    } catch (error: any) {
      console.error("Error generating invitation link:", error);
      toast.error("Failed to generate invitation link");
    }
  };

  // Filter teams based on search term
  const filteredTeams = teams.filter(team => 
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (team.description && team.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Teams</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage your teams for better collaboration
            </p>
          </div>
          
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 gap-2"
          >
            <Plus className="h-4 w-4" />
            New Team
          </Button>
        </div>
        
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search teams..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {filteredTeams.length === 0 ? (
          <div className="flex items-center justify-center py-16 rounded-lg border-2 border-dashed">
            <div className="text-center space-y-4">
              <Users className="h-12 w-12 text-muted-foreground/50 mx-auto" />
              <h2 className="text-xl font-semibold">No teams yet</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Create your first team to start collaborating with others on projects.
              </p>
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600"
              >
                Create Team
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeams.map((team) => (
              <Card 
                key={team.id} 
                className="overflow-hidden hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    {team.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {team.description || "No description provided"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium">Members</h4>
                    <span className="text-xs text-muted-foreground">
                      {team.members.length + 1} {/* +1 for team creator */}
                    </span>
                  </div>
                  <div className="flex -space-x-2 overflow-hidden">
                    <div className="inline-block h-8 w-8 rounded-full ring-2 ring-background bg-primary flex items-center justify-center text-primary-foreground">
                      <User className="h-4 w-4" />
                    </div>
                    {team.members.slice(0, 3).map((member, index) => (
                      <div 
                        key={member.id} 
                        className="inline-block h-8 w-8 rounded-full ring-2 ring-background bg-muted flex items-center justify-center text-muted-foreground"
                      >
                        {member.user_profiles?.avatar_url ? (
                          <img 
                            src={member.user_profiles.avatar_url} 
                            alt={member.user_profiles.username || `Member ${index}`}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </div>
                    ))}
                    {team.members.length > 3 && (
                      <div className="inline-block h-8 w-8 rounded-full ring-2 ring-background bg-muted flex items-center justify-center text-muted-foreground text-xs font-medium">
                        +{team.members.length - 3}
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1">
                        <UserPlus className="h-4 w-4" />
                        <span className="sm:inline">Invite</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>Invite Options</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => {
                        setCurrentTeam(team.id);
                        setIsInviteDialogOpen(true);
                      }}>
                        <Mail className="h-4 w-4 mr-2" />
                        <span>By Email</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => getInvitationLink(team.id)}>
                        <Share2 className="h-4 w-4 mr-2" />
                        <span>Copy Invite Link</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="default" size="sm" onClick={() => {
                    // Will be implemented in future
                    toast.info("Team details page coming soon!");
                  }}>View Team</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
      
      {/* Create Team Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
            <DialogDescription>
              Create a new team to collaborate with others on projects.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter team name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter team description (optional)"
                        {...field}
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating..." : "Create Team"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Invite by Email Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Invite to Team</DialogTitle>
            <DialogDescription>
              Send an email invitation to join your team.
            </DialogDescription>
          </DialogHeader>
          <Form {...inviteForm}>
            <form onSubmit={inviteForm.handleSubmit(handleInvite)} className="space-y-4">
              <FormField
                control={inviteForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter email address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={inviteForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant={field.value === "member" ? "default" : "outline"}
                        onClick={() => field.onChange("member")}
                        className="flex-1"
                      >
                        Member
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === "admin" ? "default" : "outline"}
                        onClick={() => field.onChange("admin")}
                        className="flex-1"
                      >
                        Admin
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600"
                  disabled={isInviting}
                >
                  {isInviting ? "Sending..." : "Send Invitation"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamPage;
