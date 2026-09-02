import { ServicePage } from "@/components/marketing/service-page";
export const revalidate = 3600;

export default async function StandardRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return <ServicePage params={params} service="standard" />;
}
