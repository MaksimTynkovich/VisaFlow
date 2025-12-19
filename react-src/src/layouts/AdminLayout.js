import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/admin/Sidebar";

function AdminLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex">
      <Sidebar />
      <div className="flex-1 overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;

