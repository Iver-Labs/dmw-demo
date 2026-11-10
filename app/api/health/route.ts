import { connection } from "next/server";
import { getIndexState } from "@/lib/rag/index-store";

/** Startup probe (Cloud Run) and compose healthcheck: 200 once the index is loaded, else 503. */
export async function GET() {
  await connection(); // never prerender: readiness is per running instance
  const state = getIndexState();
  const revision = process.env.K_REVISION ?? "local";
  const noStore = { "cache-control": "no-store" };

  if (state.status !== "ready") {
    return Response.json(
      { status: state.status, revision, ...(state.status === "failed" && { reason: state.reason }) },
      { status: 503, headers: noStore },
    );
  }
  return Response.json(
    {
      status: "ok",
      revision,
      model: process.env.SEALION_MODEL,
      chunks: state.index.chunks.length,
      indexBuiltAt: state.index.meta.builtAt,
    },
    { headers: noStore },
  );
}
