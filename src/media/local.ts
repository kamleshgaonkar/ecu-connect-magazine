import {
  mediaAssetSchema,
  type MediaAsset,
  type MediaAssetData,
} from "../domain/media";
import type { MediaAssetRepository } from "./repository";
/** IndexedDB keeps binary images out of localStorage and survives reloads. */
export class IndexedDbMediaAssetRepository implements MediaAssetRepository {
  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("ecu-connect:media:v1", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("assets", { keyPath: "asset.id" });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(new Error("Unable to open local image storage."));
    });
  }
  private async run<T>(
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("assets", mode);
      const request = action(tx.objectStore("assets"));
      tx.oncomplete = () => {
        db.close();
        resolve(request.result);
      };
      tx.onerror = tx.onabort = () => {
        db.close();
        reject(
          new Error(
            "Local image storage failed. Check browser storage space and permissions.",
          ),
        );
      };
    });
  }
  async list(): Promise<MediaAsset[]> {
    const items = await this.run<MediaAssetData[]>("readonly", (s) =>
      s.getAll(),
    );
    return items.map(({ asset }) => mediaAssetSchema.parse(asset));
  }
  async get(id: string): Promise<MediaAssetData | null> {
    const value = await this.run<MediaAssetData | undefined>("readonly", (s) =>
      s.get(id),
    );
    return value ?? null;
  }
  async put(data: MediaAssetData) {
    const asset = mediaAssetSchema.parse(data.asset);
    if (asset.byteLength !== data.bytes.byteLength)
      throw new Error("Asset byte length does not match its metadata.");
    await this.run("readwrite", (s) => s.put({ asset, bytes: data.bytes }));
  }
  async remove(id: string) {
    await this.run("readwrite", (s) => s.delete(id));
  }
}
export const mediaRepository: MediaAssetRepository =
  new IndexedDbMediaAssetRepository();
