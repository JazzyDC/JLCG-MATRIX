import Tracker from "../tracker";
import { notFound } from "next/navigation";
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (
    !["tasks", "matrix", "calendar", "reports", "settings", "guide"].includes(
      section,
    )
  )
    notFound();
  return <Tracker page={section} />;
}
