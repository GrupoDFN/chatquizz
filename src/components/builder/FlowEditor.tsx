import { useCallback, useMemo, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
  MarkerType,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Flag, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

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
}

interface FlowEditorProps {
  questions: QuestionData[];
  selectedQuestionId: string | null;
  onSelectQuestion: (id: string | null) => void;
  onConnectionChange: (optionId: string, nextQuestionId: string | null) => void;
  onAddQuestion: () => void;
}

/* ─── End Node ─── */
const END_NODE_ID = "__end__";

function EndNode() {
  return (
    <div className="flex items-center gap-2 rounded-xl border-2 border-destructive/30 bg-destructive/10 px-5 py-3 shadow-sm">
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !bg-destructive/60 !border-destructive/40" />
      <Flag className="h-4 w-4 text-destructive" />
      <span className="text-sm font-semibold text-destructive">Fim do Quiz</span>
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
        {options.map((opt, i) => (
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

const nodeTypes = {
  question: QuestionNode,
  end: EndNode,
};

/* ─── Main Component ─── */
export default function FlowEditor({
  questions,
  selectedQuestionId,
  onSelectQuestion,
  onConnectionChange,
  onAddQuestion,
}: FlowEditorProps) {
  /* Convert questions to nodes */
  const initialNodes = useMemo(() => {
    const qNodes: Node[] = questions.map((q, i) => ({
      id: q.id,
      type: "question",
      position: { x: i % 2 === 0 ? 100 : 400, y: i * 200 },
      selected: q.id === selectedQuestionId,
      data: {
        label: q.text,
        options: q.options,
        questionIndex: i,
        isStart: q.is_start_node,
      },
    }));

    // Always show the End node so users can freely connect to it
    qNodes.push({
      id: END_NODE_ID,
      type: "end",
      position: { x: 600, y: (questions.length - 1) * 200 + 100 },
      data: {},
      selectable: false,
      draggable: true,
    });

    return qNodes;
  }, [questions, selectedQuestionId]);

  /* Convert options to edges */
  const initialEdges = useMemo(() => {
    const edges: Edge[] = [];
    questions.forEach((q) => {
      q.options.forEach((opt) => {
        const target = opt.next_question_id || END_NODE_ID;
        // Only create edge to END if end node exists
        if (target === END_NODE_ID && !questions.some((qq) => qq.options.some((o) => !o.next_question_id))) {
          return;
        }
        edges.push({
          id: `e-${opt.id}`,
          source: q.id,
          sourceHandle: opt.id,
          target,
          type: "smoothstep",
          animated: !opt.next_question_id,
          style: {
            stroke: opt.next_question_id ? "hsl(var(--primary))" : "hsl(var(--destructive))",
            strokeWidth: 2,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: opt.next_question_id ? "hsl(var(--primary))" : "hsl(var(--destructive))",
          },
        });
      });
    });
    return edges;
  }, [questions]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync when questions change
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.sourceHandle || !connection.target) return;

      const optionId = connection.sourceHandle;
      const targetId = connection.target === END_NODE_ID ? null : connection.target;

      onConnectionChange(optionId, targetId);
    },
    [onConnectionChange]
  );

  const onEdgeDelete = useCallback(
    (deletedEdges: Edge[]) => {
      deletedEdges.forEach((edge) => {
        if (edge.sourceHandle) {
          onConnectionChange(edge.sourceHandle, null);
        }
      });
    },
    [onConnectionChange]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.id === END_NODE_ID) return;
      onSelectQuestion(node.id === selectedQuestionId ? null : node.id);
    },
    [onSelectQuestion, selectedQuestionId]
  );

  const onPaneClick = useCallback(() => {
    onSelectQuestion(null);
  }, [onSelectQuestion]);

  return (
    <div className="h-full w-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
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
        <Button
          onClick={onAddQuestion}
          className="rounded-full shadow-lg gap-2 px-5"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          Adicionar pergunta
        </Button>
      </div>
    </div>
  );
}
