import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, Tv, Pause, CalendarPlus } from "lucide-react";
import { Link } from "wouter";

export default function ActiveEvents() {
  const { data: activeEvents, isLoading } = useQuery<any[]>({
    queryKey: ["/api/events/active"],
  });

  if (isLoading) {
    return (
      <Card className="trivia-card" data-testid="card-active-events-loading">
        <CardHeader>
          <CardTitle className="flex items-center" data-testid="text-active-events-title">
            <PlayCircle className="text-emerald-500 mr-2 h-5 w-5" />
            Active Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-100 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="trivia-card" data-testid="card-active-events">
      <CardHeader>
        <CardTitle className="flex items-center" data-testid="text-active-events-title">
          <PlayCircle className="text-emerald-500 mr-2 h-5 w-5" />
          Active Events
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activeEvents && activeEvents.length > 0 ? (
            activeEvents.map((event: any, index: number) => (
              <div key={event.id} className="p-4 border border-emerald-200 rounded-lg bg-emerald-50" data-testid={`active-event-${index}`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900" data-testid={`text-active-event-title-${index}`}>
                    {event.title}
                  </h4>
                  <Badge className="bg-emerald-100 text-emerald-800" data-testid={`badge-active-event-status-${index}`}>
                    Live
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mb-3" data-testid={`text-active-event-info-${index}`}>
                  {event.maxParticipants} max participants • {event.difficulty} difficulty
                </p>
                <div className="flex space-x-2">
                  <Link href={`/event/${event.id}`}>
                    <Button 
                      className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors text-sm"
                      data-testid={`button-view-active-event-${index}`}
                    >
                      <Tv className="mr-1 h-4 w-4" />
                      View
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-gray-300 hover:bg-gray-50 transition-colors"
                    data-testid={`button-pause-active-event-${index}`}
                  >
                    <Pause className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6" data-testid="text-no-active-events">
              <CalendarPlus className="h-8 w-8 text-gray-400 mb-2 mx-auto" />
              <p className="text-gray-500 text-sm">No active events</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
