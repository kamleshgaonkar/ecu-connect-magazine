import { NextResponse } from "next/server";
import { chromium } from "playwright";
import { existsSync } from "node:fs";
import { readPdfInput, PdfInputError } from "../../../export/pdf-images";
import { magazineDocument } from "../../../magazine/document";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(request: Request) {
  let browser;
  let executablePath: string | undefined;
  try {
    const issue = await readPdfInput(request);
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
      { timeout: 120000 },
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
    if (error instanceof PdfInputError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    console.error("PDF export failed:", {
      error: error instanceof Error ? error.stack || error.message : error,
      browserLaunched: Boolean(browser),
      executablePath: executablePath ?? "(Playwright default)",
      playwrightBrowsersPath: process.env.PLAYWRIGHT_BROWSERS_PATH ?? "(unset)",
      platform: `${process.platform}-${process.arch}`,
      node: process.version,
    });
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return NextResponse.json(
      {
        error: timedOut
          ? "PDF rendering timed out. Review the issue's layout warnings and the server runtime/memory budget, then retry. Saved content and original images are unchanged."
          : "PDF rendering failed. Check server Chromium availability and runtime/memory resources, then retry. Saved content and original images are unchanged.",
      },
      { status: timedOut ? 504 : 500 },
    );
  } finally {
    await browser?.close();
  }
}
