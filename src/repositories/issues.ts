import { migrateIssue, type Issue } from "../domain/issue";
import { sampleIssue } from "../domain/sample";
export interface IssueRepository {
  list(): Promise<Issue[]>;
  get(id: string): Promise<Issue | null>;
  save(issue: Issue): Promise<void>;
  remove(id: string): Promise<void>;
}
const key = "ecu-connect:issues:v1";
export class LocalIssueRepository implements IssueRepository {
  private read(): Issue[] {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      localStorage.setItem(key, JSON.stringify([sampleIssue]));
      return [structuredClone(sampleIssue)];
    }
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data))
      throw new Error(
        "Saved issues are invalid. Your stored content has not been overwritten.",
      );
    return data.map((i) => migrateIssue(i));
  }
  async list() {
    return this.read();
  }
  async get(id: string) {
    return this.read().find((i) => i.id === id) ?? null;
  }
  async save(issue: Issue) {
    const parsed = migrateIssue(issue);
    delete parsed.renderAssets;
    const all = this.read();
    const i = all.findIndex((x) => x.id === issue.id);
    if (i < 0) all.push(parsed);
    else all[i] = parsed;
    localStorage.setItem(key, JSON.stringify(all));
  }
  async remove(id: string) {
    localStorage.setItem(
      key,
      JSON.stringify(this.read().filter((i) => i.id !== id)),
    );
  }
}
// UI depends only on this contract. Replace with a Supabase adapter/provider later.
export const issueRepository: IssueRepository = new LocalIssueRepository();
