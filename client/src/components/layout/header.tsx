import { Link } from "wouter";
import { Bell, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Header() {
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/">
            <div className="flex items-center space-x-4 cursor-pointer" data-testid="link-home">
              <div className="flex items-center">
                {/* TriviaSpark Logo */}
                <div className="w-10 h-10 wine-gradient rounded-lg flex items-center justify-center mr-3">
                  <Brain className="text-champagne-400 h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold wine-text" data-testid="text-logo-title">
                    TriviaSpark
                  </h1>
                  <p className="text-xs text-gray-500" data-testid="text-logo-tagline">
                    A WebSpark Solution
                  </p>
                </div>
              </div>
            </div>
          </Link>
          
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-600 hover:text-wine-700 transition-colors"
              data-testid="button-notifications"
            >
              <Bell className="h-5 w-5" />
            </Button>
            
            <Avatar className="w-8 h-8" data-testid="avatar-user">
              <AvatarFallback className="wine-gradient text-white text-sm font-medium">
                MH
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </nav>
  );
}
