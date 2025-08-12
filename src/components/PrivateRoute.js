import React from "react";
import { Navigate } from "react-router-dom";

function PrivateRoute({ user, children }) {
  return user ? children : <Navigate to="/" replace />;
}

export default PrivateRoute;
