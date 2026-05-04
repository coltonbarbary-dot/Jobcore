import { headers } from "next/headers";
import { Webhook } from "svix";
import { db } from "@/lib/db";

type ClerkUserEvent = {
  type: "user.created" | "user.updated";
  data: {
    id: string;
    email_addresses: { email_address: string; id: string }[];
    first_name: string | null;
    last_name: string | null;
    image_url: string;
  };
};

type ClerkOrgEvent = {
  type: "organization.created";
  data: {
    id: string;
    name: string;
    slug: string;
    created_by: string;
  };
};

type ClerkMembershipEvent = {
  type: "organizationMembership.created";
  data: {
    id: string;
    role: string;
    public_user_data: { user_id: string };
    organization: { id: string };
  };
};

type ClerkEvent = ClerkUserEvent | ClerkOrgEvent | ClerkMembershipEvent;

export async function POST(request: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return new Response("Missing CLERK_WEBHOOK_SECRET", { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const body = await request.text();

  const wh = new Webhook(webhookSecret);
  let event: ClerkEvent;

  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkEvent;
  } catch {
    return new Response("Invalid webhook signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "user.created": {
        // User record is created when they join an org (membership event).
        // Here we just log — org assignment happens in membership event.
        break;
      }

      case "organization.created": {
        const { id, name, slug, created_by } = event.data;

        await db.organization.upsert({
          where: { clerkOrganizationId: id },
          create: {
            clerkOrganizationId: id,
            name,
            slug,
            ownerId: created_by,
          },
          update: { name, slug },
        });
        break;
      }

      case "organizationMembership.created": {
        const { public_user_data, organization, role } = event.data;
        const userId = public_user_data.user_id;
        const orgClerkId = organization.id;

        const org = await db.organization.findUnique({
          where: { clerkOrganizationId: orgClerkId },
        });
        if (!org) break;

        const clerkRole = role === "org:admin" ? "admin" : role === "org:owner" ? "owner" : "member";

        await db.user.upsert({
          where: { id: userId },
          create: {
            id: userId,
            organizationId: org.id,
            email: "",
            fullName: "",
            role: clerkRole as "owner" | "admin" | "member",
          },
          update: {
            organizationId: org.id,
            role: clerkRole as "owner" | "admin" | "member",
          },
        });
        break;
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Clerk webhook error:", error);
    return new Response("Internal error", { status: 500 });
  }
}
