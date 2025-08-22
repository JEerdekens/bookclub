import React, { useState, useEffect } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { auth } from "../firebase";
import { setPersistence, browserLocalPersistence } from "firebase/auth";

import Navbar from "./Navbar";
import PublicLanding from "../pages/PublicLanding";
import PrivateHome from "../pages/PrivateHome";
import BookList from "../pages/BookList";
import BookDetails from "../pages/BookDetails";
import AddBook from "../pages/AddBook";
import Profile from "../pages/Profile";
import ChooseUsername from "../pages/ChooseUsername";
import PrivateRoute from "./PrivateRoute";
import BookPage from "../pages/BookPage";
import ScheduleBookClub from "../pages/ScheduleBookclub";

function AppWrapper() {
  const [user, setUser] = useState(null);


  const [authChecked, setAuthChecked] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let unsubscribe;

    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        unsubscribe = auth.onAuthStateChanged((currentUser) => {
          if (currentUser && currentUser.emailVerified) {
            setUser(currentUser);
          } else {
            setUser(null);
          }
          setAuthChecked(true);
        });

      })
      .catch((error) => {
        console.error("Failed to set persistence:", error);
        setAuthChecked(true);
      });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);


  const showNavbar = user && location.pathname !== "/";

  if (!authChecked) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  return (
    <>
      {showNavbar && <Navbar user={user} />}

      <Routes>
  <Route
    path="/"
    element={user ? <Navigate to="/home" replace /> : <PublicLanding />}
  />
  <Route path="/choose-username" element={<ChooseUsername />} />

  <Route
    path="/home"
    element={
      <PrivateRoute user={user}>
        <PrivateHome />
      </PrivateRoute>
    }
  />
  <Route
    path="/books"
    element={
      <PrivateRoute user={user}>
        <BookList />
      </PrivateRoute>
    }
  />
    <Route
    path="/schedule-bookclub"
    element={
      <PrivateRoute user={user}>
        <ScheduleBookClub />
      </PrivateRoute>
    }
  />
  <Route
    path="/book/:bookId"
    element={
      <PrivateRoute user={user}>
        <BookPage />
      </PrivateRoute>
    }
  />
  <Route
    path="/books/:id"
    element={
      <PrivateRoute user={user}>
        <BookDetails />
      </PrivateRoute>
    }
  />
  <Route
    path="/add"
    element={
      <PrivateRoute user={user}>
        <AddBook />
      </PrivateRoute>
    }
  />
  <Route
    path="/profile"
    element={
      <PrivateRoute user={user}>
        <Profile />
      </PrivateRoute>
    }
  />
</Routes>

    </>
  );
}

export default AppWrapper;
