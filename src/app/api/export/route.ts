import { NextResponse } from "next/server";
import { chromium } from "playwright";
import { existsSync } from "node:fs";
import { migrateIssue, type Issue } from "../../../domain/issue";
import { magazineDocument } from "../../../magazine/document";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  let browser;
  let executablePath: string | undefined;
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
    let issue: Issue;
    try {
      issue = migrateIssue(json);
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid issue content or unsupported schema version. Check title, volume and content limits.",
        },
        { status: 400 },
      );
    }
    executablePath =
      process.env.CHROMIUM_EXECUTABLE_PATH ||
      (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
    browser = await chromium.launch({ headless: true, executablePath });
    const page = await browser.newPage();
    await page.route("**/*", (route) => route.abort()); // The renderer is deliberately self-contained.
    await page.setContent(magazineDocument(issue), { waitUntil: "load" });
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
        "Content-Disposition": `attachment; filename="ecu-connect-volume-${issue.volume}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("PDF export failed:", {
      error: error instanceof Error ? error.stack || error.message : error,
      browserLaunched: Boolean(browser),
      executablePath: executablePath ?? "(Playwright default)",
      playwrightBrowsersPath:
        process.env.PLAYWRIGHT_BROWSERS_PATH ?? "(unset)",
      platform: `${process.platform}-${process.arch}`,
      node: process.version,
    });
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
