/**
 * Next.js calls register() once when the server starts, before it handles requests.
 * Startup logic lives in lib/startup.ts (Node.js runtime only).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // `next build` may load instrumentation while prerendering; there is no server to gate then.
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { startup } = await import("./lib/startup");
  await startup();
}
