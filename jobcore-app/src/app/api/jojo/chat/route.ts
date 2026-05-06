export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireOrg } from "@/lib/auth";
import { JOJO_TOOLS, executeTool } from "@/lib/jojo-tools";
import { JOJO_SYSTEM_PROMPT } from "@/lib/jojo-prompt";
import {
  createConversation,
  getConversation,
  appendMessage,
  updateConversationTitle,
} from "@/lib/services/jojo";
import type { ChatCompletionMessageParam, ChatCompletionMessageFunctionToolCall } from "openai/resources/chat/completions";

const MODEL = "gpt-4o";
const MAX_TOOL_ROUNDS = 5; // prevent infinite loops

function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured. Add it to your environment variables to enable JoJo."
    );
  }
  return new OpenAI({ apiKey });
}

export async function POST(req: NextRequest) {
  const { user, org } = await requireOrg();

  let body: { message: string; conversationId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const userMessage = body.message?.trim();
  if (!userMessage) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  // Check OpenAI key up-front for a clear error message
  let openai: OpenAI;
  try {
    openai = getOpenAI();
  } catch (err) {
    const message = err instanceof Error ? err.message : "OpenAI not configured";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  // Get or create conversation
  let conversationId = body.conversationId;
  if (conversationId) {
    const existing = await getConversation(org.id, user.id, conversationId);
    if (!existing) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
  } else {
    const conv = await createConversation(org.id, user.id);
    conversationId = conv.id;
  }

  // Persist user message
  await appendMessage(conversationId, { role: "user", content: userMessage });

  // Build messages for OpenAI — reload full conversation history
  const convo = await getConversation(org.id, user.id, conversationId);
  const today = new Date().toISOString().slice(0, 10);

  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `${JOJO_SYSTEM_PROMPT}\n\nToday's date: ${today}`,
    },
    ...(convo?.messages ?? []).map((m): ChatCompletionMessageParam => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    })),
  ];

  // Tool call loop
  const allToolCalls: object[] = [];
  const allToolResults: object[] = [];
  let finalContent = "";
  let totalTokens = 0;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages,
      tools: JOJO_TOOLS,
      tool_choice: "auto",
    });

    const choice = response.choices[0];
    totalTokens += response.usage?.total_tokens ?? 0;

    if (choice.finish_reason === "stop" || !choice.message.tool_calls?.length) {
      finalContent = choice.message.content ?? "";
      break;
    }

    // Execute all tool calls in this round
    const toolCallResults: ChatCompletionMessageParam[] = [];

    const roundToolCalls = choice.message.tool_calls;
    allToolCalls.push(...roundToolCalls);

    // Add assistant message with tool_calls to the running messages
    messages.push({
      role: "assistant",
      content: choice.message.content ?? null,
      tool_calls: roundToolCalls,
    });

    // Execute each tool and collect results
    for (const tc of roundToolCalls) {
      // Narrow to function tool calls (the only kind we register)
      if (!("function" in tc)) continue;
      const ftc = tc as ChatCompletionMessageFunctionToolCall;

      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(ftc.function.arguments);
      } catch {
        // leave args empty
      }

      const result = await executeTool(ftc.function.name, args, {
        organizationId: org.id,
        actorId: user.id,
      });

      allToolResults.push({ toolCallId: tc.id, ...result });

      toolCallResults.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      });
    }

    messages.push(...toolCallResults);
  }

  // If we exhausted all rounds without a stop, get a final synthesis
  if (!finalContent) {
    const finalResponse = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        ...messages,
        {
          role: "user",
          content: "Please summarize what was accomplished based on the tool results above.",
        },
      ],
    });
    finalContent = finalResponse.choices[0].message.content ?? "Done.";
    totalTokens += finalResponse.usage?.total_tokens ?? 0;
  }

  // Persist assistant message with tool metadata
  await appendMessage(conversationId, {
    role: "assistant",
    content: finalContent,
    toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
    toolResults: allToolResults.length > 0 ? allToolResults : undefined,
    model: MODEL,
    tokensUsed: totalTokens,
  });

  // Auto-title the conversation from first user message (truncated)
  if (!convo?.title) {
    const shortTitle = userMessage.slice(0, 60) + (userMessage.length > 60 ? "…" : "");
    await updateConversationTitle(org.id, user.id, conversationId, shortTitle);
  }

  // Collect created entities for UI refresh (excluding scheduling actions — those refresh via scheduleSuggestion)
  type RichResult = {
    success: boolean;
    action: string;
    entityType?: string;
    entityId?: string;
    data?: Record<string, unknown>;
  };
  const richResults = allToolResults as RichResult[];

  const createdEntities = richResults
    .filter((r) => r.success === true && !!r.entityId && r.action !== "suggest_schedule")
    .map((r) => ({
      entityType: r.entityType ?? "unknown",
      entityId: r.entityId!,
      action: r.action,
    }));

  // Extract schedule suggestion from tool results so the UI can render action buttons
  const suggestionResult = richResults.find(
    (r) => r.action === "suggest_schedule" && r.success === true && r.data
  );
  const scheduleSuggestion = suggestionResult?.data ?? null;

  return NextResponse.json({
    conversationId,
    message: finalContent,
    createdEntities,
    scheduleSuggestion,
    tokensUsed: totalTokens,
  });
}
