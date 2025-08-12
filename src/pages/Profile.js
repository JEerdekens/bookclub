import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import "../App.css";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  updatePassword
} from "firebase/auth";


function Profile() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [oldPassword, setOldPassword] = useState("");

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
            setNewUsername(data.username || "");
            if (data.photoBase64) {
              setUser((prev) => ({ ...prev, photoBase64: data.photoBase64 }));
            }

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

  const handleUsernameUpdate = async () => {
    if (!newUsername.trim()) return;

    try {
      await updateDoc(doc(db, "users", user.uid), { username: newUsername });
      setUsername(newUsername);
      setMessage("Username updated!");
    } catch (err) {
      console.error("Username update error:", err);
      setMessage("Failed to update username.");
    }
  };

  const handlePasswordChange = async () => {
    if (!oldPassword || !newPassword) {
      setMessage("Please fill in both fields.");
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, oldPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setMessage("Password changed successfully!");
      setOldPassword("");
      setNewPassword("");
    } catch (err) {
      console.error("Password change error:", err);
      setMessage("Failed to change password. Check your old password or sign in again.");
    }
  };

  const handleForgotPassword = async () => {
    try {
      await sendPasswordResetEmail(auth, user.email);
      setMessage("Password reset email sent!");
    } catch (err) {
      console.error("Reset error:", err);
      setMessage("Failed to send reset email.");
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;

      try {
        await updateDoc(doc(db, "users", user.uid), {
          photoBase64: base64String
        });

        // Update local user state to reflect new image
        setUser((prev) => ({ ...prev, photoBase64: base64String }));
        setMessage("Profile image updated!");
      } catch (err) {
        console.error("Image upload error:", err);
        setMessage("Failed to upload image.");
      }
    };
    reader.readAsDataURL(file);
  };




  return (
    <div className="container mt-5">
      <div>
        <h2 className="mb-4 text-center">Your account</h2>
        <div className="p-4 mb-4">

          {user ? (
            <>
              <div className="d-flex align-items-center mb-4 gap-3">
                <img
                  src={user?.photoURL || user?.photoBase64 || "/bookclub/images/default-avatar.png"}
                  alt="User avatar"
                  className="rounded-circle"
                  style={{ width: "60px", height: "60px", objectFit: "cover" }}
                />
                <div className="d-flex flex-column justify-content-center" style={{ height: "80px" }}>
                  <div style={{ fontWeight: "bold", fontSize: "1rem" }}>{username}</div>
                  <div style={{ fontSize: "0.9rem", color: "#666" }}>{user?.email}</div>
                </div>
              </div>


              <div className="d-grid gap-2 mt-4">
                <button
                  className="btn btn-bd-primary"
                  data-bs-toggle="modal"
                  data-bs-target="#usernameModal"
                >
                  Update Username
                </button>

                <button
                  className="btn btn-bd-primary"
                  data-bs-toggle="modal"
                  data-bs-target="#profilePicModal"
                >
                  Change Profile Picture
                </button>


                <button
                  className="btn btn-outline-bd-primary"

                  data-bs-toggle="modal"
                  data-bs-target="#passwordModal"
                >
                  Change Password
                </button>

                <button className="btn" style={{ color: "#e41313ff" }} onClick={handleSignOut}>
                  Sign Out
                </button>

              </div>

              {message && (
                <div className="alert alert-info mt-4 text-center" role="alert">
                  {message}
                </div>
              )}
            </>
          ) : (
            <p className="text-muted text-center">You’re not signed in. Please log in to view your profile.</p>
          )}
        </div>

      </div>
      {/* Username Modal */}
      <div className="modal fade" id="usernameModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Update Username</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              <input
                type="text"
                className="form-control"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
              />
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-bd-primary"
                data-bs-dismiss="modal"
                onClick={handleUsernameUpdate}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Password Modal */}
      <div className="modal fade" id="passwordModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Change Password</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              <input
                type="password"
                className="form-control mb-2"
                placeholder="Current Password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
              <input
                type="password"
                className="form-control mb-2"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-link p-0"
                onClick={handleForgotPassword}
                style={{ fontSize: "14px", color: "#b38349" }}
              >
                Forgot Password?
              </button>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-warning"
                data-bs-dismiss="modal"
                onClick={handlePasswordChange}
              >
                Change Password
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="modal fade" id="profilePicModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Change Profile Picture</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body text-center">
              <img
                src={user?.photoURL || user?.photoBase64 || "/default-avatar.png"}
                alt="Current avatar"
                className="rounded-circle mb-3"
                style={{ width: "100px", height: "100px", objectFit: "cover" }}
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e)}
                className="form-control"
              />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default Profile;
