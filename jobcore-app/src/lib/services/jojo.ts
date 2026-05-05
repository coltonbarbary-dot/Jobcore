import { db } from "@/lib/db";
import { type JojoConversation, type JojoMessage, JojoRole } from "@prisma/client";

export type { JojoConversation, JojoMessage };

// ─── Conversations ────────────────────────────────────────────────────────────

export async function listConversations(
  organizationId: string,
  userId: string
): Promise<JojoConversation[]> {
  return db.jojoConversation.findMany({
    where: { organizationId, userId },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
}

export async function getConversation(
  organizationId: string,
  userId: string,
  conversationId: string
): Promise<(JojoConversation & { messages: JojoMessage[] }) | null> {
  return db.jojoConversation.findFirst({
    where: { id: conversationId, organizationId, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

export async function createConversation(
  organizationId: string,
  userId: string,
  title?: string
): Promise<JojoConversation> {
  return db.jojoConversation.create({
    data: { organizationId, userId, title: title ?? null },
  });
}

export async function updateConversationTitle(
  organizationId: string,
  userId: string,
  conversationId: string,
  title: string
): Promise<void> {
  await db.jojoConversation.updateMany({
    where: { id: conversationId, organizationId, userId },
    data: { title },
  });
}

export async function deleteConversation(
  organizationId: string,
  userId: string,
  conversationId: string
): Promise<void> {
  await db.jojoConversation.deleteMany({
    where: { id: conversationId, organizationId, userId },
  });
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export type AppendMessageData = {
  role: JojoRole;
  content: string;
  toolCalls?: object;
  toolResults?: object;
  model?: string;
  tokensUsed?: number;
};

export async function appendMessage(
  conversationId: string,
  data: AppendMessageData
): Promise<JojoMessage> {
  const message = await db.jojoMessage.create({
    data: {
      conversationId,
      role: data.role,
      content: data.content,
      toolCalls: data.toolCalls ? (data.toolCalls as object) : undefined,
      toolResults: data.toolResults ? (data.toolResults as object) : undefined,
      model: data.model ?? null,
      tokensUsed: data.tokensUsed ?? null,
    },
  });

  // Touch the conversation's updatedAt so sidebar stays sorted
  await db.jojoConversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return message;
}
