import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DemoProvider } from "@/components/demo-provider";
import { DemoNotice } from "@/components/ui";
import "react-day-picker/style.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Enquiry — Clinic enquiry tracker", template: "%s | Enquiry" },
  description: "A portfolio demonstration of a focused clinic enquiry workflow. Fictional data only.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en" data-scroll-behavior="smooth"><body><DemoProvider><DemoNotice />{children}</DemoProvider></body></html>;
}

