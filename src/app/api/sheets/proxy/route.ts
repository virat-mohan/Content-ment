import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // Only allow Google Sheets export URLs
  if (!url.startsWith("https://docs.google.com/spreadsheets/")) {
    return NextResponse.json({ error: "Only Google Sheets URLs are allowed" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      redirect: "follow",
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return new NextResponse(
          "Sheet is not publicly accessible. Go to Share → Anyone with the link → Viewer, then try again.",
          { status: 403 }
        );
      }
      const body = await res.text().catch(() => "");
      const hint = res.status === 400
        ? "Google returned 400 — make sure the sheet is published publicly (Share → Anyone with the link → Viewer)."
        : `Google returned ${res.status}.`;
      return new NextResponse(`${hint}${body ? " Details: " + body.slice(0, 200) : ""}`, { status: 502 });
    }

    const text = await res.text();
    return new NextResponse(text, {
      headers: { "Content-Type": "text/csv; charset=utf-8" },
    });
  } catch (e) {
    return new NextResponse(
      e instanceof Error ? e.message : "Failed to fetch sheet",
      { status: 502 }
    );
  }
}
