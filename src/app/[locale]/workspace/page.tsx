import { ServicePage } from "@/components/marketing/service-page";
export const revalidate = 3600;

export default async function WorkspaceRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return <ServicePage params={params} service="workspace" />;
}
