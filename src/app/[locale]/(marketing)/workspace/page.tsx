import { ServicePage } from "@/components/marketing/service-page";
import { STOREFRONT_REVALIDATE_SECONDS } from "@/lib/http-cache";
export const revalidate = STOREFRONT_REVALIDATE_SECONDS;

export default async function WorkspaceRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return <ServicePage params={params} service="workspace" />;
}
