
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

interface TeamInvitation {
  id: string;
  team_id: string;
  email: string;
  role: string;
  status: string;
  team: {
    name: string;
    description: string | null;
    created_by: string;
  };
  invited_by_user: {
    email: string;
  } | null;
}

const TeamInvitationPage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [invitation, setInvitation] = useState<TeamInvitation | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch invitation details
  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) return;
      
      try {
        const { data, error } = await supabase
          .from('team_invitations')
          .select(`
            *,
            team:team_id (
              name,
              description,
              created_by
            ),
            invited_by_user:invited_by (
              email
            )
          `)
          .eq('token', token)
          .single();
        
        if (error) throw error;
        
        if (data) {
          // Check if invited_by_user exists and has an email property
          const hasValidInviter = data.invited_by_user !== null && 
                                  typeof data.invited_by_user === 'object' && 
                                  data.invited_by_user && 'email' in data.invited_by_user;
          
          if (!hasValidInviter) {
            // Fetch the inviter's email from user_profiles
            const { data: inviterData, error: inviterError } = await supabase
              .from('user_profiles')
              .select('username')
              .eq('id', data.invited_by)
              .single();
            
            // Set inviter data with a default email or username if available
            const inviterEmail = inviterError ? 'Unknown user' : (inviterData?.username || 'Unknown user');
            
            // Create a proper invitation object with the correct structure
            const invitationWithFixedData = {
              ...data,
              invited_by_user: {
                email: inviterEmail
              }
            };
            
            // Cast to TeamInvitation type after ensuring the structure is correct
            setInvitation(invitationWithFixedData as unknown as TeamInvitation);
          } else {
            // The invited_by_user has the expected structure
            // Use a type assertion with unknown first to avoid type errors
            setInvitation(data as unknown as TeamInvitation);
          }
        }
      } catch (error) {
        console.error("Error fetching invitation:", error);
        toast.error("Invalid or expired invitation link");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInvitation();
  }, [token]);
  
  // Check if user needs to sign in
  useEffect(() => {
    if (!loading && !user && invitation) {
      toast.info("Please sign in to accept this invitation");
      navigate("/auth");
    }
  }, [user, loading, invitation, navigate]);
  
  const handleAccept = async () => {
    if (!user || !invitation) return;
    
    setIsAccepting(true);
    try {
      // Check email matches
      if (user.email !== invitation.email) {
        toast.error("This invitation was sent to a different email address");
        return;
      }
      
      // Add user to team
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: invitation.team_id,
          user_id: user.id,
          role: invitation.role
        });
      
      if (memberError) throw memberError;
      
      // Update invitation status
      const { error: updateError } = await supabase
        .from('team_invitations')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id);
      
      if (updateError) throw updateError;
      
      toast.success("You have successfully joined the team!");
      navigate("/teams");
    } catch (error) {
      console.error("Error accepting invitation:", error);
      toast.error("There was a problem accepting the invitation");
    } finally {
      setIsAccepting(false);
    }
  };
  
  const handleDecline = async () => {
    if (!invitation) return;
    
    setIsDeclining(true);
    try {
      const { error } = await supabase
        .from('team_invitations')
        .update({ status: 'declined' })
        .eq('id', invitation.id);
      
      if (error) throw error;
      
      toast.info("Invitation declined");
      navigate("/");
    } catch (error) {
      console.error("Error declining invitation:", error);
      toast.error("There was a problem declining the invitation");
    } finally {
      setIsDeclining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container px-4 py-10 mx-auto flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </main>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container px-4 py-10 mx-auto flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Invalid Invitation</CardTitle>
              <CardDescription>
                This invitation link is invalid or has expired.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={() => navigate("/")} className="w-full">
                Go Home
              </Button>
            </CardFooter>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      <AnimatedBackground />
      <Header />
      <main className="flex-1 container px-4 py-10 mx-auto flex items-center justify-center relative z-10">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Team Invitation</CardTitle>
            <CardDescription>
              You've been invited to join a team
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">Team</h3>
              <p className="text-lg">{invitation.team.name}</p>
              {invitation.team.description && (
                <p className="text-muted-foreground">{invitation.team.description}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium">Invited By</h3>
              <p>{invitation.invited_by_user?.email || "Unknown user"}</p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium">Role</h3>
              <p className="capitalize">{invitation.role}</p>
            </div>
          </CardContent>
          <CardFooter className="flex gap-3">
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleDecline}
              disabled={isDeclining || isAccepting}
            >
              {isDeclining ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  Declining...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <X className="h-4 w-4" />
                  Decline
                </span>
              )}
            </Button>
            <Button 
              className="w-full bg-primary hover:bg-primary/90" 
              onClick={handleAccept}
              disabled={isDeclining || isAccepting}
            >
              {isAccepting ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  Accepting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Accept
                </span>
              )}
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
};

export default TeamInvitationPage;
