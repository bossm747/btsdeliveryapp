import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { MessageCircle, X, Sparkles, Minimize2 } from "lucide-react";
import AIChatInterface, { Message } from "./ai-chat-interface";

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();

  // Persist messages at the widget level so they survive dialog open/close
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Magandang araw po! Ako po ang BTS AI Assistant. Ano po ang maitutulong ko sa inyo?",
      timestamp: new Date(),
      agent: "general",
    },
  ]);

  // Determine user role for the chat interface
  const userRole = user?.role as "customer" | "rider" | "vendor" | "admin" | undefined;

  // Get rider ID for rider users
  const riderId = userRole === "rider" ? user?.id?.toString() : undefined;

  // Handle messages update from chat interface
  const handleMessagesChange = useCallback((newMessages: Message[]) => {
    setMessages(newMessages);
  }, []);

  return (
    <>
      {/* Floating Chat Button - hidden when chat is open */}
      <div
        className={`fixed bottom-20 right-4 z-50 md:bottom-6 md:right-6 transition-all duration-300 ${
          isOpen ? "opacity-0 pointer-events-none scale-75" : "opacity-100 scale-100"
        }`}
      >
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all duration-300 hover:scale-110 active:scale-95"
          aria-label="Open AI Assistant"
        >
          <div className="relative">
            <MessageCircle className="h-6 w-6" />
            <Sparkles className="h-3 w-3 absolute -top-1 -right-1 text-yellow-300 animate-pulse" />
          </div>
        </Button>

        {/* Unread indicator if there are messages beyond welcome */}
        {messages.length > 1 && (
          <span className="absolute -top-1 -left-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold animate-bounce">
            {messages.length - 1 > 9 ? "9+" : messages.length - 1}
          </span>
        )}
      </div>

      {/* Chat Panel - Responsive full-screen on mobile, floating on desktop */}
      <div
        className={`fixed z-50 transition-all duration-300 ease-out ${
          isOpen
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-full pointer-events-none"
        }
        inset-0 md:inset-auto
        md:bottom-6 md:right-6
        md:w-[400px] lg:w-[440px]
        md:h-[600px] lg:h-[650px]
        md:max-h-[85vh]
        md:rounded-2xl md:shadow-2xl
        `}
      >
        {/* Backdrop for mobile */}
        <div
          className="absolute inset-0 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
        />

        {/* Chat Container */}
        <div className="relative h-full w-full bg-background flex flex-col md:rounded-2xl overflow-hidden border-0 md:border shadow-none md:shadow-2xl">
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-base">BTS AI Assistant</h2>
                <p className="text-xs text-white/80">
                  {isAuthenticated ? "Online - Ready to help" : "Login for full features"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-white hover:bg-white/20 hover:text-white"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-5 w-5 md:hidden" />
              <Minimize2 className="h-5 w-5 hidden md:block" />
            </Button>
          </div>

          {/* Chat Interface */}
          <div className="flex-1 overflow-hidden">
            <AIChatInterface
              userRole={userRole}
              riderId={riderId}
              messages={messages}
              onMessagesChange={handleMessagesChange}
              className="h-full border-0 shadow-none rounded-none"
              showHeader={false}
              placeholder={
                isAuthenticated
                  ? "Ano po ang maitutulong ko?"
                  : "Mag-login po para sa full features..."
              }
            />
          </div>
        </div>
      </div>
    </>
  );
}
