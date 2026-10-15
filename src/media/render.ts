import { migrateIssue, type Issue } from "../domain/issue";
import type { MediaReference } from "../domain/media";
import type { MediaAssetRepository } from "./repository";
export function issueMediaReferences(issue: Issue): MediaReference[] {
  const references = [issue.cover?.image, issue.cover?.logo];
  for (const section of issue.sections.filter((s) => s.enabled))
    for (const story of section.stories.filter((s) => s.enabled))
      references.push(
        story.visual?.hero,
        story.visual?.thumbnail,
        ...story.media,
        ...story.blocks.map((block) => block.image),
      );
  return references.filter((r): r is MediaReference => Boolean(r));
}
export function imageDataUrl(mimeType: string, bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return `data:${mimeType};base64,${btoa(binary)}`;
}
/** Resolve only referenced images once, for both iframe and unchanged PDF endpoint. */
export async function prepareRenderIssue(
  input: Issue,
  repo: MediaAssetRepository,
): Promise<Issue> {
  const issue = migrateIssue(input);
  const ids = [...new Set(issueMediaReferences(issue).map((r) => r.assetId))];
  const renderAssets = [];
  for (const id of ids) {
    const value = await repo.get(id);
    if (value)
      renderAssets.push({
        asset: value.asset,
        dataUrl: imageDataUrl(value.asset.mimeType, value.bytes),
      });
  }
  return { ...issue, renderAssets };
}
