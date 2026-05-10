import { DiagramView } from "./diagram-view";

export default async function ViewPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  return <DiagramView viewName={name} />;
}
