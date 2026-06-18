/**
 * @file ManagePanel.tsx
 * @description Panel de gestión SIEMPRE visible a la derecha del grafo. Lista
 * todos los nodos (con editar/eliminar) y todas las conexiones (con invertir,
 * alternar un sentido/ambos y eliminar). No depende de hacer clic en el 3D, así
 * que la gestión es fiable aunque interactuar con el lienzo sea incómodo.
 */
import { iconFor } from "./nodeIcon";
import type { DiagramEdge, DiagramNode } from "../../types";

interface ManagePanelProps {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  selectedNodeId: number | null;
  onSelectNode: (id: number) => void;
  onEditNode: (id: number) => void;
  onDeleteNode: (id: number) => void;
  onSetEdgeType: (edgeId: number, type: "directed" | "bidirectional") => void;
  onInvertEdge: (edge: DiagramEdge) => void;
  onDeleteEdge: (edgeId: number) => void;
}

function isBidir(t?: string | null): boolean {
  return ["bidirectional", "both", "<->", "two-way"].includes(
    (t ?? "").toLowerCase(),
  );
}

function ManagePanel({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  onEditNode,
  onDeleteNode,
  onSetEdgeType,
  onInvertEdge,
  onDeleteEdge,
}: ManagePanelProps) {
  const nameOf = (id: number) =>
    nodes.find((n) => n.id === id)?.label ?? "?";

  return (
    <aside className="flex h-full w-80 flex-shrink-0 flex-col overflow-y-auto border-l border-dark-border bg-dark-surface">
      {/* Nodos */}
      <div className="p-4">
        <h3 className="mb-2 text-sm font-semibold text-white">
          Nodos ({nodes.length})
        </h3>
        {nodes.length === 0 ? (
          <p className="text-xs text-slate-500">
            Usa "+ Añadir nodo" para empezar.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {nodes.map((n) => {
              const Icon = iconFor(n);
              return (
                <li
                  key={n.id}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                    selectedNodeId === n.id ? "bg-primary-600/15" : ""
                  }`}
                >
                  <Icon size={16} className="flex-shrink-0 text-primary-400" />
                  <button
                    onClick={() => onSelectNode(n.id)}
                    className="min-w-0 flex-1 truncate text-left text-sm text-slate-200 hover:text-white"
                    title="Resaltar en el grafo"
                  >
                    {n.label}
                  </button>
                  <button
                    onClick={() => onEditNode(n.id)}
                    className="rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-dark-bg hover:text-white"
                    title="Editar"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => onDeleteNode(n.id)}
                    className="rounded px-1.5 py-0.5 text-xs text-slate-400 hover:text-red-400"
                    title="Eliminar nodo"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Conexiones */}
      <div className="border-t border-dark-border p-4">
        <h3 className="mb-2 text-sm font-semibold text-white">
          Conexiones ({edges.length})
        </h3>
        {edges.length === 0 ? (
          <p className="text-xs text-slate-500">
            Pulsa "🔗 Conectar nodos" en la barra superior.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {edges.map((e) => {
              const bidir = isBidir(e.edge_type);
              return (
                <li
                  key={e.id}
                  className="rounded-lg border border-dark-border bg-dark-bg/40 p-2"
                >
                  <div className="mb-1.5 truncate text-xs text-slate-300">
                    {nameOf(e.source_node_id)} {bidir ? "↔" : "→"}{" "}
                    {nameOf(e.target_node_id)}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        onSetEdgeType(e.id, bidir ? "directed" : "bidirectional")
                      }
                      className="rounded bg-dark-surface px-2 py-1 text-xs text-slate-300 hover:bg-dark-border"
                      title="Alternar un sentido / ambos extremos"
                    >
                      {bidir ? "→ Un sentido" : "↔ Ambos"}
                    </button>
                    <button
                      onClick={() => onInvertEdge(e)}
                      disabled={bidir}
                      className="rounded bg-dark-surface px-2 py-1 text-xs text-slate-300 hover:bg-dark-border disabled:opacity-40"
                      title="Invertir el sentido de la flecha"
                    >
                      ⇄ Invertir
                    </button>
                    <button
                      onClick={() => onDeleteEdge(e.id)}
                      className="ml-auto rounded px-2 py-1 text-xs text-slate-400 hover:text-red-400"
                      title="Eliminar conexión"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}

export default ManagePanel;
