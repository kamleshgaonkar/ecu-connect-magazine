import { IssueEditor } from "../../../components/issue-editor";
export default async function IssuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <IssueEditor issueId={id} />;
}
