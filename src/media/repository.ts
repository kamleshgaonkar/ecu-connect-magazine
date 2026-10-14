import {
  mediaAssetSchema,
  type MediaAsset,
  type MediaAssetData,
} from "../domain/media";
/** Local binary assets live behind this contract, separate from issue JSON.
 * Phase 3A supplies a session adapter; durable browser storage/upload UI is deferred.
 * No arbitrary URL or external storage is part of this interface.
 */
export interface MediaAssetRepository {
  list(): Promise<MediaAsset[]>;
  get(id: string): Promise<MediaAssetData | null>;
  put(data: MediaAssetData): Promise<void>;
  remove(id: string): Promise<void>;
}
export class MemoryMediaAssetRepository implements MediaAssetRepository {
  private assets = new Map<string, MediaAssetData>();
  async list() {
    return [...this.assets.values()].map(({ asset }) => structuredClone(asset));
  }
  async get(id: string) {
    const item = this.assets.get(id);
    return item
      ? { asset: structuredClone(item.asset), bytes: item.bytes.slice() }
      : null;
  }
  async put(data: MediaAssetData) {
    const asset = mediaAssetSchema.parse(data.asset);
    if (asset.byteLength !== data.bytes.byteLength)
      throw new Error("Asset byte length does not match its metadata.");
    this.assets.set(asset.id, { asset, bytes: data.bytes.slice() });
  }
  async remove(id: string) {
    this.assets.delete(id);
  }
}
