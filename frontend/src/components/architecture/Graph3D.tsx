/**
 * @file Graph3D.tsx
 * @description Envoltura de react-force-graph-3d para dibujar nodos (proyectos
 * y servicios externos) y sus conexiones. La librería (con three.js) se carga
 * de forma diferida para no engordar el bundle principal.
 */
import {
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Spinner from "../common/Spinner";
import type { DiagramEdge, DiagramNode } from "../../types";

// Carga diferida: three.js + force-graph solo se descargan en esta vista
const ForceGraph3D = lazy(() => import("react-force-graph-3d"));

const STATUS_COLOR: Record<string, string> = {
  up: "#22c55e",
  down: "#ef4444",
  unknown: "#64748b",
};

interface GraphNodeObj {
  id: number;
  label: string;
  kind: DiagramNode["kind"];
  status: DiagramNode["status"];
  hasHealthcheck: boolean;
  color: string;
  fx?: number;
  fy?: number;
  fz?: number;
  x?: number;
  y?: number;
  z?: number;
}

interface Graph3DProps {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  highlightNodeId?: number | null;
  onNodeClick?: (nodeId: number) => void;
  onNodeDragEnd?: (
    nodeId: number,
    pos: { posX: number; posY: number; posZ: number },
  ) => void;
}

function nodeColor(n: DiagramNode, highlighted: boolean): string {
  if (highlighted) return "#f59e0b";
  if (n.color) return n.color;
  if (n.healthcheck_url) return STATUS_COLOR[n.status] ?? STATUS_COLOR.unknown;
  return n.kind === "project" ? "#3b82f6" : "#a855f7";
}

function Graph3D({
  nodes,
  edges,
  highlightNodeId,
  onNodeClick,
  onNodeDragEnd,
}: Graph3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () =>
      setSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const graphData = useMemo(() => {
    const gNodes: GraphNodeObj[] = nodes.map((n) => {
      const hasPos = n.pos_x !== 0 || n.pos_y !== 0 || n.pos_z !== 0;
      return {
        id: n.id,
        label: n.label,
        kind: n.kind,
        status: n.status,
        hasHealthcheck: !!n.healthcheck_url,
        color: nodeColor(n, n.id === highlightNodeId),
        // Pin nodes that already have a saved layout so it persists
        ...(hasPos ? { fx: n.pos_x, fy: n.pos_y, fz: n.pos_z } : {}),
      };
    });
    const links = edges.map((e) => ({
      source: e.source_node_id,
      target: e.target_node_id,
      label: e.label ?? undefined,
    }));
    return { nodes: gNodes, links };
  }, [nodes, edges, highlightNodeId]);

  return (
    <div ref={containerRef} className="h-full w-full">
      <Suspense
        fallback={
          <div className="flex h-full w-full items-center justify-center">
            <Spinner size="xl" />
          </div>
        }
      >
        <ForceGraph3D
          width={size.width}
          height={size.height}
          graphData={graphData}
          backgroundColor="#0b1120"
          nodeLabel={(n: GraphNodeObj) =>
            `${n.label}${n.hasHealthcheck ? ` · ${n.status}` : ""}`
          }
          nodeColor={(n: GraphNodeObj) => n.color}
          nodeOpacity={0.95}
          nodeRelSize={6}
          nodeResolution={16}
          linkColor={() => "#475569"}
          linkWidth={1.5}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={1}
          linkDirectionalParticles={1}
          linkDirectionalParticleWidth={1.5}
          onNodeClick={(n: GraphNodeObj) => onNodeClick?.(n.id)}
          onNodeDragEnd={(n: GraphNodeObj) => {
            // Pin the node where it was dropped and persist
            n.fx = n.x;
            n.fy = n.y;
            n.fz = n.z;
            onNodeDragEnd?.(n.id, {
              posX: n.x ?? 0,
              posY: n.y ?? 0,
              posZ: n.z ?? 0,
            });
          }}
        />
      </Suspense>
    </div>
  );
}

export default Graph3D;
