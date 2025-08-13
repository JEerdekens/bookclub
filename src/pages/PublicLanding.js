import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, provider } from "../firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification
} from "firebase/auth";
import '../App.css';
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";



function PublicLanding() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  const checkUsernameExists = async (uid) => {
    const userDoc = await getDoc(doc(db, "users", uid));
    return userDoc.exists() && userDoc.data().username;
  };

  const [unverifiedUser, setUnverifiedUser] = useState(null);



  const handleEmailAuth = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        if (!user.emailVerified) {
          setUnverifiedUser(user); // Save user for resend
          alert("Please verify your email before continuing.");
          return;
        }


        const hasUsername = await checkUsernameExists(user.uid);

        if (hasUsername) {
          navigate("/home");
        } else {
          navigate("/choose-username");
        }
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await sendEmailVerification(user);
        alert("Verification email sent! Please check your inbox before signing in.");
        auth.signOut();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedUser) return;

    try {
      await sendEmailVerification(unverifiedUser);
      alert("Verification email resent! Please check your inbox.");
    } catch (err) {
      alert("Error resending email: " + err.message);
    }
  };



  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const hasUsername = await checkUsernameExists(user.uid);

      if (hasUsername || user.displayName) {
        navigate("/home");
      } else {
        navigate("/choose-username");
      }
    } catch (err) {
      alert(err.message);
    }
  };


  const handleForgotPassword = async () => {
    if (!email) {
      alert("Enter your email first.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent!");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className={`landing-page d-flex flex-column min-vh-100`}>
      <div className="container d-flex flex-grow-1 justify-content-center align-items-center">
        <div className="login-form-wrapper text-center animate-fade-in">
          <div className="logo-section mb-4">
            <img src="/bookclub/images/logo_round.png" alt="Book Logo" style={{ width: "250px" }} />
          </div>

          <div className="logo-section mb-4 mt-2">
            <p className="lead fst-italic text-muted">Your next chapter starts here</p>
          </div>

          <div className="mt-4">
            <button
              className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-2"
              onClick={handleGoogleSignIn}
            >
              <img
                src="/bookclub/images/google-icon.png"
                alt="Google"
                style={{ width: "20px", height: "20px" }}
              />
              Continue with Google
            </button>
          </div>

          <div className="or-divider my-4 d-flex align-items-center">
            <hr className="flex-grow-1" />
            <span className="or-text px-3">OR</span>
            <hr className="flex-grow-1" />
          </div>

          <form onSubmit={handleEmailAuth}>
            <div className="mb-3">
              <input
                type="email"
                className="form-control"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="mb-3">
              <input
                type="password"
                className="form-control"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-bd-primary w-100 mb-2">
              {isLogin ? "Sign In" : "Sign Up"}
            </button>

            {isLogin && (
              <div className="mb-3 mt-1 text-end">
                <button
                  type="button"
                  className="btn btn-link p-0"
                  onClick={handleForgotPassword}
                  style={{ fontSize: "15px", color: "#b38349" }}
                >
                  Forgot Password?
                </button>
              </div>
            )}

            <div className="text-center mt-5" style={{ fontSize: "14px", color: "#6c757d" }}>
              {isLogin ? "Don't have an account?" : "Already have an account?"}
            </div>

            <button
              type="button"
              className="btn btn-link w-100"
              style={{ fontSize: "14px", color: "#b38349" }}
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Create account" : "Already have an account?"}

              {unverifiedUser && (
                <div className="mt-3 text-center">
                  <button
                    type="button"
                    className="btn btn-outline-warning"
                    onClick={handleResendVerification}
                  >
                    Resend Verification Email
                  </button>
                </div>
              )}

            </button>
          </form>
        </div>
      </div>

      <footer className="bg-dark text-center text-light py-3 mt-auto">
        <small>© 2025 XOXO Gossip Girl</small>
      </footer>
    </div>
  );
}

export default PublicLanding;
