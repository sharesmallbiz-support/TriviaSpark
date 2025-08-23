import { useQuery } from "@tanstack/react-query";
import DashboardStats from "@/components/stats/dashboard-stats";
import EventGenerator from "@/components/ai/event-generator";
import QuestionGenerator from "@/components/ai/question-generator";
import ActiveEvents from "@/components/events/active-events";
import RecentEvents from "@/components/events/recent-events";
import UpcomingEvents from "@/components/events/upcoming-events";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, QrCode, Copy, Calendar, Lightbulb, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalEvents: number;
    totalParticipants: number;
    totalQuestions: number;
    averageRating: number;
    insights?: string[];
  }>({
    queryKey: ["/api/dashboard/stats"],
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2" data-testid="welcome-heading">
          Welcome back, Mark!
        </h2>
        <p className="text-gray-600" data-testid="welcome-description">
          Create unforgettable trivia experiences with AI-powered content generation
        </p>
      </div>

      {/* Quick Stats */}
      <DashboardStats stats={stats} isLoading={statsLoading} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Event Creation */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Event Generator */}
          <EventGenerator />

          {/* Question Generator */}
          <QuestionGenerator />

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="trivia-card hover:shadow-md transition-shadow cursor-pointer" data-testid="card-qr-event">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-wine-100 rounded-lg flex items-center justify-center mr-4">
                    <QrCode className="text-wine-700 h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900" data-testid="text-qr-title">
                      Quick QR Event
                    </h4>
                    <p className="text-gray-600 text-sm" data-testid="text-qr-description">
                      Start instant trivia
                    </p>
                  </div>
                </div>
                <Button className="w-full bg-wine-100 text-wine-700 hover:bg-wine-200" data-testid="button-create-qr">
                  Create QR Code
                </Button>
              </CardContent>
            </Card>

            <Card className="trivia-card hover:shadow-md transition-shadow cursor-pointer" data-testid="card-clone-event">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-champagne-100 rounded-lg flex items-center justify-center mr-4">
                    <Copy className="text-champagne-600 h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900" data-testid="text-clone-title">
                      Clone Event
                    </h4>
                    <p className="text-gray-600 text-sm" data-testid="text-clone-description">
                      Reuse successful events
                    </p>
                  </div>
                </div>
                <Button className="w-full bg-champagne-100 text-champagne-700 hover:bg-champagne-200" data-testid="button-browse-templates">
                  Browse Templates
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column - Event Management */}
        <div className="space-y-6">
          {/* Active Events */}
          <ActiveEvents />

          {/* Upcoming Events */}
          <UpcomingEvents />

          {/* Recent Events */}
          <RecentEvents />

          {/* AI Insights */}
          <Card className="bg-gradient-to-br from-wine-50 to-champagne-50 border-wine-200" data-testid="card-ai-insights">
            <CardHeader className="border-b border-wine-200">
              <CardTitle className="text-wine-800 flex items-center" data-testid="text-insights-title">
                <Brain className="text-wine-600 mr-2 h-5 w-5" />
                AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {(stats?.insights || []).map((insight: string, index: number) => (
                  <div key={index} className="p-4 bg-white rounded-lg border border-wine-100" data-testid={`insight-${index}`}>
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-wine-100 rounded-full flex items-center justify-center mt-1">
                        {index === 0 ? (
                          <Lightbulb className="text-wine-600 h-4 w-4" />
                        ) : (
                          <TrendingUp className="text-champagne-600 h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1" data-testid={`text-insight-${index}-title`}>
                          {index === 0 ? "Engagement Tip" : "Performance Trend"}
                        </h4>
                        <p className="text-sm text-gray-600" data-testid={`text-insight-${index}-content`}>
                          {insight}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-6 right-6 md:hidden">
        <Button 
          className="w-14 h-14 rounded-full wine-gradient shadow-lg hover:shadow-xl" 
          data-testid="button-mobile-fab"
        >
          <Calendar className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
