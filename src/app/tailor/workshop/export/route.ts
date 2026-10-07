import { requireTailor } from "@/server/auth/session";
import { listWorkshopJobs } from "@/server/modules/workshop/service";
import { csvCell } from "@/lib/workshop";
import { todayPK } from "@/lib/utils";

export async function GET() {
  const { tailor } = await requireTailor();
  const jobs = await listWorkshopJobs(tailor.id);
  const headings = ["Reference", "Customer", "Phone", "Garment", "Pieces", "Stage", "Delivery date", "Fitting date", "Total PKR", "Paid PKR", "Balance PKR", "Worker", "Cloth", "Bundle location", "Measurements", "Unit", "Notes"];
  const rows = jobs.map(j => [j.id, j.customerName, j.phone, j.garment, j.quantity, j.stage, j.dueDate, j.fittingDate, j.total, j.paid, j.total - j.paid, j.assignee, j.fabric, j.fabricLocation, j.measurements, j.unit, j.notes]);
  return new Response("\uFEFF" + [headings, ...rows].map(r => r.map(csvCell).join(",")).join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dressify-workshop-${todayPK()}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
