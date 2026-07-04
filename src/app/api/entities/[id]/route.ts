import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { entitySchema } from "@/lib/validations/entity";
import { slugify } from "@/lib/utils";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entity = await prisma.entity.findUnique({ where: { id } });
  if (!entity || entity.clerkUserId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(entity);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entity = await prisma.entity.findUnique({ where: { id } });
  if (!entity || entity.clerkUserId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const result = entitySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const { name, type, description, website, industry, logo, preferredLLM, llmApiKey, llmModel, ...socials } = result.data;

  let slug = entity.slug;
  if (name !== entity.name) {
    slug = slugify(name);
    const existing = await prisma.entity.findFirst({ where: { slug, NOT: { id } } });
    if (existing) slug = `${slug}-${Date.now()}`;
  }

  const updated = await prisma.entity.update({
    where: { id },
    data: {
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

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entity = await prisma.entity.findUnique({ where: { id } });
  if (!entity || entity.clerkUserId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.entity.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}
