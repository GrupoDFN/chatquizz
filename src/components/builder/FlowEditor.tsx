import { useCallback, useMemo, useEffect, useState, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
  MarkerType,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Flag, Plus, MessageSquare, HelpCircle, BarChart3, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ─── Types ─── */
interface OptionData {
  id: string;
  label: string;
  next_question_id: string | null;
}

interface QuestionData {
  id: string;
  text: string;
  order: number;
  is_start_node: boolean;
  pre_messages: string[];
  options: OptionData[];
  type?: string;
}

interface FlowEditorProps {
  quizId: string;
  questions: QuestionData[];
  selectedQuestionId: string | null;
  onSelectQuestion: (id: string | null) => void;
  onConnectionChange: (optionId: string, nextQuestionId: string | null) => void;
  onAddCard: (type: "question" | "text") => void;
  onOpenAnalysis: () => void;
  onOpenCongrats: () => void;
  showAnalysisCard?: boolean;
  showCongratsCard?: boolean;
  analysisTitle?: string;
  endScreenTitle?: string;
  activeEndPanel?: "analysis" | "congrats" | null;
}

/* ─── Special Node IDs ─── */
const END_NODE_ID = "__end__";
const ANALYSIS_NODE_ID = "__analysis__";
const CONGRATS_NODE_ID = "__congrats__";
const SPECIAL_IDS = [END_NODE_ID, ANALYSIS_NODE_ID, CONGRATS_NODE_ID];

interface PersistedSpecialEdge {
  id: string;
  source: string;
  sourceHandle?: string | null;
  target: string;
  targetHandle?: string | null;
}

interface PersistedFlowLayout {
  positions: Record<string, { x: number; y: number }>;
  specialEdges: PersistedSpecialEdge[];
}

const buildSpecialEdgeId = (connection: Connection) =>
  `special-${connection.source ?? ""}-${connection.sourceHandle ?? "default"}-${connection.target ?? ""}-${connection.targetHandle ?? "default"}`;

const createSpecialEdge = (connection: Connection): Edge | null => {
  if (!connection.source || !connection.target) return null;

  return {
    id: buildSpecialEdgeId(connection),
    source: connection.source,
    sourceHandle: connection.sourceHandle,
    target: connection.target,
    targetHandle: connection.targetHandle,
    type: "smoothstep",
    style: { stroke: "hsl(var(--accent-foreground) / 0.55)", strokeWidth: 2, strokeDasharray: "5 3" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--accent-foreground) / 0.55)" },
  };
};

function EndNode() {
  return (
    <div className="flex items-center gap-2 rounded-xl border-2 border-destructive/30 bg-destructive/10 px-5 py-3 shadow-sm">
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !bg-destructive/60 !border-destructive/40" />
      <Flag className="h-4 w-4 text-destructive" />
      <span className="text-sm font-semibold text-destructive">Fim do Quiz</span>
    </div>
  );
}

/* ─── Analysis Node ─── */
function AnalysisNode({ data, selected }: NodeProps) {
  const { label } = data as { label: string };
  return (
    <div className={`min-w-[200px] max-w-[260px] rounded-2xl border-2 bg-card shadow-md transition-all ${
      selected ? "border-orange-500 shadow-lg ring-2 ring-orange-500/20" : "border-orange-500/30"
    }`}>
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !bg-orange-500 !border-orange-500/40" />
      <div className="flex items-center gap-2 px-4 py-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
          <BarChart3 className="h-3 w-3" />
        </span>
        <p className="text-sm font-semibold text-foreground truncate flex-1">{label || "Análise"}</p>
        <span className="shrink-0 rounded-full bg-orange-500/15 px-2 py-0.5 text-[9px] font-bold text-orange-600 uppercase tracking-wider">
          Análise
        </span>
      </div>
      <div className="px-3 pb-3">
        <div className="relative flex items-center">
          <span className="text-[11px] text-muted-foreground pl-1 py-1">Próximo →</span>
          <Handle type="source" position={Position.Right} id="analysis-output" className="!h-3 !w-3 !bg-orange-500/70 !border-orange-500/30 !right-[-5px]" style={{ top: "auto" }} />
        </div>
      </div>
    </div>
  );
}

/* ─── Congrats Node ─── */
function CongratsNode({ data, selected }: NodeProps) {
  const { label } = data as { label: string };
  return (
    <div className={`min-w-[200px] max-w-[260px] rounded-2xl border-2 bg-card shadow-md transition-all ${
      selected ? "border-emerald-500 shadow-lg ring-2 ring-emerald-500/20" : "border-emerald-500/30"
    }`}>
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !bg-emerald-500 !border-emerald-500/40" />
      <div className="flex items-center gap-2 px-4 py-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
          <PartyPopper className="h-3 w-3" />
        </span>
        <p className="text-sm font-semibold text-foreground truncate flex-1">{label || "Resposta"}</p>
        <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold text-emerald-600 uppercase tracking-wider">
          Resposta
        </span>
      </div>
    </div>
  );
}

/* ─── Question Node ─── */
function QuestionNode({ data, selected }: NodeProps) {
  const { label, options, questionIndex, isStart } = data as {
    label: string;
    options: OptionData[];
    questionIndex: number;
    isStart: boolean;
  };

  return (
    <div
      className={`min-w-[220px] max-w-[280px] rounded-2xl border-2 bg-card shadow-md transition-all ${
        selected ? "border-primary shadow-lg ring-2 ring-primary/20" : "border-border"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !bg-primary !border-primary/40" />

      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
          {questionIndex + 1}
        </span>
        <p className="text-sm font-semibold text-foreground truncate flex-1">{label || "Sem texto"}</p>
        {isStart && (
          <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-bold text-primary uppercase tracking-wider">
            Início
          </span>
        )}
      </div>

      {/* Options */}
      <div className="px-3 pb-3 space-y-1">
        {options.map((opt) => (
          <div key={opt.id} className="relative flex items-center">
            <span className="text-[11px] text-muted-foreground truncate pl-1 pr-6 py-1 rounded bg-secondary/60 w-full block">
              {opt.label}
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id={opt.id}
              className="!h-2.5 !w-2.5 !bg-primary/70 !border-primary/30 !right-[-5px]"
              style={{ top: "auto" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Text Node ─── */
function TextNode({ data, selected }: NodeProps) {
  const { label, questionIndex } = data as {
    label: string;
    questionIndex: number;
  };

  return (
    <div
      className={`min-w-[220px] max-w-[280px] rounded-2xl border-2 bg-card shadow-md transition-all ${
        selected ? "border-accent shadow-lg ring-2 ring-accent/20" : "border-border"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-3.5 !w-3.5 !bg-primary !border-primary/40" />

      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground">
          <MessageSquare className="h-3 w-3" />
        </span>
        <p className="text-sm font-semibold text-foreground truncate flex-1">{label || "Mensagem"}</p>
        <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-bold text-accent-foreground/70 uppercase tracking-wider">
          Texto
        </span>
      </div>

      <div className="px-3 pb-3">
        <div className="relative flex items-center">
          <span className="text-[11px] text-muted-foreground pl-1 py-1">Próximo →</span>
          <Handle
            type="source"
            position={Position.Right}
            id="text-output"
            className="!h-3.5 !w-3.5 !bg-primary/80 !border-primary/40 !right-[-6px]"
            style={{ top: "auto" }}
          />
        </div>
      </div>
    </div>
  );
}

const nodeTypes = {
  question: QuestionNode,
  text: TextNode,
  end: EndNode,
  analysis: AnalysisNode,
  congrats: CongratsNode,
};

/* ─── Main Component ─── */
export default function FlowEditor({
  quizId,
  questions,
  selectedQuestionId,
  onSelectQuestion,
  onConnectionChange,
  onAddCard,
  onOpenAnalysis,
  onOpenCongrats,
  showAnalysisCard,
  showCongratsCard,
  analysisTitle,
  endScreenTitle,
  activeEndPanel,
}: FlowEditorProps) {
  const storageKey = useMemo(() => `chatquiz_flow_layout:${quizId}`, [quizId]);

  const persistedLayout = useMemo<PersistedFlowLayout>(() => {
    if (typeof window === "undefined") {
      return { positions: {}, specialEdges: [] };
    }

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return { positions: {}, specialEdges: [] };

      const parsed = JSON.parse(raw) as Partial<PersistedFlowLayout>;
      return {
        positions: parsed.positions ?? {},
        specialEdges: parsed.specialEdges ?? [],
      };
    } catch {
      return { positions: {}, specialEdges: [] };
    }
  }, [storageKey]);

  const positionsRef = useRef<Record<string, { x: number; y: number }>>(persistedLayout.positions);
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [specialEdges, setSpecialEdges] = useState<Edge[]>(() =>
    persistedLayout.specialEdges.map((edge) => ({
      ...edge,
      type: "smoothstep",
      style: { stroke: "hsl(var(--accent-foreground) / 0.55)", strokeWidth: 2, strokeDasharray: "5 3" },
      markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--accent-foreground) / 0.55)" },
    }))
  );

  const persistLayout = useCallback(
    (nextSpecialEdges: Edge[]) => {
      if (typeof window === "undefined") return;

      const payload: PersistedFlowLayout = {
        positions: positionsRef.current,
        specialEdges: nextSpecialEdges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          sourceHandle: edge.sourceHandle,
          target: edge.target,
          targetHandle: edge.targetHandle,
        })),
      };

      localStorage.setItem(storageKey, JSON.stringify(payload));
    },
    [storageKey]
  );

  const schedulePersist = useCallback(
    (nextSpecialEdges: Edge[]) => {
      if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
      persistTimeoutRef.current = setTimeout(() => {
        persistLayout(nextSpecialEdges);
      }, 200);
    },
    [persistLayout]
  );

  useEffect(() => {
    return () => {
      if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
    };
  }, []);

  /* Convert questions to nodes */
  const initialNodes = useMemo(() => {
    const getPos = (id: string, defaultPos: { x: number; y: number }) =>
      positionsRef.current[id] || defaultPos;

    const qNodes: Node[] = questions.map((q, i) => ({
      id: q.id,
      type: q.type === "text" ? "text" : "question",
      position: getPos(q.id, { x: i % 2 === 0 ? 100 : 400, y: i * 200 }),
      selected: q.id === selectedQuestionId,
      data: {
        label: q.text,
        options: q.options,
        questionIndex: i,
        isStart: q.is_start_node,
      },
    }));

    qNodes.push({
      id: END_NODE_ID,
      type: "end",
      position: getPos(END_NODE_ID, { x: 600, y: (questions.length - 1) * 200 + 100 }),
      data: {},
      selectable: false,
      draggable: true,
    });

    if (showAnalysisCard) {
      qNodes.push({
        id: ANALYSIS_NODE_ID,
        type: "analysis",
        position: getPos(ANALYSIS_NODE_ID, { x: 650, y: 0 }),
        selected: activeEndPanel === "analysis",
        data: { label: analysisTitle || "ANALISANDO" },
        draggable: true,
      });
    }

    if (showCongratsCard) {
      qNodes.push({
        id: CONGRATS_NODE_ID,
        type: "congrats",
        position: getPos(CONGRATS_NODE_ID, { x: 650, y: showAnalysisCard ? 150 : 0 }),
        selected: activeEndPanel === "congrats",
        data: { label: endScreenTitle || "Resposta Final" },
        draggable: true,
      });
    }

    return qNodes;
  }, [questions, selectedQuestionId, showAnalysisCard, showCongratsCard, analysisTitle, endScreenTitle, activeEndPanel]);

  /* Convert DB options to edges */
  const questionEdges = useMemo(() => {
    const dbEdges: Edge[] = [];
    questions.forEach((q) => {
      if (q.type === "text") {
        const firstOpt = q.options[0];
        if (firstOpt?.next_question_id) {
          dbEdges.push({
            id: `e-${firstOpt.id}`,
            source: q.id,
            sourceHandle: "text-output",
            target: firstOpt.next_question_id,
            type: "smoothstep",
            style: { stroke: "hsl(var(--primary))", strokeWidth: 2, strokeDasharray: "4 3" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--primary))" },
          });
        }
      } else {
        q.options.forEach((opt) => {
          if (!opt.next_question_id) return;
          dbEdges.push({
            id: `e-${opt.id}`,
            source: q.id,
            sourceHandle: opt.id,
            target: opt.next_question_id,
            type: "smoothstep",
            style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--primary))" },
          });
        });
      }
    });
    return dbEdges;
  }, [questions]);

  const validNodeIds = useMemo(() => new Set(initialNodes.map((node) => node.id)), [initialNodes]);

  const filteredSpecialEdges = useMemo(
    () => specialEdges.filter((edge) => validNodeIds.has(edge.source) && validNodeIds.has(edge.target)),
    [specialEdges, validNodeIds]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([...questionEdges, ...filteredSpecialEdges]);

  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChange(changes);
    },
    [onNodesChange]
  );

  useEffect(() => {
    setNodes((currentNodes) => {
      const currentPosMap: Record<string, { x: number; y: number }> = {};
      currentNodes.forEach((node) => {
        currentPosMap[node.id] = { ...node.position };
      });

      return initialNodes.map((node) => ({
        ...node,
        position: currentPosMap[node.id] || positionsRef.current[node.id] || node.position,
      }));
    });

    setEdges([...questionEdges, ...filteredSpecialEdges]);
  }, [initialNodes, questionEdges, filteredSpecialEdges, setNodes, setEdges]);

  useEffect(() => {
    setSpecialEdges((current) => {
      const next = current.filter((edge) => validNodeIds.has(edge.source) && validNodeIds.has(edge.target));
      if (next.length === current.length) return current;
      schedulePersist(next);
      return next;
    });
  }, [validNodeIds, schedulePersist]);

  useEffect(() => {
    nodes.forEach((node) => {
      positionsRef.current[node.id] = { ...node.position };
    });
    schedulePersist(filteredSpecialEdges);
  }, [nodes, filteredSpecialEdges, schedulePersist]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target || !connection.sourceHandle) return;

      const isSpecialConnection =
        SPECIAL_IDS.includes(connection.source) || SPECIAL_IDS.includes(connection.target);

      if (isSpecialConnection) {
        const specialEdge = createSpecialEdge(connection);
        if (!specialEdge) return;

        setSpecialEdges((current) => {
          const next = [...current.filter((edge) => edge.id !== specialEdge.id), specialEdge];
          schedulePersist(next);
          return next;
        });

        if (!SPECIAL_IDS.includes(connection.source)) {
          if (connection.sourceHandle === "text-output") {
            const sourceQuestion = questions.find((question) => question.id === connection.source);
            if (sourceQuestion?.options[0]) {
              onConnectionChange(sourceQuestion.options[0].id, null);
            }
          } else {
            onConnectionChange(connection.sourceHandle, null);
          }
        }

        return;
      }

      if (connection.sourceHandle === "text-output") {
        const sourceQuestion = questions.find((question) => question.id === connection.source);
        if (sourceQuestion?.options[0]) {
          onConnectionChange(sourceQuestion.options[0].id, connection.target);
        }
        return;
      }

      onConnectionChange(connection.sourceHandle, connection.target);
    },
    [onConnectionChange, questions, schedulePersist]
  );

  const onEdgeDelete = useCallback(
    (deletedEdges: Edge[]) => {
      const deletedSpecialIds = new Set(
        deletedEdges
          .filter(
            (edge) =>
              edge.id.startsWith("special-") || SPECIAL_IDS.includes(edge.source) || SPECIAL_IDS.includes(edge.target)
          )
          .map((edge) => edge.id)
      );

      if (deletedSpecialIds.size > 0) {
        setSpecialEdges((current) => {
          const next = current.filter((edge) => !deletedSpecialIds.has(edge.id));
          schedulePersist(next);
          return next;
        });
      }

      deletedEdges
        .filter(
          (edge) =>
            !(edge.id.startsWith("special-") || SPECIAL_IDS.includes(edge.source) || SPECIAL_IDS.includes(edge.target))
        )
        .forEach((edge) => {
          if (edge.sourceHandle === "text-output") {
            const sourceQuestion = questions.find((question) => question.id === edge.source);
            if (sourceQuestion?.options[0]) {
              onConnectionChange(sourceQuestion.options[0].id, null);
            }
          } else if (edge.sourceHandle) {
            onConnectionChange(edge.sourceHandle, null);
          }
        });
    },
    [onConnectionChange, questions, schedulePersist]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.id === END_NODE_ID) return;
      if (node.id === ANALYSIS_NODE_ID) {
        onOpenAnalysis();
        return;
      }
      if (node.id === CONGRATS_NODE_ID) {
        onOpenCongrats();
        return;
      }
      onSelectQuestion(node.id === selectedQuestionId ? null : node.id);
    },
    [onSelectQuestion, selectedQuestionId, onOpenAnalysis, onOpenCongrats]
  );

  const onPaneClick = useCallback(() => {
    onSelectQuestion(null);
  }, [onSelectQuestion]);

  return (
    <div className="h-full w-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgesDelete={onEdgeDelete}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        deleteKeyCode="Delete"
        className="bg-background"
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={1} className="!bg-muted/30" />
        <Controls className="!bg-card !border-border !shadow-md [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground hover:[&>button]:!bg-secondary" />
        <MiniMap
          className="!bg-card !border-border !shadow-md"
          nodeColor="hsl(var(--primary))"
          maskColor="hsl(var(--background) / 0.8)"
        />
      </ReactFlow>

      {/* Floating Add Button */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="rounded-full shadow-lg gap-2 px-5" size="sm">
              <Plus className="h-4 w-4" />
              Adicionar card
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" side="top" className="mb-2">
            <DropdownMenuItem onClick={() => onAddCard("question")} className="gap-2 cursor-pointer">
              <HelpCircle className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Card de Pergunta</p>
                <p className="text-[11px] text-muted-foreground">Com alternativas para o cliente escolher</p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddCard("text")} className="gap-2 cursor-pointer">
              <MessageSquare className="h-4 w-4 text-accent-foreground" />
              <div>
                <p className="text-sm font-medium">Card de Texto</p>
                <p className="text-[11px] text-muted-foreground">Enviar uma mensagem para a pessoa</p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenAnalysis} className="gap-2 cursor-pointer">
              <BarChart3 className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Card de Análise</p>
                <p className="text-[11px] text-muted-foreground">Tela de carregamento antes do resultado</p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenCongrats} className="gap-2 cursor-pointer">
              <PartyPopper className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-sm font-medium">Card de Resposta</p>
                <p className="text-[11px] text-muted-foreground">Tela final com resultado do quiz</p>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
