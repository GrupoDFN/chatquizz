export interface ChatTheme {
  id: string;
  name: string;
  preview: { bg: string; bot: string; user: string; option: string };
  styles: {
    bg: string;
    bgPattern?: string; // CSS background for chat wallpaper pattern
    header: string;
    headerText: string;
    headerSub: string;
    botBubble: string;
    botText: string;
    userBubble: string;
    userText: string;
    optionBg: string;
    optionText: string;
    optionBorder: string;
    optionHover: string;
    footerBg: string;
    footerText: string;
    footerAccent: string;
    typingDot: string;
    avatarBg: string;
    avatarText: string;
    statusDot: string;
    borderColor: string;
  };
}

export const chatThemes: ChatTheme[] = [
  {
    id: "dark-social",
    name: "Dark Social",
    preview: { bg: "#1a1f2e", bot: "#3b82f6", user: "#2a2f3e", option: "#242938" },
    styles: {
      bg: "bg-[#111827]",
      bgPattern: "radial-gradient(circle, rgba(59,130,246,0.03) 1px, transparent 1px)",
      header: "bg-[#1a2035]",
      headerText: "text-white",
      headerSub: "text-white/50",
      botBubble: "bg-[#3b82f6]",
      botText: "text-white",
      userBubble: "bg-[#1f2937]",
      userText: "text-white",
      optionBg: "bg-[#1f2937]",
      optionText: "text-white",
      optionBorder: "border-white/10",
      optionHover: "hover:bg-[#2d3748]",
      footerBg: "bg-[#1a2035]",
      footerText: "text-white/40",
      footerAccent: "text-[#3b82f6]",
      typingDot: "bg-white/40",
      avatarBg: "bg-[#3b82f6]",
      avatarText: "text-white",
      statusDot: "bg-green-500 border-[#1a2035]",
      borderColor: "border-white/10",
    },
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    preview: { bg: "#0b141a", bot: "#005c4b", user: "#202c33", option: "#1f2c33" },
    styles: {
      bg: "bg-[#0b141a]",
      header: "bg-[#1f2c33]",
      headerText: "text-white",
      headerSub: "text-white/60",
      botBubble: "bg-[#005c4b]",
      botText: "text-white",
      userBubble: "bg-[#005c4b]",
      userText: "text-white",
      optionBg: "bg-[#1f2c33]",
      optionText: "text-white",
      optionBorder: "border-[#2a3942]",
      optionHover: "hover:bg-[#2a3942]",
      footerBg: "bg-[#1f2c33]",
      footerText: "text-white/40",
      footerAccent: "text-[#25d366]",
      typingDot: "bg-white/40",
      avatarBg: "bg-[#25d366]",
      avatarText: "text-white",
      statusDot: "bg-green-400 border-[#1f2c33]",
      borderColor: "border-[#2a3942]",
    },
  },
  {
    id: "light-clean",
    name: "Clean Light",
    preview: { bg: "#f7f8fa", bot: "#e8ecf1", user: "#4f46e5", option: "#f0f1f5" },
    styles: {
      bg: "bg-[#f7f8fa]",
      header: "bg-white",
      headerText: "text-gray-900",
      headerSub: "text-gray-400",
      botBubble: "bg-white",
      botText: "text-gray-800",
      userBubble: "bg-[#4f46e5]",
      userText: "text-white",
      optionBg: "bg-white",
      optionText: "text-gray-800",
      optionBorder: "border-gray-200",
      optionHover: "hover:bg-gray-50",
      footerBg: "bg-white",
      footerText: "text-gray-400",
      footerAccent: "text-[#4f46e5]",
      typingDot: "bg-gray-400",
      avatarBg: "bg-[#4f46e5]",
      avatarText: "text-white",
      statusDot: "bg-green-500 border-white",
      borderColor: "border-gray-200",
    },
  },
  {
    id: "gradient-purple",
    name: "Neon Purple",
    preview: { bg: "#13111c", bot: "#7c3aed", user: "#1e1b2e", option: "#1e1b2e" },
    styles: {
      bg: "bg-[#13111c]",
      header: "bg-[#1a1728]",
      headerText: "text-white",
      headerSub: "text-purple-300/50",
      botBubble: "bg-gradient-to-br from-[#7c3aed] to-[#a855f7]",
      botText: "text-white",
      userBubble: "bg-[#1e1b2e]",
      userText: "text-white",
      optionBg: "bg-[#1e1b2e]",
      optionText: "text-white",
      optionBorder: "border-purple-500/20",
      optionHover: "hover:bg-[#2a2540]",
      footerBg: "bg-[#1a1728]",
      footerText: "text-purple-300/30",
      footerAccent: "text-purple-400",
      typingDot: "bg-purple-300/40",
      avatarBg: "bg-gradient-to-br from-[#7c3aed] to-[#a855f7]",
      avatarText: "text-white",
      statusDot: "bg-green-400 border-[#1a1728]",
      borderColor: "border-purple-500/10",
    },
  },
  {
    id: "warm-sunset",
    name: "Warm Sunset",
    preview: { bg: "#1a1210", bot: "#ea580c", user: "#231a14", option: "#231a14" },
    styles: {
      bg: "bg-[#1a1210]",
      header: "bg-[#231a14]",
      headerText: "text-white",
      headerSub: "text-orange-200/50",
      botBubble: "bg-gradient-to-br from-[#ea580c] to-[#f59e0b]",
      botText: "text-white",
      userBubble: "bg-[#2a1f17]",
      userText: "text-white",
      optionBg: "bg-[#2a1f17]",
      optionText: "text-white",
      optionBorder: "border-orange-500/20",
      optionHover: "hover:bg-[#352a20]",
      footerBg: "bg-[#231a14]",
      footerText: "text-orange-200/30",
      footerAccent: "text-orange-400",
      typingDot: "bg-orange-300/40",
      avatarBg: "bg-gradient-to-br from-[#ea580c] to-[#f59e0b]",
      avatarText: "text-white",
      statusDot: "bg-green-400 border-[#231a14]",
      borderColor: "border-orange-500/10",
    },
  },
];

export function getThemeById(id: string): ChatTheme {
  return chatThemes.find((t) => t.id === id) || chatThemes[0];
}
