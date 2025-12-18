import React from "react";
import { Navigate } from "react-router-dom";
import { tokenStorage } from "../../utils/api";

function ProtectedRoute({ children }) {
    if (!tokenStorage.has()) {
        return <Navigate to="/admin/login" replace />;
    }

    return children;
}

export default ProtectedRoute;

