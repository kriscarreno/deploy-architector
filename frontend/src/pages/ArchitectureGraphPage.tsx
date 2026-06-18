/**
 * @file ArchitectureGraphPage.tsx
 * @description Editor del diagrama 3D: nodos (proyectos/servicios externos),
 * conexiones, modo "conectar", exportar/importar y estado de healthchecks
 * (refrescado por polling).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Graph3D from "../components/architecture/Graph3D";
import NodePanel from "../components/architecture/NodePanel";
import AddNodeModal from "../components/architecture/AddNodeModal";
import Button from "../components/common/Button";
import Spinner from "../components/common/Spinner";
import useToast from "../hooks/useToast";
import { getErrorMessage } from "../utils/errorHandler";
import diagramService, { type NodePayload } from "../services/diagramService";
import projectService from "../services/projectService";
import type { DiagramWithGraph, Project } from "../types";

const STATUS_POLL_MS = 15_000;

function ArchitectureGraphPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toastError, toastSuccess } = useToast();

  const [diagram, setDiagram] = useState<DiagramWithGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectFrom, setConnectFrom] = useState<number | null>(null);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [d, ps] = await Promise.all([
          diagramService.getById(id as string),
          projectService.getAll(),
        ]);
        if (!cancelled) {
          setDiagram(d);
          setProjects(ps);
        }
      } catch (err) {
        if (!cancelled) toastError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, toastError]);

  // Poll healthcheck statuses and merge them into existing nodes (keeps layout)
  useEffect(() => {
    if (!id) return;
    const timer = setInterval(async () => {
      try {
        const fresh = await diagramService.getById(id);
        setDiagram((prev) => {
          if (!prev) return fresh;
          const statusById = new Map(
            fresh.nodes.map((n) => [n.id, n]),
          );
          return {
            ...prev,
            nodes: prev.nodes.map((n) => {
              const f = statusById.get(n.id);
              return f
                ? { ...n, status: f.status, last_checked_at: f.last_checked_at }
                : n;
            }),
          };
        });
      } catch {
        /* silent — transient polling errors */
      }
    }, STATUS_POLL_MS);
    return () => clearInterval(timer);
  }, [id]);

  const selectedNode = useMemo(
    () => diagram?.nodes.find((n) => n.id === selectedNodeId) ?? null,
    [diagram, selectedNodeId],
  );

  // ── Mutations ───────────────────────────────────────────────────────────

  const addNode = async (payload: NodePayload) => {
    try {
      const node = await diagramService.addNode(id as string, payload);
      setDiagram((prev) =>
        prev ? { ...prev, nodes: [...prev.nodes, node] } : prev,
      );
      toastSuccess("Nodo añadido");
    } catch (err) {
      toastError(getErrorMessage(err));
      throw err;
    }
  };

  const saveNode = async (nodeId: number, payload: Partial<NodePayload>) => {
    try {
      const updated = await diagramService.updateNode(
        id as string,
        nodeId,
        payload,
      );
      setDiagram((prev) =>
        prev
          ? {
              ...prev,
              nodes: prev.nodes.map((n) => (n.id === nodeId ? updated : n)),
            }
          : prev,
      );
      toastSuccess("Nodo actualizado");
    } catch (err) {
      toastError(getErrorMessage(err));
    }
  };

  const deleteNode = async (nodeId: number) => {
    try {
      await diagramService.deleteNode(id as string, nodeId);
      setDiagram((prev) =>
        prev
          ? {
              ...prev,
              nodes: prev.nodes.filter((n) => n.id !== nodeId),
              edges: prev.edges.filter(
                (e) =>
                  e.source_node_id !== nodeId && e.target_node_id !== nodeId,
              ),
            }
          : prev,
      );
      setSelectedNodeId(null);
      toastSuccess("Nodo eliminado");
    } catch (err) {
      toastError(getErrorMessage(err));
    }
  };

  // Debounced position persistence
  const layoutQueue = useRef<
    Map<number, { id: number; posX: number; posY: number; posZ: number }>
  >(new Map());
  const layoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onNodeDragEnd = useCallback(
    (nodeId: number, pos: { posX: number; posY: number; posZ: number }) => {
      layoutQueue.current.set(nodeId, { id: nodeId, ...pos });
      // Reflect in local state so re-renders keep the dropped position
      setDiagram((prev) =>
        prev
          ? {
              ...prev,
              nodes: prev.nodes.map((n) =>
                n.id === nodeId
                  ? { ...n, pos_x: pos.posX, pos_y: pos.posY, pos_z: pos.posZ }
                  : n,
              ),
            }
          : prev,
      );
      if (layoutTimer.current) clearTimeout(layoutTimer.current);
      layoutTimer.current = setTimeout(async () => {
        const positions = Array.from(layoutQueue.current.values());
        layoutQueue.current.clear();
        try {
          await diagramService.saveLayout(id as string, positions);
        } catch {
          /* best-effort */
        }
      }, 800);
    },
    [id],
  );

  const createEdge = (source: number, target: number) => {
    diagramService
      .addEdge(id as string, { sourceNodeId: source, targetNodeId: target })
      .then((edge) => {
        setDiagram((prev) =>
          prev ? { ...prev, edges: [...prev.edges, edge] } : prev,
        );
        toastSuccess("Conexión creada");
      })
      .catch((err) => toastError(getErrorMessage(err)));
  };

  const handleNodeClick = (nodeId: number) => {
    if (connecting) {
      if (connectFrom == null) {
        // First click: pick the source
        setConnectFrom(nodeId);
      } else if (connectFrom === nodeId) {
        // Clicked the source again: deselect it
        setConnectFrom(null);
      } else {
        // Second click: create the edge and chain into a new connection
        createEdge(connectFrom, nodeId);
        setConnectFrom(null);
      }
      return;
    }
    setSelectedNodeId(nodeId);
  };

  const startConnecting = (fromNodeId?: number) => {
    setConnecting(true);
    setConnectFrom(fromNodeId ?? null);
    setSelectedNodeId(null);
  };

  const stopConnecting = () => {
    setConnecting(false);
    setConnectFrom(null);
  };

  const handleBackgroundClick = () => {
    if (connecting) setConnectFrom(null);
    else setSelectedNodeId(null);
  };

  const exportDiagram = async () => {
    try {
      await diagramService.exportToFile(id as string, diagram?.name ?? "diagram");
    } catch (err) {
      toastError(getErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Spinner size="xl" />
      </div>
    );
  }

  if (!diagram) {
    return (
      <div className="py-20 text-center text-slate-400">
        No se pudo cargar el diagrama.
        <div className="mt-4">
          <Button variant="secondary" onClick={() => navigate("/architecture")}>
            Volver
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 7rem)" }}>
      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            onClick={() => navigate("/architecture")}
            className="text-xs text-slate-500 hover:text-white"
          >
            ← Diagramas
          </button>
          <h1 className="text-xl font-bold text-white">{diagram.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={connecting ? "primary" : "secondary"}
            size="sm"
            onClick={() => (connecting ? stopConnecting() : startConnecting())}
            disabled={diagram.nodes.length < 2}
          >
            {connecting ? "✓ Conectando…" : "🔗 Conectar nodos"}
          </Button>
          <Button variant="secondary" size="sm" onClick={exportDiagram}>
            Exportar JSON
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            + Añadir nodo
          </Button>
        </div>
      </div>

      {/* Graph + panel */}
      <div className="flex flex-1 overflow-hidden rounded-xl border border-dark-border">
        <div className="relative flex-1">
          {diagram.nodes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-center text-slate-500">
              <p>
                Diagrama vacío.
                <br />
                Añade un proyecto o servicio externo para empezar.
              </p>
            </div>
          )}

          {/* Banner de modo conexión */}
          {connecting && (
            <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center">
              <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-amber-500/40 bg-amber-500/15 px-4 py-1.5 text-xs text-amber-200 shadow-lg">
                <span>
                  {connectFrom == null
                    ? "Modo conexión: haz clic en el nodo de ORIGEN"
                    : "Ahora haz clic en el nodo de DESTINO"}
                </span>
                <button
                  className="rounded bg-amber-500/30 px-2 py-0.5 font-medium hover:bg-amber-500/50"
                  onClick={stopConnecting}
                >
                  Salir
                </button>
              </div>
            </div>
          )}

          <Graph3D
            nodes={diagram.nodes}
            edges={diagram.edges}
            highlightNodeId={connectFrom}
            connecting={connecting}
            onNodeClick={handleNodeClick}
            onBackgroundClick={handleBackgroundClick}
            onNodeDragEnd={onNodeDragEnd}
          />
        </div>

        {selectedNode && !connecting && (
          <NodePanel
            node={selectedNode}
            onClose={() => setSelectedNodeId(null)}
            onSave={saveNode}
            onDelete={deleteNode}
            onStartConnect={(nodeId) => startConnecting(nodeId)}
          />
        )}
      </div>

      <AddNodeModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        projects={projects}
        onAdd={addNode}
      />
    </div>
  );
}

export default ArchitectureGraphPage;
