import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { entitySchema } from "@/lib/validations/entity";
import { slugify } from "@/lib/utils";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entities = await prisma.entity.findMany({
    where: { clerkUserId: userId, isActive: true },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(entities);
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const result = entitySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const { name, type, description, website, industry, logo, preferredLLM, llmApiKey, llmModel, ...socials } = result.data;

  let slug = slugify(name);
  const existing = await prisma.entity.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now()}`;

  const entity = await prisma.entity.create({
    data: {
      clerkUserId: userId,
      name,
      slug,
      type,
      description: description || null,
      website: website || null,
      industry: industry || null,
      logo: logo || null,
      linkedinHandle: socials.linkedinHandle || null,
      xHandle: socials.xHandle || null,
      instagramHandle: socials.instagramHandle || null,
      mediumHandle: socials.mediumHandle || null,
      redditHandle: socials.redditHandle || null,
      quoraHandle: socials.quoraHandle || null,
      youtubeHandle: socials.youtubeHandle || null,
      preferredLLM: preferredLLM || null,
      llmApiKey: llmApiKey || null,
      llmModel: llmModel || null,
    },
  });

  return NextResponse.json(entity, { status: 201 });
}
