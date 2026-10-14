import type { Metadata } from "next";
import { reportById } from "@/components/reports/report-defs";
import { ReportView } from "@/components/reports/report-view";

export async function generateMetadata({ params }: PageProps<"/reports/[reportId]">): Promise<Metadata> {
  const { reportId } = await params;
  return { title: reportById(reportId)?.title ?? "Report" };
}

export default async function ReportPage({ params }: PageProps<"/reports/[reportId]">) {
  const { reportId } = await params;
  return <ReportView id={decodeURIComponent(reportId)} />;
}
