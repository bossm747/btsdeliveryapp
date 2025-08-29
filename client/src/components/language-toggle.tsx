import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, Check } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  const languages = [
    { code: "tl" as const, name: "Tagalog", flag: "🇵🇭" },
    { code: "en" as const, name: "English", flag: "🇬🇧" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="relative"
          data-testid="button-language-toggle"
        >
          <Globe className="h-5 w-5" />
          <span className="sr-only">Change language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className="flex items-center justify-between cursor-pointer"
            data-testid={`option-${lang.code}`}
          >
            <span className="flex items-center gap-2">
              <span className="text-xl">{lang.flag}</span>
              <span>{lang.name}</span>
            </span>
            {language === lang.code && (
              <Check className="h-4 w-4 text-green-600" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}