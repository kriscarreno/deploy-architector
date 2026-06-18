/**
 * @file nodeIcon.ts
 * @description Mapeo de tipo de nodo → icono de lucide-react. Aislado en su
 * propio módulo (solo depende de lucide-react, tree-shakeable) para poder
 * usarlo tanto en el grafo 3D como en la UI sin arrastrar three.js.
 */
import {
  Archive,
  Cloud,
  Database,
  Globe,
  type LucideIcon,
  Lock,
  MessageSquare,
  Package,
  Plug,
  Webhook,
  Zap,
} from "lucide-react";
import type { DiagramNode } from "../../types";

/** Icono de lucide-react según el tipo de nodo. */
export function iconFor(
  n: Pick<DiagramNode, "kind" | "service_type">,
): LucideIcon {
  if (n.kind === "project") return Package;
  const t = (n.service_type ?? "").toLowerCase();
  if (
    t.includes("data") ||
    t.includes("db") ||
    t.includes("postgres") ||
    t.includes("sql")
  )
    return Database;
  if (t.includes("cache") || t.includes("redis")) return Zap;
  if (t.includes("queue") || t.includes("kafka") || t.includes("rabbit"))
    return MessageSquare;
  if (t.includes("storage") || t.includes("s3") || t.includes("bucket"))
    return Archive;
  if (t.includes("cdn")) return Globe;
  if (t.includes("auth")) return Lock;
  if (t.includes("webhook")) return Webhook;
  if (t.includes("api")) return Plug;
  return Cloud;
}
