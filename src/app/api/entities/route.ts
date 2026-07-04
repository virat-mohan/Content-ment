import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

export const dynamic = "force-dynamic";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { entitySchema } from "@/lib/validations/entity";
import { slugify } from "@/lib/utils";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entities = await prisma.entity.findMany({
    where: { userId: session.user.id, isActive: true },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(entities);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
      userId: session.user.id,
      name, slug, type,
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
