import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageCircle, Send, Bot, User, X, HelpCircle,
  Package, Clock, MapPin, Phone 
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
  suggestedActions?: string[];
}

interface ChatbotProps {
  orderId?: string;
  orderStatus?: string;
  customerName?: string;
}

export default function AIChatbot({ orderId, orderStatus, customerName }: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Kumusta po! Ako si BTS Assistant. Paano ko po kayo matutulungan ngayon?",
      sender: "bot",
      timestamp: new Date(),
      suggestedActions: [
        "Track my order",
        "Where is my rider?",
        "Cancel order",
        "Restaurant contact"
      ]
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await apiRequest("POST", "/api/ai/chat-support", {
        query: input,
        orderId,
        orderStatus,
        customerName: customerName || "Customer"
      });
      
      const data = await response.json();

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response || "Pasensya na po, may problem. Please try again.",
        sender: "bot",
        timestamp: new Date(),
        suggestedActions: data.suggestedActions
      };

      setMessages(prev => [...prev, botMessage]);

      // If human support is required, show a toast
      if (data.requiresHumanSupport) {
        toast({
          title: "Connecting to Support",
          description: "A human agent will assist you shortly.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Pasensya na po, may technical issue. Please try again.",
        sender: "bot",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestedAction = (action: string) => {
    setInput(action);
    handleSend();
  };

  const quickActions = [
    { icon: Package, label: "Track Order", query: "Where is my order?" },
    { icon: Clock, label: "Delivery Time", query: "When will my order arrive?" },
    { icon: MapPin, label: "Rider Location", query: "Where is my rider now?" },
    { icon: Phone, label: "Contact", query: "How can I contact the restaurant?" }
  ];

  return (
    <>
      {/* Chat Toggle Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 rounded-full h-14 w-14 shadow-lg bg-orange-500 hover:bg-orange-600 z-50"
          data-testid="button-chat-open"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-4 right-4 w-96 h-[600px] shadow-2xl z-50 flex flex-col">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                <CardTitle className="text-lg">BTS Support</CardTitle>
                <Badge variant="secondary" className="bg-green-500 text-white text-xs">
                  AI-Powered
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-orange-700"
                data-testid="button-chat-close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`flex gap-2 max-w-[80%] ${message.sender === "user" ? "flex-row-reverse" : ""}`}>
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        message.sender === "user" ? "bg-blue-500" : "bg-orange-500"
                      }`}>
                        {message.sender === "user" ? (
                          <User className="h-4 w-4 text-white" />
                        ) : (
                          <Bot className="h-4 w-4 text-white" />
                        )}
                      </div>
                      <div>
                        <div className={`rounded-lg p-3 ${
                          message.sender === "user" 
                            ? "bg-blue-500 text-white" 
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          <p className="text-sm">{message.text}</p>
                        </div>
                        {message.suggestedActions && message.suggestedActions.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {message.suggestedActions.map((action, index) => (
                              <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                onClick={() => handleSuggestedAction(action)}
                                className="text-xs"
                                data-testid={`button-action-${index}`}
                              >
                                {action}
                              </Button>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="flex gap-2">
                      <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      <div className="bg-gray-100 rounded-lg p-3">
                        <div className="flex gap-1">
                          <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></span>
                          <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                          <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce delay-200"></span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Quick Actions */}
            <div className="p-3 border-t">
              <div className="flex gap-2 mb-3 overflow-x-auto">
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setInput(action.query);
                      handleSend();
                    }}
                    className="flex items-center gap-1 whitespace-nowrap"
                    data-testid={`button-quick-${index}`}
                  >
                    <action.icon className="h-3 w-3" />
                    <span className="text-xs">{action.label}</span>
                  </Button>
                ))}
              </div>

              {/* Input Area */}
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Type your message..."
                  className="flex-1"
                  disabled={isTyping}
                  data-testid="input-message"
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="bg-orange-500 hover:bg-orange-600"
                  data-testid="button-send"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Indicator when closed */}
      {!isOpen && (
        <div className="fixed bottom-20 right-4 bg-white rounded-lg shadow-lg p-2 animate-pulse z-40">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-orange-500" />
            <span className="text-xs text-gray-700">Need help? Click to chat!</span>
          </div>
        </div>
      )}
    </>
  );
}