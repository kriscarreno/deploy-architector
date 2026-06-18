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
  onLinkClick?: (edgeId: number) => void;
  onNodeDragEnd?: (
    nodeId: number,
    pos: { posX: number; posY: number; posZ: number },
  ) => void;
}

/** ¿La conexión lleva flecha en ambos extremos? */
function isBidirectional(edgeType?: string | null): boolean {
  const t = (edgeType ?? "").toLowerCase();
  return (
    t === "bidirectional" || t === "both" || t === "<->" || t === "two-way"
  );
}

// ── Decorado de escena: estrellas + rejilla de suelo para dar sensación 3D ──

function makeStarfield(): THREE.Points {
  const count = 1500;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 700 + Math.random() * 1600;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xc7d8ff,
    size: 2.6,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  return new THREE.Points(geo, mat);
}

function makeGrid(): THREE.GridHelper {
  const grid = new THREE.GridHelper(2600, 52, 0x4f7df0, 0x33406b);
  grid.position.y = -170;
  const mat = grid.material as THREE.Material;
  mat.transparent = true;
  mat.opacity = 0.28;
  return grid;
}

// ── Flechas de las conexiones (una o ambas puntas según el tipo) ────────────

function makeArrowCone(): THREE.Mesh {
  const geo = new THREE.ConeGeometry(2.7, 7.5, 16);
  const mat = new THREE.MeshLambertMaterial({
    color: 0xcbd5e1,
    emissive: 0x475569,
    emissiveIntensity: 0.6,
  });
  return new THREE.Mesh(geo, mat);
}

interface GraphLinkObj {
  id: number;
  source: number | { x?: number; y?: number; z?: number };
  target: number | { x?: number; y?: number; z?: number };
  label?: string;
  edgeType?: string | null;
}

function buildLinkObject(link: GraphLinkObj): THREE.Object3D {
  const group = new THREE.Group();
  const end = makeArrowCone();
  end.name = "arrowEnd";
  group.add(end);
  if (isBidirectional(link.edgeType)) {
    const start = makeArrowCone();
    start.name = "arrowStart";
    group.add(start);
  }
  return group;
}

const _s = new THREE.Vector3();
const _e = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _rev = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const NODE_RADIUS = 8;

function positionLinkArrows(
  obj: THREE.Object3D,
  coords: {
    start: { x: number; y: number; z: number };
    end: { x: number; y: number; z: number };
  },
): boolean {
  const { start, end } = coords;
  _s.set(start.x, start.y, start.z);
  _e.set(end.x, end.y, end.z);
  _dir.subVectors(_e, _s);
  const len = _dir.length();
  if (len === 0) return true;
  _dir.multiplyScalar(1 / len);

  const endArrow = obj.getObjectByName("arrowEnd");
  if (endArrow) {
    endArrow.position.set(
      _e.x - _dir.x * NODE_RADIUS,
      _e.y - _dir.y * NODE_RADIUS,
      _e.z - _dir.z * NODE_RADIUS,
    );
    endArrow.quaternion.setFromUnitVectors(_up, _dir);
  }
  const startArrow = obj.getObjectByName("arrowStart");
  if (startArrow) {
    startArrow.position.set(
      _s.x + _dir.x * NODE_RADIUS,
      _s.y + _dir.y * NODE_RADIUS,
      _s.z + _dir.z * NODE_RADIUS,
    );
    _rev.copy(_dir).negate();
    startArrow.quaternion.setFromUnitVectors(_up, _rev);
  }
  return true;
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
  onLinkClick,
  onNodeDragEnd,
}: Graph3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);
  const decoratedRef = useRef(false);
  const [size, setSize] = useState({ width: 800, height: 600 });

  // Añade estrellas, rejilla y niebla a la escena una vez la librería está lista.
  // Se invoca desde onEngineTick (se ejecuta en cuanto hay datos) con guarda.
  const decorateScene = () => {
    const fg = fgRef.current;
    if (!fg || decoratedRef.current) return;
    const scene: THREE.Scene | undefined = fg.scene?.();
    if (!scene) return;
    decoratedRef.current = true;
    scene.fog = new THREE.FogExp2(0x141d3d, 0.00055);
    scene.add(makeStarfield());
    scene.add(makeGrid());
  };

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
      id: e.id,
      source: e.source_node_id,
      target: e.target_node_id,
      label: e.label ?? undefined,
      edgeType: e.edge_type,
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
          ref={fgRef}
          width={size.width}
          height={size.height}
          graphData={graphData}
          backgroundColor="#141d3d"
          showNavInfo={false}
          onEngineTick={decorateScene}
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
          linkOpacity={0.55}
          linkThreeObjectExtend={true}
          linkThreeObject={(l: GraphLinkObj) => buildLinkObject(l)}
          linkPositionUpdate={positionLinkArrows}
          linkDirectionalParticles={(l: GraphLinkObj) =>
            isBidirectional(l.edgeType) ? 0 : 2
          }
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleSpeed={0.006}
          onLinkClick={(l: GraphLinkObj) => onLinkClick?.(l.id)}
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
