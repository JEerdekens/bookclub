
import { Link, useLocation } from "react-router-dom";
import { FaBook, FaUser, FaHome, FaSignInAlt } from "react-icons/fa";
import React, { useState, useEffect } from "react";
import { doc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase"; // Adjust path based on your project structure
import { onSnapshot } from "firebase/firestore";



function BottomNavbar({ user }) {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;
  const [notifications, setNotifications] = useState([]);
  const [hasUnread, setHasUnread] = useState(false);

  
  const fetchNotifications = async () => {
    if (!user) {
      console.warn("No user found. Skipping notification fetch.");
      return;
    }
  
    console.log("Fetching notifications for user:", user.uid);
  
    const userRef = doc(db, "users", user.uid);
  const q = query(
    collection(db, "notifications"),
    where("user", "==", userRef)
  );
  
  
  
    try {
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
      console.log("Fetched notifications:", data);
  
      setNotifications(data);
      const unread = data.some(n => !n.isRead);
      console.log("Has unread notifications:", unread);
      setHasUnread(unread);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };
  

  useEffect(() => {
  if (!user) return;

  const userRef = doc(db, "users", user.uid);
  const q = query(collection(db, "notifications"), where("user", "==", userRef));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const data = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds);

    setNotifications(data);
    setHasUnread(data.some(n => !n.isRead));
  });

  return () => unsubscribe();
}, [user]);




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
  <div className="position-relative d-inline-block">
    <FaUser />
    {hasUnread && (
      <span
        className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle"
        title="You have unread notifications"
      ></span>
    )}
  </div>
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
