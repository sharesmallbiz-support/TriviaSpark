import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Brain, 
  ArrowLeft, 
  Save, 
  Play, 
  Pause, 
  SkipForward, 
  Users, 
  Calendar, 
  MapPin, 
  Building2,
  Clock,
  Trophy,
  Settings
} from "lucide-react";

type Event = {
  id: string;
  title: string;
  description: string;
  eventType: string;
  status: string;
  qrCode: string;
  maxParticipants: number;
  difficulty: string;
  eventDate: string | null;
  eventTime: string | null;
  location: string | null;
  sponsoringOrganization: string | null;
  createdAt: string;
};

type Question = {
  id: string;
  eventId: string;
  type: string;
  question: string;
  options: string[];
  correctAnswer: string;
  difficulty: string;
  category: string;
  points: number;
  timeLimit: number;
  orderIndex: number;
};

type EventFormData = {
  title: string;
  description: string;
  eventType: string;
  maxParticipants: number;
  difficulty: string;
  eventDate: string;
  eventTime: string;
  location: string;
  sponsoringOrganization: string;
};

function EventManage() {
  const [, params] = useRoute("/events/:id/manage");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [dryRunActive, setDryRunActive] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  const eventId = params?.id;

  // Get event details
  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: ["/api/events", eventId],
    enabled: !!eventId,
    retry: false
  });

  // Get questions for this event
  const { data: questions = [], isLoading: questionsLoading } = useQuery<Question[]>({
    queryKey: ["/api/events", eventId, "questions"],
    enabled: !!eventId,
    retry: false
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty }
  } = useForm<EventFormData>();

  // Populate form when event loads
  useEffect(() => {
    if (event) {
      setValue("title", event.title);
      setValue("description", event.description);
      setValue("eventType", event.eventType);
      setValue("maxParticipants", event.maxParticipants);
      setValue("difficulty", event.difficulty);
      setValue("eventDate", event.eventDate ? new Date(event.eventDate).toISOString().split('T')[0] : "");
      setValue("eventTime", event.eventTime || "");
      setValue("location", event.location || "");
      setValue("sponsoringOrganization", event.sponsoringOrganization || "");
    }
  }, [event, setValue]);

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      const response = await fetch(`/api/events/${eventId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update event");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Event Updated",
        description: "Event details have been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await fetch(`/api/events/${eventId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update status");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Status Updated",
        description: `Event status changed to ${data.status}.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Status Update Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: EventFormData) => {
    updateEventMutation.mutate(data);
  };

  const handleStatusChange = (status: string) => {
    updateStatusMutation.mutate(status);
  };

  const startDryRun = () => {
    if (questions.length === 0) {
      toast({
        title: "No Questions",
        description: "Add some questions to your event before running a dry run.",
        variant: "destructive",
      });
      return;
    }
    setDryRunActive(true);
    setCurrentQuestionIndex(0);
    setShowAnswer(false);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setShowAnswer(false);
    } else {
      setDryRunActive(false);
      setCurrentQuestionIndex(0);
      toast({
        title: "Dry Run Complete",
        description: "You've reviewed all questions in the event.",
      });
    }
  };

  const toggleAnswer = () => {
    setShowAnswer(!showAnswer);
  };

  const stopDryRun = () => {
    setDryRunActive(false);
    setCurrentQuestionIndex(0);
    setShowAnswer(false);
  };

  if (eventLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-wine-50 to-champagne-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 wine-gradient rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Brain className="text-champagne-400 h-8 w-8 animate-pulse" />
          </div>
          <p className="text-wine-700">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-wine-50 to-champagne-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-8">
            <p className="text-gray-600 mb-4">Event not found</p>
            <Button onClick={() => setLocation("/events")} data-testid="button-back-events">
              Back to Events
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-wine-50 to-champagne-50">
      {/* Header */}
      <div className="wine-gradient shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={() => setLocation("/events")}
                className="text-white hover:bg-white/10 mr-4"
                data-testid="button-back"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-white" data-testid="text-page-title">
                  Manage Event
                </h1>
                <p className="text-champagne-200" data-testid="text-event-title">
                  {event.title}
                </p>
              </div>
            </div>
            <Badge 
              variant={event.status === 'active' ? 'default' : 'secondary'}
              className={`text-sm ${event.status === 'active' ? 'bg-emerald-100 text-emerald-800' : ''}`}
              data-testid="badge-event-status"
            >
              {event.status}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="details" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3" data-testid="tabs-event-management">
            <TabsTrigger value="details" data-testid="tab-details">
              <Settings className="mr-2 h-4 w-4" />
              Event Details
            </TabsTrigger>
            <TabsTrigger value="status" data-testid="tab-status">
              <Trophy className="mr-2 h-4 w-4" />
              Status & Control
            </TabsTrigger>
            <TabsTrigger value="dryrun" data-testid="tab-dryrun">
              <Play className="mr-2 h-4 w-4" />
              Dry Run
            </TabsTrigger>
          </TabsList>

          {/* Event Details Tab */}
          <TabsContent value="details">
            <Card className="trivia-card" data-testid="card-event-details">
              <CardHeader>
                <CardTitle className="wine-text">Edit Event Details</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <Label htmlFor="title">Event Title *</Label>
                      <Input
                        id="title"
                        {...register("title", { required: "Title is required" })}
                        className="mt-1"
                        data-testid="input-title"
                      />
                      {errors.title && (
                        <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        {...register("description")}
                        rows={3}
                        className="mt-1"
                        data-testid="input-description"
                      />
                    </div>

                    <div>
                      <Label htmlFor="eventType">Event Type *</Label>
                      <Select
                        value={watch("eventType")}
                        onValueChange={(value) => setValue("eventType", value)}
                      >
                        <SelectTrigger className="mt-1" data-testid="select-event-type">
                          <SelectValue placeholder="Select event type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="wine-dinner">Wine Dinner</SelectItem>
                          <SelectItem value="corporate">Corporate Event</SelectItem>
                          <SelectItem value="party">Party</SelectItem>
                          <SelectItem value="educational">Educational</SelectItem>
                          <SelectItem value="fundraiser">Fundraiser</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="difficulty">Difficulty</Label>
                      <Select
                        value={watch("difficulty")}
                        onValueChange={(value) => setValue("difficulty", value)}
                      >
                        <SelectTrigger className="mt-1" data-testid="select-difficulty">
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                          <SelectItem value="mixed">Mixed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="maxParticipants">Max Participants</Label>
                      <Input
                        id="maxParticipants"
                        type="number"
                        {...register("maxParticipants", { 
                          required: "Max participants is required",
                          min: { value: 1, message: "Must be at least 1" },
                          max: { value: 500, message: "Maximum 500 participants" }
                        })}
                        className="mt-1"
                        data-testid="input-max-participants"
                      />
                      {errors.maxParticipants && (
                        <p className="text-sm text-red-500 mt-1">{errors.maxParticipants.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="eventDate">Event Date</Label>
                      <Input
                        id="eventDate"
                        type="date"
                        {...register("eventDate")}
                        className="mt-1"
                        data-testid="input-event-date"
                      />
                    </div>

                    <div>
                      <Label htmlFor="eventTime">Event Time</Label>
                      <Input
                        id="eventTime"
                        {...register("eventTime")}
                        placeholder="e.g., 7:00 PM"
                        className="mt-1"
                        data-testid="input-event-time"
                      />
                    </div>

                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        {...register("location")}
                        placeholder="Event venue"
                        className="mt-1"
                        data-testid="input-location"
                      />
                    </div>

                    <div>
                      <Label htmlFor="sponsoringOrganization">Sponsoring Organization</Label>
                      <Input
                        id="sponsoringOrganization"
                        {...register("sponsoringOrganization")}
                        placeholder="Organization name"
                        className="mt-1"
                        data-testid="input-sponsoring-org"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={updateEventMutation.isPending || !isDirty}
                      className="trivia-button-primary"
                      data-testid="button-save-event"
                    >
                      {updateEventMutation.isPending ? (
                        <>
                          <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Status Control Tab */}
          <TabsContent value="status">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="trivia-card" data-testid="card-status-control">
                <CardHeader>
                  <CardTitle className="wine-text">Event Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <Badge 
                      variant={event.status === 'active' ? 'default' : 'secondary'}
                      className={`text-lg px-4 py-2 ${event.status === 'active' ? 'bg-emerald-100 text-emerald-800' : ''}`}
                      data-testid="badge-current-status"
                    >
                      {(event.status || 'draft').toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => handleStatusChange("draft")}
                      disabled={event.status === "draft" || updateStatusMutation.isPending}
                      variant={event.status === "draft" ? "default" : "outline"}
                      data-testid="button-set-draft"
                    >
                      Draft
                    </Button>
                    <Button
                      onClick={() => handleStatusChange("active")}
                      disabled={event.status === "active" || updateStatusMutation.isPending}
                      variant={event.status === "active" ? "default" : "outline"}
                      data-testid="button-set-active"
                    >
                      Active
                    </Button>
                    <Button
                      onClick={() => handleStatusChange("completed")}
                      disabled={event.status === "completed" || updateStatusMutation.isPending}
                      variant={event.status === "completed" ? "default" : "outline"}
                      data-testid="button-set-completed"
                    >
                      Completed
                    </Button>
                    <Button
                      onClick={() => handleStatusChange("cancelled")}
                      disabled={event.status === "cancelled" || updateStatusMutation.isPending}
                      variant={event.status === "cancelled" ? "destructive" : "outline"}
                      data-testid="button-set-cancelled"
                    >
                      Cancelled
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="trivia-card" data-testid="card-event-info">
                <CardHeader>
                  <CardTitle className="wine-text">Event Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center text-sm">
                      <Calendar className="mr-3 h-4 w-4 text-wine-600" />
                      <span className="font-medium">Date:</span>
                      <span className="ml-2">{event.eventDate ? new Date(event.eventDate).toLocaleDateString() : "Not set"}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Clock className="mr-3 h-4 w-4 text-wine-600" />
                      <span className="font-medium">Time:</span>
                      <span className="ml-2">{event.eventTime || "Not set"}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <MapPin className="mr-3 h-4 w-4 text-wine-600" />
                      <span className="font-medium">Location:</span>
                      <span className="ml-2">{event.location || "Not set"}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Building2 className="mr-3 h-4 w-4 text-wine-600" />
                      <span className="font-medium">Organization:</span>
                      <span className="ml-2">{event.sponsoringOrganization || "Not set"}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Users className="mr-3 h-4 w-4 text-wine-600" />
                      <span className="font-medium">Max Participants:</span>
                      <span className="ml-2">{event.maxParticipants}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Dry Run Tab */}
          <TabsContent value="dryrun">
            <Card className="trivia-card" data-testid="card-dry-run">
              <CardHeader>
                <CardTitle className="wine-text">
                  Dry Run - Test Your Trivia
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!dryRunActive ? (
                  <div className="text-center space-y-4">
                    <p className="text-gray-600">
                      Preview your trivia questions as participants would see them.
                      {questions.length === 0 && " Add some questions first!"}
                    </p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm font-medium mb-2">Questions in this event:</p>
                      <p className="text-2xl font-bold text-wine-700" data-testid="text-question-count">
                        {questions.length}
                      </p>
                    </div>
                    <Button
                      onClick={startDryRun}
                      disabled={questions.length === 0}
                      className="trivia-button-primary"
                      data-testid="button-start-dry-run"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Start Dry Run
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <Badge variant="default" className="bg-blue-100 text-blue-800" data-testid="badge-dry-run">
                        Dry Run Active
                      </Badge>
                      <div className="text-sm text-gray-600" data-testid="text-question-progress">
                        Question {currentQuestionIndex + 1} of {questions.length}
                      </div>
                    </div>

                    {currentQuestion && (
                      <div className="space-y-6">
                        <div className="bg-white p-6 rounded-lg border-2 border-wine-200">
                          <div className="flex items-center justify-between mb-4">
                            <Badge variant="secondary" data-testid="badge-category">
                              {currentQuestion.category}
                            </Badge>
                            <div className="flex items-center text-sm text-gray-600">
                              <Clock className="mr-1 h-3 w-3" />
                              {currentQuestion.timeLimit}s
                            </div>
                          </div>
                          
                          <h3 className="text-xl font-semibold text-wine-800 mb-6" data-testid="text-question">
                            {currentQuestion.question}
                          </h3>

                          <div className="space-y-3">
                            {currentQuestion.options.map((option, index) => (
                              <div
                                key={index}
                                className={`p-3 rounded-lg border transition-colors ${
                                  showAnswer && option === currentQuestion.correctAnswer
                                    ? 'bg-green-100 border-green-300'
                                    : 'bg-gray-50 border-gray-200'
                                }`}
                                data-testid={`option-${index}`}
                              >
                                <span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
                                {option}
                                {showAnswer && option === currentQuestion.correctAnswer && (
                                  <span className="ml-2 text-green-600 font-semibold">✓ Correct</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <Button
                            onClick={toggleAnswer}
                            variant="outline"
                            data-testid="button-show-answer"
                          >
                            {showAnswer ? "Hide Answer" : "Show Answer"}
                          </Button>
                          
                          <div className="flex gap-3">
                            <Button
                              onClick={stopDryRun}
                              variant="outline"
                              data-testid="button-stop-dry-run"
                            >
                              <Pause className="mr-2 h-4 w-4" />
                              Stop
                            </Button>
                            <Button
                              onClick={nextQuestion}
                              className="trivia-button-primary"
                              data-testid="button-next-question"
                            >
                              {currentQuestionIndex < questions.length - 1 ? (
                                <>
                                  <SkipForward className="mr-2 h-4 w-4" />
                                  Next Question
                                </>
                              ) : (
                                "Finish Dry Run"
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default EventManage;