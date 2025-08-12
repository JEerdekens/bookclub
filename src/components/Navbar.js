import React from "react";
import { Link, useLocation } from "react-router-dom";
import { FaBook, FaUser, FaHome, FaSignInAlt } from "react-icons/fa";

function BottomNavbar({ user }) {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bottom-navbar">
      {user ? (
        <>
          <Link to="/home" className={`nav-icon ${isActive("/home") ? "active" : ""}`}>
            <FaHome />
            <span>Home</span>
          </Link>
          <Link to="/books" className={`nav-icon ${isActive("/books") ? "active" : ""}`}>
            <FaBook />
            <span>Books</span>
          </Link>
          <Link to="/profile" className={`nav-icon ${isActive("/profile") ? "active" : ""}`}>
            <FaUser />
            <span>Profile</span>
          </Link>
        </>
      ) : (
        <Link to="/login" className={`nav-icon ${isActive("/login") ? "active" : ""}`}>
          <FaSignInAlt />
          <span>Login</span>
        </Link>
      )}
    </nav>
  );
}

export default BottomNavbar;
