import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin — Farmatotal",
  robots: "noindex, nofollow",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Skip auth check for the login page itself
  const user = await getCurrentUser();

  if (!user || (user.role !== "ADMIN" && user.role !== "STAFF")) {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <div />
          <span className="text-sm text-gray-500">{user.firstName} ({user.role})</span>
        </div>
        {children}
      </main>
    </div>
  );
}
