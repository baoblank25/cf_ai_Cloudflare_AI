import {
  WorkflowEntrypoint,
  WorkflowStep,
  WorkflowEvent,
} from "cloudflare:workers";

export class ChatWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const { message, sessionId, userId } = event.payload;

    //get conversation history
    const history = await step.do("fetch history", async () => {
      const id = this.env.CHAT_SESSIONS.idFromName(sessionId);
      const stub = this.env.CHAT_SESSIONS.get(id);
      const response = await stub.fetch("https://fake-host/history");
      return await response.json() as { messages: Array<{ role: string; content: string; timestamp: number }> };
    });

    //Prepare context for AI
    const context = await step.do("prepare context", async () => {
      return {
        messages: history.messages || [],
        userMessage: message,
        timestamp: Date.now(),
      };
    });

    //Call AI model
    const aiResponse = await step.do("generate AI response", async () => {
      const messages = [
        {
          role: "system",
          content: "You are a helpful AI assistant powered by Cloudflare Workers AI. Provide clear, concise, and helpful responses.",
        },
        ...context.messages.map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
        {
          role: "user",
          content: message,
        },
      ];

      const response = await this.env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        messages,
        max_tokens: 512,
        temperature: 0.7,
      });

      return response;
    });

    //Store user message in session
    await step.do("store user message", async () => {
      const id = this.env.CHAT_SESSIONS.idFromName(sessionId);
      const stub = this.env.CHAT_SESSIONS.get(id);
      await stub.fetch("https://fake-host/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "user",
          content: message,
        }),
      });
    });

    //Store AI response in session
    await step.do("store AI response", async () => {
      const id = this.env.CHAT_SESSIONS.idFromName(sessionId);
      const stub = this.env.CHAT_SESSIONS.get(id);
      await stub.fetch("https://fake-host/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "assistant",
          content: aiResponse.response,
        }),
      });
    });

    return {
      success: true,
      response: aiResponse.response,
      sessionId,
      timestamp: Date.now(),
    };
  }
}

interface Env {
  AI: any;
  CHAT_SESSIONS: DurableObjectNamespace;
  CHAT_WORKFLOW: Workflow;
}

interface Params {
  message: string;
  sessionId: string;
  userId: string;
}
