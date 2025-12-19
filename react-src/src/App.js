import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import Home from "./pages/Home";
import Login from "./pages/admin/Login";
import Dashboard from "./pages/admin/Dashboard";
import VisaTypes from "./pages/admin/VisaTypes";
import FormTemplates from "./pages/admin/FormTemplates";
import TravelCases from "./pages/admin/TravelCases";
import PublicForm from "./pages/PublicForm";
import AdminLayout from "./layouts/AdminLayout";
import ProtectedRoute from "./components/common/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/form/:token" element={<PublicForm />} />
        <Route path="/admin/login" element={<Login />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="visa-types" element={<VisaTypes />} />
          <Route path="form-templates" element={<FormTemplates />} />
          <Route path="travel-cases" element={<TravelCases />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

