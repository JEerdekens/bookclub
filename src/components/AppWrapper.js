import React, { useState, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { auth } from "../firebase";

import Navbar from "./Navbar";
import PublicLanding from "../pages/PublicLanding";
import PrivateHome from "../pages/PrivateHome";
import BookList from "../pages/BookList";
import BookDetails from "../pages/BookDetails";
import AddBook from "../pages/AddBook";
import Profile from "../pages/Profile";
import ChooseUsername from "../pages/ChooseUsername";



function AppWrapper() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  const showNavbar = user && location.pathname !== "/";

  if (!authChecked) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  return (
    <>
      {showNavbar && <Navbar user={user} />}

      <Routes>
        <Route path="/" element={<PublicLanding />} />
        <Route path="/choose-username" element={<ChooseUsername />} />
        {user && (
          <>
            <Route path="/home" element={<PrivateHome />} />
            <Route path="/books" element={<BookList />} />
            <Route path="/books/:id" element={<BookDetails />} />
            <Route path="/add" element={<AddBook />} />
            <Route path="/profile" element={<Profile />} />
          </>
        )}
      </Routes>
    </>
  );
}
export default AppWrapper;