import { migrateIssue, type Issue } from "../domain/issue";
import { issueMediaReferences } from "./render";
import type { MediaAssetRepository } from "./repository";
/** Binary files avoid base64 expansion in transit. Originals remain untouched in IndexedDB. */
export async function pdfFormData(
  input: Issue,
  repo: MediaAssetRepository,
  progress?: (text: string) => void,
) {
  const issue = migrateIssue(input);
  delete issue.renderAssets;
  const form = new FormData();
  form.set("issue", JSON.stringify(issue));
  const assets = [];
  const ids = [
    ...new Set(
      issueMediaReferences(issue).map((reference) => reference.assetId),
    ),
  ];
  for (const [index, id] of ids.entries()) {
    progress?.(`Preparing image ${index + 1} of ${ids.length}…`);
    const data = await repo.get(id);
    if (!data)
      throw new Error(
        `Original image ${id} is missing from this browser. Restore it before exporting.`,
      );
    assets.push(data.asset);
    form.set(
      `image:${id}`,
      new Blob([new Uint8Array(data.bytes)], { type: data.asset.mimeType }),
      data.asset.name,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  form.set("assets", JSON.stringify(assets));
  return form;
}
