
export class ChatSession {
  private state: DurableObjectState;
  private messages: Array<{ role: string; content: string; timestamp: number }>;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.messages = [];
  }

  async fetch(request: Request): Promise<Response> {
    //Initialize messages from storage
    if (this.messages.length === 0) {
      const stored = await this.state.storage.get<Array<{ role: string; content: string; timestamp: number }>>("messages");
      if (stored) {
        this.messages = stored;
      }
    }

    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "POST" && path === "/message"){
      const body = await request.json() as { role: string; content: string };
      const message = {
        role: body.role,
        content: body.content,
        timestamp: Date.now(),
      };
      
      this.messages.push(message);
      await this.state.storage.put("messages", this.messages);

      return new Response(JSON.stringify({ success: true, message }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "GET" && path === "/history") {
      //Get conversation history
      return new Response(JSON.stringify({ messages: this.messages }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "DELETE" && path === "/clear") {
      //Clear conversation history
      this.messages = [];
      await this.state.storage.delete("messages");

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404 });
  }
}
