import { NextResponse } from "next/server";
import { chromium } from "playwright";
import { existsSync } from "node:fs";
import { issueSchema } from "../../../domain/issue";
import { magazineDocument } from "../../../magazine/document";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  let browser;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 1_000_000)
      return NextResponse.json(
        { error: "Issue exceeds the 1 MB export limit." },
        { status: 413 },
      );
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Invalid issue JSON." },
        { status: 400 },
      );
    }
    const result = issueSchema.safeParse(json);
    if (!result.success)
      return NextResponse.json(
        {
          error:
            "Invalid issue content. Check title, volume and content limits.",
        },
        { status: 400 },
      );
    const executablePath =
      process.env.CHROMIUM_EXECUTABLE_PATH ||
      (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
    browser = await chromium.launch({ headless: true, executablePath });
    const page = await browser.newPage();
    await page.route("**/*", (route) => route.abort()); // The renderer is deliberately self-contained.
    await page.setContent(magazineDocument(result.data), { waitUntil: "load" });
    await page.waitForFunction(
      () =>
        Boolean(
          (window as unknown as { __magazineReady: boolean }).__magazineReady,
        ),
      {},
      { timeout: 30000 },
    );
    const layout = await page.evaluate(
      () =>
        (
          window as unknown as {
            __magazineResult: { pages: number; warnings: string[] };
          }
        ).__magazineResult,
    );
    if (layout.warnings.length)
      return NextResponse.json(
        { error: layout.warnings.join(" ") },
        { status: 422 },
      );
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ecu-connect-volume-${result.data.volume}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(
      "PDF export failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      {
        error:
          "PDF rendering failed. Confirm Playwright Chromium is installed on the server, then retry.",
      },
      { status: 500 },
    );
  } finally {
    await browser?.close();
  }
}
