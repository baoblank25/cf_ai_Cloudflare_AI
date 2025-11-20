import { ChatSession } from "./durable-objects/ChatSession";
import { ChatWorkflow } from "./workflows/ChatWorkflow";

/**
 * Main Worker entry point
 * Handles API requests and routes to appropriate handlers
 */

interface Env {
  AI: any;
  CHAT_SESSIONS: DurableObjectNamespace;
  CHAT_WORKFLOW: Workflow;
  __STATIC_CONTENT: any;
}

export { ChatSession, ChatWorkflow };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers for frontend
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // API routes
      if (path.startsWith("/api/")) {
        return await handleApiRequest(request, env, url, path, corsHeaders);
      }

      // Health check endpoint
      if (path === "/health") {
        return new Response(
          JSON.stringify({
            status: "healthy",
            service: "Cloudflare AI Chat Assistant",
            timestamp: new Date().toISOString(),
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Serve static files from public directory
      if (env.__STATIC_CONTENT) {
        try {
          const { getAssetFromKV } = await import("@cloudflare/kv-asset-handler");
          return await getAssetFromKV(
            {
              request,
              waitUntil: () => {},
            } as any,
            {
              ASSET_NAMESPACE: env.__STATIC_CONTENT,
              ASSET_MANIFEST: {},
            }
          );
        } catch (e) {
          // If asset not found, serve index.html for SPA routing
          if (path === "/" || !path.includes(".")) {
            try {
              const { getAssetFromKV } = await import("@cloudflare/kv-asset-handler");
              const indexRequest = new Request(new URL("/index.html", request.url), request);
              return await getAssetFromKV(
                {
                  request: indexRequest,
                  waitUntil: () => {},
                } as any,
                {
                  ASSET_NAMESPACE: env.__STATIC_CONTENT,
                  ASSET_MANIFEST: {},
                }
              );
            } catch {
              return new Response("Not found", { status: 404 });
            }
          }
          return new Response("Not found", { status: 404 });
        }
      }

      // Fallback - serve simple HTML page
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head><title>Cloudflare AI Assistant</title></head>
        <body>
          <h1>Cloudflare AI Assistant</h1>
          <p>API is running. Visit /health for status.</p>
          <p>Deploy frontend with: wrangler pages deploy public</p>
        </body>
        </html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    } catch (error) {
      console.error("Error:", error);
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  },
};

async function handleApiRequest(
  request: Request,
  env: Env,
  url: URL,
  path: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    // Chat endpoint - direct AI interaction (fast path)
    if (path === "/api/chat" && request.method === "POST") {
      const { message, sessionId } = (await request.json()) as {
        message: string;
        sessionId: string;
      };

      if (!message || !sessionId) {
        return new Response(JSON.stringify({ error: "Missing message or sessionId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get conversation history from Durable Object
      const id = env.CHAT_SESSIONS.idFromName(sessionId);
      const stub = env.CHAT_SESSIONS.get(id);
      const historyResponse = await stub.fetch("https://fake-host/history");
      const history = (await historyResponse.json()) as {
        messages: Array<{ role: string; content: string }>;
      };

      // Prepare messages for AI
      const messages = [
        {
          role: "system",
          content:
            "You are a helpful AI assistant powered by Cloudflare Workers AI using Llama 3.3. Provide clear, concise, and helpful responses. Be friendly and professional.",
        },
        ...history.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        {
          role: "user",
          content: message,
        },
      ];

      // Call Workers AI with Llama 3.3
      const aiResponse = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        messages,
        max_tokens: 512,
        temperature: 0.7,
      });

      // Store user message
      await stub.fetch("https://fake-host/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "user",
          content: message,
        }),
      });

      // Store AI response
      await stub.fetch("https://fake-host/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "assistant",
          content: aiResponse.response,
        }),
      });

      return new Response(
        JSON.stringify({
          response: aiResponse.response,
          sessionId,
          timestamp: Date.now(),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Workflow-based chat endpoint (for complex orchestration)
    if (path === "/api/chat/workflow" && request.method === "POST") {
      const { message, sessionId, userId } = (await request.json()) as {
        message: string;
        sessionId: string;
        userId: string;
      };

      if (!message || !sessionId) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create and run workflow
      const instance = await env.CHAT_WORKFLOW.create({
        params: {
          message,
          sessionId,
          userId: userId || "anonymous",
        },
      });

      return new Response(
        JSON.stringify({
          workflowId: instance.id,
          status: "processing",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get conversation history
    if (path === "/api/history" && request.method === "GET") {
      const sessionId = url.searchParams.get("sessionId");
      if (!sessionId) {
        return new Response(JSON.stringify({ error: "Missing sessionId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const id = env.CHAT_SESSIONS.idFromName(sessionId);
      const stub = env.CHAT_SESSIONS.get(id);
      const response = await stub.fetch("https://fake-host/history");
      const data = await response.json();

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clear conversation history
    if (path === "/api/history" && request.method === "DELETE") {
      const { sessionId } = (await request.json()) as { sessionId: string };
      if (!sessionId) {
        return new Response(JSON.stringify({ error: "Missing sessionId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const id = env.CHAT_SESSIONS.idFromName(sessionId);
      const stub = env.CHAT_SESSIONS.get(id);
      await stub.fetch("https://fake-host/clear", { method: "DELETE" });

      return new Response(JSON.stringify({ success: true, message: "History cleared" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("API endpoint not found", {
      status: 404,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("API Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}
