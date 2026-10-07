import { requireTailor } from "@/server/auth/session";
import { listWorkshopJobs } from "@/server/modules/workshop/service";
import { WorkshopBook } from "@/components/tailor/workshop-book";
import { todayPK } from "@/lib/utils";
export const metadata = { title: "Workshop book" };
export default async function WorkshopPage() {
  const { tailor } = await requireTailor();
  return <WorkshopBook jobs={await listWorkshopJobs(tailor.id)} today={todayPK()} />;
}
