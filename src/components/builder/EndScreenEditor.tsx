import { useState } from "react";
import { Monitor, Type, ToggleLeft, CheckCircle2, Crown, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { endScreenTemplates, getEndScreenTemplate, EndScreenTemplate } from "@/lib/end-screen-templates";
import { motion } from "framer-motion";

interface EndScreenConfig {
  end_screen_template: string;
  end_screen_title: string;
  end_screen_subtitle: string;
  analysis_title: string;
  analysis_subtitle: string;
  show_analysis_card: boolean;
  show_congrats_card: boolean;
}

interface EndScreenEditorProps {
  config: EndScreenConfig;
  onChange: (key: keyof EndScreenConfig, value: string | boolean) => void;
  showOnly?: "template";
}

const MiniCongratsPreview = ({ template }: { template: EndScreenTemplate }) => (
  <div className={`rounded-lg p-3 border ${template.styles.cardBg} ${template.styles.cardBorder}`}>
    <div className="flex flex-col items-center gap-1">
      <Crown className={`h-4 w-4 ${template.styles.accentColor}`} />
      <div className={`h-6 w-6 rounded-full ${template.styles.iconBg} flex items-center justify-center`}>
        <CheckCircle2 className={`h-3.5 w-3.5 ${template.styles.iconColor}`} />
      </div>
      <p className={`text-[9px] font-bold ${template.styles.titleColor}`}>PARABÉNS!</p>
    </div>
  </div>
);

const EndScreenEditor = ({ config, onChange, showOnly }: EndScreenEditorProps) => {
  const currentTemplate = getEndScreenTemplate(config.end_screen_template);

  if (showOnly === "template") {
    return (
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Template visual</label>
        <div className="grid grid-cols-3 gap-2">
          {endScreenTemplates.map((tmpl) => (
            <button
              key={tmpl.id}
              onClick={() => onChange("end_screen_template", tmpl.id)}
              className={`rounded-lg p-1 transition-all border-2 ${
                config.end_screen_template === tmpl.id
                  ? "border-primary ring-1 ring-primary/30"
                  : "border-transparent hover:border-border"
              }`}
            >
              <MiniCongratsPreview template={tmpl} />
              <p className="mt-1 text-[9px] text-center text-muted-foreground truncate">{tmpl.name}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      {/* Toggle cards */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.show_analysis_card}
            onChange={(e) => onChange("show_analysis_card", e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-sm text-foreground">Mostrar card de análise</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.show_congrats_card}
            onChange={(e) => onChange("show_congrats_card", e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-sm text-foreground">Mostrar card de parabéns</span>
        </label>
      </div>

      {/* Analysis card config */}
      {config.show_analysis_card && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Monitor className="h-3.5 w-3.5" />
            Card de Análise
          </label>
          <input
            type="text"
            value={config.analysis_title}
            onChange={(e) => onChange("analysis_title", e.target.value)}
            placeholder="Título da análise..."
            className="w-full rounded-inner bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="text"
            value={config.analysis_subtitle}
            onChange={(e) => onChange("analysis_subtitle", e.target.value)}
            placeholder="Subtítulo da análise..."
            className="w-full rounded-inner bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      )}

      {/* Congrats card config */}
      {config.show_congrats_card && (
        <div className="space-y-3">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Type className="h-3.5 w-3.5" />
            Card de Parabéns
          </label>
          <input
            type="text"
            value={config.end_screen_title}
            onChange={(e) => onChange("end_screen_title", e.target.value)}
            placeholder="Título do card..."
            className="w-full rounded-inner bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="text"
            value={config.end_screen_subtitle}
            onChange={(e) => onChange("end_screen_subtitle", e.target.value)}
            placeholder="Subtítulo do card..."
            className="w-full rounded-inner bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
          />

          {/* Template picker */}
          <label className="text-xs font-medium text-muted-foreground">Template visual</label>
          <div className="grid grid-cols-3 gap-2">
            {endScreenTemplates.map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => onChange("end_screen_template", tmpl.id)}
                className={`rounded-lg p-1 transition-all border-2 ${
                  config.end_screen_template === tmpl.id
                    ? "border-primary ring-1 ring-primary/30"
                    : "border-transparent hover:border-border"
                }`}
              >
                <MiniCongratsPreview template={tmpl} />
                <p className="mt-1 text-[9px] text-center text-muted-foreground truncate">{tmpl.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EndScreenEditor;
