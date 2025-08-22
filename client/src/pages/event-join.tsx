import { useState } from "react";
import { useRoute } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Users, Trophy, Brain, ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const joinSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name too long"),
  teamName: z.string().max(50, "Team name too long").optional(),
});

type JoinForm = z.infer<typeof joinSchema>;

export default function EventJoin() {
  const [, params] = useRoute("/join/:qrCode");
  const qrCode = params?.qrCode;
  const { toast } = useToast();
  const [joinedEvent, setJoinedEvent] = useState<any>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<JoinForm>({
    resolver: zodResolver(joinSchema),
  });

  const joinEventMutation = useMutation({
    mutationFn: async (data: JoinForm) => {
      const response = await fetch(`/api/events/join/${qrCode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to join event");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setJoinedEvent(data);
      toast({
        title: "Welcome to the event!",
        description: `You've successfully joined ${data.event.title}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: JoinForm) => {
    joinEventMutation.mutate(data);
  };

  if (joinedEvent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-wine-50 to-champagne-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md trivia-card" data-testid="card-joined-success">
          <CardHeader className="text-center">
            <div className="w-16 h-16 wine-gradient rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl wine-text" data-testid="text-welcome-title">
              Welcome, {joinedEvent.participant.name}!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="p-4 bg-wine-50 rounded-lg border border-wine-200">
              <h3 className="font-semibold text-wine-800 mb-2" data-testid="text-event-title">
                {joinedEvent.event.title}
              </h3>
              <p className="text-sm text-gray-600" data-testid="text-event-description">
                {joinedEvent.event.description}
              </p>
            </div>
            
            {joinedEvent.participant.teamName && (
              <div className="p-3 bg-champagne-50 rounded-lg border border-champagne-200">
                <p className="text-sm font-medium text-champagne-800" data-testid="text-team-name">
                  Team: {joinedEvent.participant.teamName}
                </p>
              </div>
            )}

            <div className="space-y-3 pt-4">
              <div className="flex items-center justify-center text-sm text-gray-600">
                <Users className="mr-2 h-4 w-4" />
                <span data-testid="text-waiting-message">Waiting for the host to start...</span>
              </div>
              
              <div className="text-xs text-gray-500" data-testid="text-instructions">
                Keep this page open. The trivia will begin shortly!
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-wine-50 to-champagne-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* TriviaSpark Branding */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 wine-gradient rounded-lg flex items-center justify-center mr-4">
              <Brain className="text-champagne-400 h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold wine-text" data-testid="text-brand-title">TriviaSpark</h1>
              <p className="text-sm text-gray-500" data-testid="text-brand-tagline">A WebSpark Solution</p>
            </div>
          </div>
          <p className="text-gray-600" data-testid="text-join-subtitle">Join the trivia event</p>
        </div>

        <Card className="trivia-card" data-testid="card-join-form">
          <CardHeader>
            <CardTitle className="text-center" data-testid="text-join-title">
              Event Code: <span className="font-mono champagne-text">{qrCode}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="name" data-testid="label-name">Your Name *</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="Enter your name"
                  className={errors.name ? "border-red-500" : ""}
                  data-testid="input-name"
                />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1" data-testid="error-name">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="teamName" data-testid="label-team">Team Name (Optional)</Label>
                <Input
                  id="teamName"
                  {...register("teamName")}
                  placeholder="Enter team name"
                  className={errors.teamName ? "border-red-500" : ""}
                  data-testid="input-team"
                />
                {errors.teamName && (
                  <p className="text-sm text-red-500 mt-1" data-testid="error-team">
                    {errors.teamName.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={joinEventMutation.isPending}
                className="w-full trivia-button-primary"
                data-testid="button-join-event"
              >
                {joinEventMutation.isPending ? (
                  "Joining..."
                ) : (
                  <>
                    Join Event
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center text-sm text-gray-600 mb-2">
                <Brain className="mr-2 h-4 w-4" />
                <span data-testid="text-ai-powered">AI-Powered Trivia Experience</span>
              </div>
              <p className="text-xs text-gray-500" data-testid="text-event-features">
                Get ready for intelligent questions, real-time competition, and unforgettable memories!
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-xs text-gray-500" data-testid="text-footer">
          Powered by TriviaSpark • Created by Mark Hazleton
        </div>
      </div>
    </div>
  );
}
