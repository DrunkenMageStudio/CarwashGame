import ScoreboardClient from "./ScoreboardClient";

export default async function Page({
  params,
}: {
  params: Promise<{ locationId: string }>;
}) {
  const { locationId } = await params;
  return <ScoreboardClient locationId={locationId} />;
}