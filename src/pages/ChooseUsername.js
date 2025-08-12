import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where
} from "firebase/firestore";

function ChooseUsername() {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        navigate("/");
        return;
      }

      await currentUser.reload(); // Ensure latest profile info
      setUser(currentUser);

      const userDoc = await getDoc(doc(db, "users", currentUser.uid));

      if (userDoc.exists()) {
        navigate("/home");
      } else if (currentUser.providerData[0]?.providerId === "google.com") {
        const googleName = currentUser.displayName?.trim().toLowerCase();

        const isUnique = await checkUsernameUnique(googleName);
        const finalName = isUnique ? googleName : `${googleName}${Date.now()}`;

        try {
          await setDoc(doc(db, "users", currentUser.uid), {
            username: finalName,
            email: currentUser.email,
            createdAt: new Date()
          });

          try {
            await currentUser.updateProfile({ displayName: finalName });
            await currentUser.reload();
          } catch (profileErr) {
            console.warn("Profile update failed:", profileErr);
            // Optional: show a softer message or ignore
          }

          navigate("/home");
        } catch (err) {
          console.error("Error auto-assigning Google username:", err);
          setError("Something went wrong while saving your username.");
        }
      } else {
        setLoading(false); // Show manual form
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const checkUsernameUnique = async (name) => {
    const q = query(collection(db, "users"), where("username", "==", name));
    const snapshot = await getDocs(q);
    return snapshot.empty;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setChecking(true);

    const trimmed = username.trim().toLowerCase();
    if (!trimmed || trimmed.length < 3) {
      setError("Username must be at least 3 characters.");
      setChecking(false);
      return;
    }

    const isUnique = await checkUsernameUnique(trimmed);
    if (!isUnique) {
      setError("That username is already taken.");
      setChecking(false);
      return;
    }

    try {
      await setDoc(doc(db, "users", user.uid), {
        username: trimmed,
        email: user.email,
        createdAt: new Date()
      });

      try {
        await user.updateProfile({ displayName: trimmed });
        await user.reload();
      } catch (profileErr) {
        console.warn("Profile update failed:", profileErr);
        // Optional: show a softer message or ignore
      }

      navigate("/home");
    } catch (err) {
      console.error("Error saving username:", err);
      setError("Something went wrong while saving your username.");
    } finally {
      setChecking(false);
    }
  };

  if (loading || !user) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  return (
    <div className="container mt-5 text-center">
      <h2 className="mb-4">👋 Welcome!</h2>
      <p className="lead">What should we call you?</p>
      <form onSubmit={handleSubmit} className="mt-4">
        <input
          type="text"
          className="form-control mb-3"
          placeholder="Choose a username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={checking}
        />
        {error && <p className="text-danger">{error}</p>}
        <button type="submit" className="btn btn-bd-primary w-100" disabled={checking}>
          {checking ? "Checking..." : "Continue"}
        </button>
      </form>
    </div>
  );
}

export default ChooseUsername;
