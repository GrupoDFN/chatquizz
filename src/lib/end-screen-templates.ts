export interface EndScreenTemplate {
  id: string;
  name: string;
  preview: { bg: string; accent: string };
  styles: {
    cardBg: string;
    cardBorder: string;
    titleColor: string;
    subtitleColor: string;
    iconBg: string;
    iconColor: string;
    accentColor: string;
    decorColor: string;
  };
}

export const endScreenTemplates: EndScreenTemplate[] = [
  {
    id: "congrats-green",
    name: "Parabéns Verde",
    preview: { bg: "#0a2e1a", accent: "#10b981" },
    styles: {
      cardBg: "bg-gradient-to-b from-[#0a2e1a] to-[#0d3520]",
      cardBorder: "border-emerald-500/30",
      titleColor: "text-white",
      subtitleColor: "text-emerald-300",
      iconBg: "bg-gradient-to-br from-emerald-400 to-emerald-600",
      iconColor: "text-white",
      accentColor: "text-yellow-400",
      decorColor: "text-emerald-400/40",
    },
  },
  {
    id: "congrats-blue",
    name: "Sucesso Azul",
    preview: { bg: "#0c1929", accent: "#3b82f6" },
    styles: {
      cardBg: "bg-gradient-to-b from-[#0c1929] to-[#0f2440]",
      cardBorder: "border-blue-500/30",
      titleColor: "text-white",
      subtitleColor: "text-blue-300",
      iconBg: "bg-gradient-to-br from-blue-400 to-blue-600",
      iconColor: "text-white",
      accentColor: "text-amber-400",
      decorColor: "text-blue-400/40",
    },
  },
  {
    id: "congrats-purple",
    name: "Exclusivo Roxo",
    preview: { bg: "#1a1030", accent: "#a855f7" },
    styles: {
      cardBg: "bg-gradient-to-b from-[#1a1030] to-[#22143d]",
      cardBorder: "border-purple-500/30",
      titleColor: "text-white",
      subtitleColor: "text-purple-300",
      iconBg: "bg-gradient-to-br from-purple-400 to-purple-600",
      iconColor: "text-white",
      accentColor: "text-yellow-400",
      decorColor: "text-purple-400/40",
    },
  },
  {
    id: "congrats-gold",
    name: "Premium Gold",
    preview: { bg: "#1a1508", accent: "#f59e0b" },
    styles: {
      cardBg: "bg-gradient-to-b from-[#1a1508] to-[#241e0d]",
      cardBorder: "border-amber-500/30",
      titleColor: "text-white",
      subtitleColor: "text-amber-200",
      iconBg: "bg-gradient-to-br from-amber-400 to-amber-600",
      iconColor: "text-white",
      accentColor: "text-amber-400",
      decorColor: "text-amber-400/40",
    },
  },
  {
    id: "congrats-pink",
    name: "Vibrante Rosa",
    preview: { bg: "#1a0a18", accent: "#ec4899" },
    styles: {
      cardBg: "bg-gradient-to-b from-[#1a0a18] to-[#250f22]",
      cardBorder: "border-pink-500/30",
      titleColor: "text-white",
      subtitleColor: "text-pink-300",
      iconBg: "bg-gradient-to-br from-pink-400 to-pink-600",
      iconColor: "text-white",
      accentColor: "text-yellow-400",
      decorColor: "text-pink-400/40",
    },
  },
];

export function getEndScreenTemplate(id: string): EndScreenTemplate {
  return endScreenTemplates.find((t) => t.id === id) || endScreenTemplates[0];
}
