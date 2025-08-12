import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

function Profile() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        return;
      }

      setUser(currentUser);

      const provider = currentUser.providerData[0]?.providerId;

      if (provider === "google.com") {
        setUsername(currentUser.displayName || "Google User");
      } else {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUsername(data.username || "User");
          } else {
            setUsername("User");
          }
        } catch (err) {
          console.error("Error fetching username:", err);
          setUsername("User");
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Sign-out error:", error);
    }
  };

  return (
    <div className="container mt-5">
      <div className="profile-card">
        <h2 className="mb-4">👤 Your Profile</h2>
        {user ? (
          <>
            {user.photoURL && (
              <img src={user.photoURL} alt="User avatar" className="profile-avatar" />
            )}
            <p><strong>Name:</strong> {username}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <button className="btn btn-outline-danger mt-3" onClick={handleSignOut}>
              Sign Out
            </button>
          </>
        ) : (
          <p className="text-muted">You’re not signed in. Please log in to view your profile.</p>
        )}
      </div>
    </div>
  );
}

export default Profile;
