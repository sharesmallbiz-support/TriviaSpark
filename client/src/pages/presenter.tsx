import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// Custom progress component to avoid React hook issues
const SimpleProgress = ({ value, className }: { value: number; className?: string }) => (
  <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
    <div 
      className="bg-champagne-400 h-2 rounded-full transition-all duration-300"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);
import { Play, Pause, SkipForward, RotateCcw, Trophy, Users, Clock, ChevronRight, Star } from "lucide-react";

export default function PresenterView() {
  const [, params] = useRoute("/presenter/:id");
  const eventId = params?.id;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [gameState, setGameState] = useState<"waiting" | "question" | "answer" | "leaderboard">("waiting");
  const [timeLeft, setTimeLeft] = useState(30); // 30 seconds per question
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  
  const { data: event } = useQuery<any>({
    queryKey: ["/api/events", eventId],
    enabled: !!eventId,
  });

  const { data: questions } = useQuery<any[]>({
    queryKey: ["/api/events", eventId, "questions"],
    enabled: !!eventId,
  });

  const { data: participants } = useQuery<any[]>({
    queryKey: ["/api/events", eventId, "participants"],
    enabled: !!eventId,
  });

  const { data: teams } = useQuery<any[]>({
    queryKey: ["/api/events", eventId, "teams"],
    enabled: !!eventId,
  });

  const currentQuestion = questions?.[currentQuestionIndex];
  const progress = questions ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  const timerProgress = (timeLeft / 30) * 100;

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsTimerActive(false);
            if (autoAdvance && gameState === "question") {
              // Auto-advance to answer when timer expires
              setTimeout(() => handleShowAnswer(), 500);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timeLeft, autoAdvance, gameState]);

  // Mock leaderboard data - would be real in production
  const leaderboard = [
    { name: "SaraTeam", score: 450, rank: 1 },
    { name: "JohnTeam", score: 380, rank: 2 },
    { name: "Individual Players", score: 320, rank: 3 },
  ];

  const handleNextQuestion = () => {
    if (questions && currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setShowAnswer(false);
      setGameState("question");
      setTimeLeft(30);
      setIsTimerActive(true);
    } else {
      setGameState("leaderboard");
      setIsTimerActive(false);
    }
  };

  const handleShowAnswer = () => {
    setShowAnswer(true);
    setGameState("answer");
    setIsTimerActive(false);
  };

  const handleShowLeaderboard = () => {
    setGameState("leaderboard");
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setShowAnswer(false);
    setGameState("waiting");
    setTimeLeft(30);
    setIsTimerActive(false);
  };

  const handleStartGame = () => {
    setGameState("question");
    setTimeLeft(30);
    setIsTimerActive(true);
  };

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-wine-900 to-champagne-900 flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-4xl font-bold mb-4">Event Not Found</h1>
          <p className="text-xl">The presenter view could not be loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-wine-900 to-champagne-900 text-white">
      {/* Header */}
      <div className="p-6 border-b border-white/20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-champagne-200" data-testid="text-event-title">
              {event.title}
            </h1>
            <p className="text-xl text-white/80" data-testid="text-event-description">
              {event.description}
            </p>
          </div>
          <div className="flex items-center space-x-6 text-right">
            <div>
              <div className="text-2xl font-bold text-champagne-300">{participants?.length || 0}</div>
              <div className="text-sm text-white/60">Participants</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-champagne-300">{teams?.length || 0}</div>
              <div className="text-sm text-white/60">Teams</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-champagne-300">{questions?.length || 0}</div>
              <div className="text-sm text-white/60">Questions</div>
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Progress</span>
            <span className="text-sm text-champagne-300">
              Question {currentQuestionIndex + 1} of {questions?.length || 0}
            </span>
          </div>
          <SimpleProgress value={progress} className="h-2 bg-white/20" data-testid="progress-game" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        {gameState === "waiting" && (
          <div className="text-center py-20" data-testid="view-waiting">
            <div className="w-32 h-32 wine-gradient rounded-full flex items-center justify-center mx-auto mb-8">
              <Trophy className="h-16 w-16 text-white" />
            </div>
            <h2 className="text-6xl font-bold mb-4 text-champagne-200">Welcome to Trivia!</h2>
            <p className="text-2xl text-white/80 mb-8">Get ready for an amazing experience</p>
            <div className="text-lg text-champagne-300">
              {participants?.length || 0} participants ready to play
            </div>
          </div>
        )}

        {gameState === "question" && currentQuestion && (
          <div className="max-w-6xl mx-auto" data-testid="view-question">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-3xl">
                    Question {currentQuestionIndex + 1}
                  </CardTitle>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className={`text-4xl font-bold ${
                        timeLeft <= 10 ? 'text-red-400 animate-pulse' : 
                        timeLeft <= 20 ? 'text-yellow-400' : 'text-green-400'
                      }`} data-testid="text-timer">
                        {timeLeft}s
                      </div>
                      <div className="w-24">
                        <SimpleProgress 
                          value={timerProgress} 
                          className={`h-2 ${
                            timeLeft <= 10 ? 'bg-red-200' : 
                            timeLeft <= 20 ? 'bg-yellow-200' : 'bg-green-200'
                          }`} 
                        />
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-champagne-200 text-champagne-900 text-lg px-4 py-2">
                      {currentQuestion.difficulty}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="text-center">
                  <h3 className="text-4xl font-bold mb-8 leading-tight" data-testid="text-current-question">
                    {currentQuestion.question}
                  </h3>
                  
                  {currentQuestion.options && (
                    <div className="grid grid-cols-2 gap-6 max-w-4xl mx-auto">
                      {currentQuestion.options.map((option: string, index: number) => (
                        <div
                          key={index}
                          className={`p-6 rounded-lg border-2 ${
                            showAnswer && option === currentQuestion.correctAnswer
                              ? 'bg-green-500/20 border-green-400 text-green-200'
                              : 'bg-white/5 border-white/30 hover:bg-white/10'
                          } transition-all duration-300`}
                          data-testid={`option-${index}`}
                        >
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-champagne-200 text-champagne-900 font-bold flex items-center justify-center mr-4">
                              {String.fromCharCode(65 + index)}
                            </div>
                            <span className="text-xl font-medium">{option}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {gameState === "answer" && currentQuestion && (
          <div className="max-w-6xl mx-auto" data-testid="view-answer">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
              <CardContent className="text-center py-16">
                <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Star className="h-12 w-12 text-white" />
                </div>
                <h3 className="text-5xl font-bold mb-8 text-green-300">Correct Answer!</h3>
                <p className="text-3xl mb-8" data-testid="text-correct-answer">
                  {currentQuestion.correctAnswer}
                </p>
                {currentQuestion.explanation && (
                  <p className="text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
                    {currentQuestion.explanation}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {gameState === "leaderboard" && (
          <div className="max-w-4xl mx-auto" data-testid="view-leaderboard">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
              <CardHeader>
                <CardTitle className="text-4xl text-center flex items-center justify-center">
                  <Trophy className="mr-4 h-10 w-10 text-yellow-400" />
                  Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {leaderboard.map((entry, index) => (
                    <div
                      key={entry.name}
                      className={`flex items-center justify-between p-6 rounded-lg ${
                        index === 0 ? 'bg-yellow-500/20 border-2 border-yellow-400' :
                        index === 1 ? 'bg-gray-300/20 border-2 border-gray-400' :
                        index === 2 ? 'bg-amber-600/20 border-2 border-amber-600' :
                        'bg-white/5 border border-white/20'
                      }`}
                      data-testid={`leaderboard-entry-${index}`}
                    >
                      <div className="flex items-center">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl mr-4 ${
                          index === 0 ? 'bg-yellow-400 text-yellow-900' :
                          index === 1 ? 'bg-gray-400 text-gray-900' :
                          index === 2 ? 'bg-amber-600 text-amber-100' :
                          'bg-white/20 text-white'
                        }`}>
                          {entry.rank}
                        </div>
                        <span className="text-2xl font-semibold">{entry.name}</span>
                      </div>
                      <span className="text-3xl font-bold text-champagne-300">
                        {entry.score}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Control Panel */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm border-t border-white/20 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-center space-x-4">
          {gameState === "waiting" && (
            <>
              <Button
                onClick={handleStartGame}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg font-semibold"
                data-testid="button-start-game"
              >
                <Play className="mr-2 h-5 w-5" />
                Start Game
              </Button>
            </>
          )}

          {gameState === "question" && (
            <>
              <div className="flex items-center space-x-4">
                <div className={`text-2xl font-bold ${
                  timeLeft <= 10 ? 'text-red-400' : 
                  timeLeft <= 20 ? 'text-yellow-400' : 'text-white'
                }`}>
                  Time: {timeLeft}s
                </div>
                <Button
                  onClick={() => setIsTimerActive(!isTimerActive)}
                  className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700 border"
                  data-testid="button-toggle-timer"
                >
                  {isTimerActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
              </div>
              <Button
                onClick={handleShowAnswer}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-lg"
                data-testid="button-show-answer"
              >
                Show Answer
              </Button>
              <Button
                onClick={handleShowLeaderboard}
                className="bg-wine-700 hover:bg-wine-600 text-white border border-wine-500 px-6 py-3"
                data-testid="button-show-leaderboard"
              >
                <Trophy className="mr-2 h-4 w-4" />
                Show Leaderboard
              </Button>
            </>
          )}

          {gameState === "answer" && (
            <>
              <Button
                onClick={handleNextQuestion}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg font-semibold"
                disabled={!questions || currentQuestionIndex >= questions.length - 1}
                data-testid="button-next-question"
              >
                <ChevronRight className="mr-2 h-5 w-5" />
                {questions && currentQuestionIndex >= questions.length - 1 ? "Finish Game" : "Next Question"}
              </Button>
              <Button
                onClick={handleShowLeaderboard}
                className="bg-wine-700 hover:bg-wine-600 text-white border border-wine-500 px-6 py-3"
                data-testid="button-show-leaderboard-from-answer"
              >
                <Trophy className="mr-2 h-4 w-4" />
                Show Leaderboard
              </Button>
              <Button
                onClick={() => setAutoAdvance(!autoAdvance)}
                size="sm"
                className="bg-champagne-700 hover:bg-champagne-600 text-white border border-champagne-500"
                data-testid="button-toggle-auto"
              >
                {autoAdvance ? "Auto: ON" : "Auto: OFF"}
              </Button>
            </>
          )}

          {gameState === "leaderboard" && (
            <>
              {questions && currentQuestionIndex < questions.length - 1 ? (
                <Button
                  onClick={handleNextQuestion}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold border border-blue-500"
                  data-testid="button-continue-from-leaderboard"
                >
                  <ChevronRight className="mr-2 h-5 w-5" />
                  Continue Game
                </Button>
              ) : (
                <Button
                  onClick={handleRestart}
                  className="bg-wine-600 hover:bg-wine-700 text-white px-8 py-4 text-lg font-semibold border border-wine-500"
                  data-testid="button-restart-game"
                >
                  <RotateCcw className="mr-2 h-5 w-5" />
                  Game Complete
                </Button>
              )}
            </>
          )}

          {/* Always available controls */}
          <div className="flex items-center space-x-2 ml-8">
            <Button
              onClick={handleRestart}
              size="sm"
              className="bg-red-700 hover:bg-red-600 text-white border border-red-500"
              data-testid="button-reset"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleShowLeaderboard}
              size="sm"
              className="bg-yellow-700 hover:bg-yellow-600 text-white border border-yellow-500"
              data-testid="button-leaderboard"
            >
              <Trophy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}