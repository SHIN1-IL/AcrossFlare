import { ServicePage } from "@/components/marketing/service-page";

export default async function WorkspaceRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return <ServicePage params={params} service="workspace" />;
}
