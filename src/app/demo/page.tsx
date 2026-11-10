import type { Metadata } from "next";
import { DemoDashboard } from "@/components/demo-dashboard";

export const metadata: Metadata = { title: "Staff workspace demo" };

export default function DemoPage() {
  return <DemoDashboard />;
}
