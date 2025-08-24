import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Trophy, Play, ArrowRight, RotateCcw, Pause } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
// SimpleProgress component will be inline
const SimpleProgress = ({ value, className }: { value: number; className?: string }) => (
  <div className={`bg-gray-800 rounded-full overflow-hidden ${className}`}>
    <div 
      className="bg-current h-full transition-all duration-300 ease-out"
      style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
    />
  </div>
);

type GameState = "waiting" | "question" | "answer" | "complete";

export default function PresenterDemo() {
  const params = useParams();
  const eventId = params.eventId;
  
  const [gameState, setGameState] = useState<GameState>("waiting");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isTimerActive, setIsTimerActive] = useState(false);

  // Fetch event data
  const { data: event } = useQuery({
    queryKey: ['/api/events', eventId],
    enabled: !!eventId,
  });

  // Fetch questions
  const { data: questions } = useQuery({
    queryKey: ['/api/events', eventId, 'questions'],
    enabled: !!eventId,
  });

  // Fetch fun facts
  const { data: funFacts } = useQuery({
    queryKey: ['/api/events', eventId, 'fun-facts'],
    enabled: !!eventId,
  });

  const currentQuestion = questions?.[currentQuestionIndex];
  const progress = questions?.length ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  const timerProgress = (timeLeft / 30) * 100;

  // Timer logic
  useEffect(() => {
    if (!isTimerActive) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsTimerActive(false);
          setShowAnswer(true);
          setGameState("answer");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerActive, timeLeft]);

  const handleStartGame = () => {
    setGameState("question");
    setTimeLeft(30);
    setIsTimerActive(true);
    setShowAnswer(false);
  };

  const handleShowAnswer = () => {
    setShowAnswer(true);
    setGameState("answer");
    setIsTimerActive(false);
  };

  const handleNextQuestion = () => {
    if (questions?.length && currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setShowAnswer(false);
      setGameState("question");
      setTimeLeft(30);
      setIsTimerActive(true);
    } else {
      setGameState("complete");
      setIsTimerActive(false);
    }
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setShowAnswer(false);
    setGameState("waiting");
    setTimeLeft(30);
    setIsTimerActive(false);
  };

  const toggleTimer = () => {
    setIsTimerActive(!isTimerActive);
  };

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-wine-900 to-champagne-900 flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-4xl font-bold mb-4">Demo Presenter</h1>
          <p className="text-xl">Loading trivia preview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-wine-900 to-champagne-900 text-white overflow-hidden">
      {/* Header - Simplified for demo */}
      <div className="flex-shrink-0 p-4 lg:p-6 border-b border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="outline" className="bg-champagne-500/20 border-champagne-400 text-champagne-200">
                DEMO MODE
              </Badge>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-champagne-200 truncate">
                {event?.title || 'Demo Event'}
              </h1>
            </div>
            <p className="text-xs sm:text-sm lg:text-lg text-white/80 truncate">
              Preview Mode - No Scoring • Manual Control
            </p>
          </div>
          <div className="flex items-center space-x-4 flex-shrink-0">
            <div className="text-center">
              <div className="text-lg lg:text-xl font-bold text-champagne-300">{questions?.length || 0}</div>
              <div className="text-xs sm:text-sm text-white/60">Questions</div>
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3 lg:mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm text-white/60">Progress</span>
            <span className="text-xs sm:text-sm text-champagne-300">
              Question {currentQuestionIndex + 1} of {questions?.length || 0}
            </span>
          </div>
          <SimpleProgress value={progress} className="h-2 bg-white/20" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-6 overflow-hidden">
        
        {gameState === "waiting" && (
          <div className="text-center max-w-4xl">
            <div className="w-20 h-20 lg:w-24 lg:h-24 bg-champagne-500 rounded-full flex items-center justify-center mx-auto mb-6 lg:mb-8">
              <Play className="h-10 w-10 lg:h-12 lg:w-12 text-champagne-900" />
            </div>
            <h2 className="text-4xl lg:text-6xl xl:text-7xl font-bold mb-4 text-champagne-200">Demo Presenter</h2>
            <p className="text-lg lg:text-2xl xl:text-3xl text-white/80 mb-8">
              Manual trivia presentation for event preview and demonstration
            </p>
            <Button 
              onClick={handleStartGame}
              size="lg"
              className="bg-champagne-500 hover:bg-champagne-400 text-champagne-900 font-bold text-xl px-8 py-4"
            >
              <Play className="mr-2 h-6 w-6" />
              Start Demo
            </Button>
          </div>
        )}

        {gameState === "question" && currentQuestion && (
          <div className="w-full max-w-7xl h-full flex flex-col">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white flex-1 flex flex-col relative overflow-hidden">
              {currentQuestion.backgroundImageUrl && (
                <div 
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${currentQuestion.backgroundImageUrl})`,
                  }}
                >
                  <div className="absolute inset-0 bg-black/75"></div>
                </div>
              )}
              <CardHeader className="relative z-10">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl lg:text-3xl text-white drop-shadow-lg">
                    Question {currentQuestionIndex + 1}
                  </CardTitle>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className={`text-4xl font-bold ${
                        timeLeft <= 10 ? 'text-red-400 animate-pulse' : 
                        timeLeft <= 20 ? 'text-yellow-400' : 'text-green-400'
                      }`}>
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
              <CardContent className="flex-1 flex flex-col justify-center relative z-10">
                <div className="text-center">
                  <div className="bg-black/80 backdrop-blur-sm rounded-xl p-4 lg:p-6 mb-4 lg:mb-8 border border-white/20">
                    <h3 className={`font-bold leading-tight text-white ${
                      currentQuestion.question.length > 120 
                        ? 'text-lg lg:text-2xl xl:text-3xl' 
                        : currentQuestion.question.length > 80 
                        ? 'text-xl lg:text-3xl xl:text-4xl'
                        : 'text-2xl lg:text-4xl xl:text-5xl'
                    }`}>
                      {currentQuestion.question}
                    </h3>
                  </div>
                  
                  {currentQuestion.options && Array.isArray(currentQuestion.options) && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-6 max-w-6xl mx-auto">
                      {(currentQuestion.options as string[]).map((option: string, index: number) => (
                        <div
                          key={index}
                          className={`p-3 lg:p-6 rounded-lg border-2 ${
                            showAnswer && option === currentQuestion.correctAnswer
                              ? 'bg-green-600 border-green-400 text-white shadow-lg'
                              : 'bg-gray-800 border-gray-600 hover:bg-gray-700 text-white'
                          } transition-all duration-300`}
                        >
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-champagne-200 text-champagne-900 font-bold flex items-center justify-center mr-4">
                              {String.fromCharCode(65 + index)}
                            </div>
                            <span className="text-base lg:text-xl font-medium text-white">{option}</span>
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
          <div className="w-full max-w-7xl h-full flex flex-col space-y-4 lg:space-y-8">
            {/* Answer Section at Top */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
              <CardContent className="py-6 lg:py-8 h-full flex flex-col justify-center">
                <div className="grid grid-cols-2 gap-4 lg:gap-8 h-full">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 lg:w-20 lg:h-20 bg-green-500 rounded-full flex items-center justify-center mb-3 lg:mb-4">
                      <Star className="h-8 w-8 lg:h-10 lg:w-10 text-white" />
                    </div>
                    <h3 className="text-xl lg:text-2xl xl:text-3xl font-bold text-green-300">Correct Answer</h3>
                  </div>
                  <div className="flex items-center justify-center text-center">
                    <p className="text-xl lg:text-3xl xl:text-4xl font-bold text-white">
                      {currentQuestion.correctAnswer}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fun Fact Section at Bottom */}
            {funFacts && Array.isArray(funFacts) && funFacts.length > 0 && (
              <Card className="bg-champagne-600/20 backdrop-blur-sm border-champagne-400/30 text-white flex-1">
                <CardContent className="text-center py-4 lg:py-8 h-full flex flex-col justify-center">
                  <div className="w-12 h-12 lg:w-16 lg:h-16 bg-champagne-500 rounded-full flex items-center justify-center mx-auto mb-2 lg:mb-4">
                    <Star className="h-6 w-6 lg:h-8 lg:w-8 text-champagne-900" />
                  </div>
                  <h4 className="text-lg lg:text-2xl font-bold mb-2 lg:mb-4 text-champagne-200">Fun Fact!</h4>
                  {(() => {
                    const funFactArray = funFacts as any[];
                    const funFact = funFactArray[currentQuestionIndex % funFactArray.length];
                    return funFact ? (
                      <div>
                        <h5 className="text-base lg:text-xl font-semibold mb-2 lg:mb-3 text-champagne-100">{funFact.title}</h5>
                        <p className="text-sm lg:text-lg text-white/90 max-w-5xl mx-auto leading-relaxed">
                          {funFact.content}
                        </p>
                      </div>
                    ) : null;
                  })()}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {gameState === "complete" && (
          <div className="text-center max-w-4xl">
            <div className="w-20 h-20 lg:w-24 lg:h-24 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6 lg:mb-8">
              <Trophy className="h-10 w-10 lg:h-12 lg:w-12 text-yellow-900" />
            </div>
            <h2 className="text-4xl lg:text-6xl xl:text-7xl font-bold mb-4 text-champagne-200">Demo Complete!</h2>
            <p className="text-lg lg:text-2xl xl:text-3xl text-white/80 mb-8">
              Trivia preview finished. Ready to host your event with TriviaSpark?
            </p>
            <Button 
              onClick={handleRestart}
              size="lg"
              className="bg-champagne-500 hover:bg-champagne-400 text-champagne-900 font-bold text-xl px-8 py-4"
            >
              <RotateCcw className="mr-2 h-6 w-6" />
              Restart Demo
            </Button>
          </div>
        )}
      </div>

      {/* Control Panel - Fixed at bottom */}
      <div className="flex-shrink-0 bg-black/20 backdrop-blur-sm border-t border-white/20 p-4">
        <div className="flex items-center justify-center space-x-4 max-w-4xl mx-auto">
          {gameState === "question" && (
            <>
              <Button 
                onClick={toggleTimer}
                variant="outline"
                className="border-champagne-400 text-champagne-200 hover:bg-champagne-500/20"
              >
                {isTimerActive ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                {isTimerActive ? "Pause Timer" : "Resume Timer"}
              </Button>
              <Button 
                onClick={handleShowAnswer}
                className="bg-green-600 hover:bg-green-500 text-white"
              >
                <Star className="h-4 w-4 mr-2" />
                Show Answer
              </Button>
            </>
          )}
          
          {gameState === "answer" && (
            <Button 
              onClick={handleNextQuestion}
              className="bg-champagne-500 hover:bg-champagne-400 text-champagne-900"
            >
              {questions && currentQuestionIndex < questions.length - 1 ? (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Next Question
                </>
              ) : (
                <>
                  <Trophy className="h-4 w-4 mr-2" />
                  Finish Demo
                </>
              )}
            </Button>
          )}

          {(gameState === "question" || gameState === "answer") && (
            <Button 
              onClick={handleRestart}
              variant="outline"
              className="border-white/40 text-white/80 hover:bg-white/10"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restart
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}