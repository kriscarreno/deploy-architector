/**
 * @file Graph3D.tsx
 * @description Envoltura de react-force-graph-3d para dibujar nodos (proyectos
 * y servicios externos) y sus conexiones. Cada nodo se renderiza como un objeto
 * 3D propio (forma según el tipo de servicio + una tarjeta con icono y nombre)
 * para que el grafo sea legible y atractivo, no un simple punto.
 *
 * La librería (con three.js) se carga de forma diferida para no engordar el
 * bundle principal.
 */
import { Suspense, createElement, lazy, useEffect, useMemo, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as THREE from "three";
import type { LucideIcon } from "lucide-react";
import Spinner from "../common/Spinner";
import { iconFor } from "./nodeIcon";
import type { DiagramEdge, DiagramNode } from "../../types";

// Carga diferida: three.js + force-graph solo se descargan en esta vista
const ForceGraph3D = lazy(() => import("react-force-graph-3d"));

const STATUS_COLOR: Record<string, string> = {
  up: "#22c55e",
  down: "#ef4444",
  unknown: "#64748b",
};

/** Convierte un icono de lucide-react en una data-URL SVG para pintarlo en canvas. */
function lucideSvgDataUrl(Icon: LucideIcon, color: string): string {
  const markup = renderToStaticMarkup(
    createElement(Icon, { color, size: 64, strokeWidth: 2 }),
  );
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}

/** Color de acento del nodo (borde de la tarjeta + material). */
function accentColor(n: DiagramNode, highlighted: boolean): string {
  if (highlighted) return "#f59e0b";
  if (n.healthcheck_url) return STATUS_COLOR[n.status] ?? STATUS_COLOR.unknown;
  if (n.color) return n.color;
  return n.kind === "project" ? "#3b82f6" : "#a855f7";
}

interface GraphNodeObj {
  id: number;
  node: DiagramNode;
  x?: number;
  y?: number;
  z?: number;
  fx?: number;
  fy?: number;
  fz?: number;
}

interface Graph3DProps {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  highlightNodeId?: number | null;
  connecting?: boolean;
  onNodeClick?: (nodeId: number) => void;
  onBackgroundClick?: () => void;
  onNodeDragEnd?: (
    nodeId: number,
    pos: { posX: number; posY: number; posZ: number },
  ) => void;
}

/** Tarjeta (sprite) con icono lucide + nombre que siempre mira a la cámara. */
function makeLabelSprite(text: string, Icon: LucideIcon, accent: string): THREE.Sprite {
  const dpr = 2;
  const fontSize = 30;
  const padX = 18;
  const iconW = 36;
  const gap = 12;
  const height = 64;

  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
  const label = text.length > 22 ? `${text.slice(0, 21)}…` : text;
  const textW = measure.measureText(label).width;
  const width = padX * 2 + iconW + gap + textW;

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * dpr);
  canvas.height = Math.ceil(height * dpr);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  // Fondo redondeado
  const r = 16;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.arcTo(width, 0, width, height, r);
  ctx.arcTo(width, height, 0, height, r);
  ctx.arcTo(0, height, 0, 0, r);
  ctx.arcTo(0, 0, width, 0, r);
  ctx.closePath();
  ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = accent;
  ctx.stroke();

  // Nombre
  ctx.textBaseline = "middle";
  ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = "#e2e8f0";
  ctx.fillText(label, padX + iconW + gap, height / 2 + 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  // El icono SVG se rasteriza de forma asíncrona y refresca la textura al cargar
  const iconImg = new Image();
  iconImg.onload = () => {
    const iconY = (height - iconW) / 2;
    ctx.drawImage(iconImg, padX, iconY, iconW, iconW);
    texture.needsUpdate = true;
  };
  iconImg.src = lucideSvgDataUrl(Icon, accent);

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  const worldH = 9;
  sprite.scale.set((worldH * width) / height, worldH, 1);
  return sprite;
}

/** Geometría 3D del nodo según su tipo (proyecto / db / genérico). */
function makeNodeMesh(n: DiagramNode, accent: string, highlighted: boolean): THREE.Mesh {
  const t = (n.service_type ?? "").toLowerCase();
  let geometry: THREE.BufferGeometry;
  if (n.kind === "project") {
    geometry = new THREE.BoxGeometry(7, 7, 7);
  } else if (t.includes("data") || t.includes("db") || t.includes("sql")) {
    geometry = new THREE.CylinderGeometry(4.5, 4.5, 8, 24); // tambor de BD
  } else {
    geometry = new THREE.IcosahedronGeometry(5, 0); // gema
  }
  const material = new THREE.MeshLambertMaterial({
    color: new THREE.Color(n.color ?? accent),
    emissive: new THREE.Color(accent),
    emissiveIntensity: highlighted ? 0.9 : 0.35,
  });
  return new THREE.Mesh(geometry, material);
}

function buildNodeObject(n: DiagramNode, highlighted: boolean): THREE.Object3D {
  const accent = accentColor(n, highlighted);
  const group = new THREE.Group();

  const mesh = makeNodeMesh(n, accent, highlighted);
  group.add(mesh);

  // Halo de estado (anillo brillante alrededor)
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(highlighted ? 8.5 : 7.5, 16, 16),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(accent),
      transparent: true,
      opacity: highlighted ? 0.18 : 0.08,
    }),
  );
  group.add(halo);

  const label = makeLabelSprite(n.label, iconFor(n), accent);
  label.position.set(0, 10, 0);
  group.add(label);

  return group;
}

function Graph3D({
  nodes,
  edges,
  highlightNodeId,
  connecting,
  onNodeClick,
  onBackgroundClick,
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
        node: n,
        // Fija los nodos que ya tienen layout guardado para que persista
        ...(hasPos ? { fx: n.pos_x, fy: n.pos_y, fz: n.pos_z } : {}),
      };
    });
    const links = edges.map((e) => ({
      source: e.source_node_id,
      target: e.target_node_id,
      label: e.label ?? undefined,
    }));
    return { nodes: gNodes, links };
  }, [nodes, edges]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ cursor: connecting ? "crosshair" : undefined }}
    >
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
          showNavInfo={false}
          nodeLabel={(n: GraphNodeObj) =>
            n.node.healthcheck_url
              ? `${n.node.label} · ${n.node.status}`
              : n.node.label
          }
          nodeThreeObject={(n: GraphNodeObj) =>
            buildNodeObject(n.node, n.id === highlightNodeId)
          }
          linkColor={() => "#64748b"}
          linkWidth={1.2}
          linkOpacity={0.6}
          linkDirectionalArrowLength={4.5}
          linkDirectionalArrowRelPos={1}
          linkDirectionalParticles={2}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleSpeed={0.006}
          onNodeClick={(n: GraphNodeObj) => onNodeClick?.(n.id)}
          onBackgroundClick={() => onBackgroundClick?.()}
          onNodeDragEnd={(n: GraphNodeObj) => {
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
