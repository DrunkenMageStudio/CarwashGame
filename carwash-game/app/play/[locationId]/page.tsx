import PlayClient from "./PlayClient";

export default async function Page({
  params,
}: {
  params: Promise<{ locationId: string }>;
}) {
  const { locationId } = await params;
  return <PlayClient locationId={locationId} />;
}