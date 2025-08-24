import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Brain, LogIn } from "lucide-react";
import { useLocation } from "wouter";

type LoginForm = {
  username: string;
  password: string;
};

export default function Login() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
          credentials: 'include',
        });
        
        // Check if response has content
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Server returned non-JSON response");
        }
        
        const responseText = await response.text();
        if (!responseText) {
          throw new Error("Empty response from server");
        }
        
        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (parseError) {
          console.error("JSON parse error:", parseError);
          console.error("Response text:", responseText);
          throw new Error("Invalid JSON response from server");
        }
        
        if (!response.ok) {
          throw new Error(responseData.error || "Login failed");
        }
        
        return responseData;
      } catch (error) {
        console.error("Login request error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Welcome back!",
        description: `Logged in as ${data.user.fullName}`,
      });
      setLocation("/dashboard");
    },
    onError: (error) => {
      toast({
        title: "Login Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsLoading(false);
    }
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-wine-50 to-champagne-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="trivia-card shadow-2xl" data-testid="card-login">
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 wine-gradient rounded-2xl flex items-center justify-center mx-auto">
              <Brain className="text-champagne-400 h-8 w-8" />
            </div>
            <div>
              <CardTitle className="text-2xl wine-text mb-2" data-testid="text-login-title">
                Welcome to TriviaSpark
              </CardTitle>
              <p className="text-gray-600" data-testid="text-login-subtitle">
                Sign in to manage your trivia events
              </p>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="username" data-testid="label-username">
                  Username
                </Label>
                <Input
                  id="username"
                  {...register("username", { required: "Username is required" })}
                  placeholder="Enter your username"
                  className={`mt-1 ${errors.username ? "border-red-500" : "focus:ring-2 focus:ring-wine-500 focus:border-transparent"}`}
                  data-testid="input-username"
                  autoComplete="username"
                />
                {errors.username && (
                  <p className="text-sm text-red-500 mt-1" data-testid="error-username">
                    {errors.username.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="password" data-testid="label-password">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  {...register("password", { required: "Password is required" })}
                  placeholder="Enter your password"
                  className={`mt-1 ${errors.password ? "border-red-500" : "focus:ring-2 focus:ring-wine-500 focus:border-transparent"}`}
                  data-testid="input-password"
                  autoComplete="current-password"
                />
                {errors.password && (
                  <p className="text-sm text-red-500 mt-1" data-testid="error-password">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full trivia-button-primary mt-6"
                data-testid="button-login"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            <div className="text-center mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600" data-testid="text-demo-info">
                Demo credentials: <span className="font-mono bg-gray-100 px-2 py-1 rounded">mark / mark123</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="text-wine-700 hover:text-wine-800"
            data-testid="button-back-home"
          >
            ← Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}