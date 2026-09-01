import { ServicePage } from "@/components/marketing/service-page";

export const dynamic = "force-dynamic";

export default async function WorkspaceRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return <ServicePage params={params} service="workspace" />;
}
