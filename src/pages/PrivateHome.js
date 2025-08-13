import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs, addDoc
} from "firebase/firestore";
import "../App.css";
import { updateDoc } from "firebase/firestore"; // make sure this is imported
import { Link } from "react-router-dom";




function PrivateHome() {
  const [userData, setUserData] = useState(null);
  const [clubData, setClubData] = useState(null);
  const [bookData, setBookData] = useState(null);
  const [progress, setProgress] = useState(null);
  const [rating, setRating] = useState(null);

  const [showProgressForm, setShowProgressForm] = useState(false);
  const [inputType, setInputType] = useState("percent"); // "percent" or "pages"
  const [inputValue, setInputValue] = useState({ percent: "", pagesRead: "", totalPages: "" });

  const [showRatingForm, setShowRatingForm] = useState(false);
  const [newRating, setNewRating] = useState(0);





  useEffect(() => {
    const fetchData = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      console.log("Fetching data for user:", uid);

      const userDoc = await getDoc(doc(db, "users", uid));
      if (!userDoc.exists()) {
        console.error("User document not found.");
        return;
      }

      const user = userDoc.data();
      setUserData(user);

      const clubRef = user.bookclub;
      if (!clubRef) {
        console.warn("User is not linked to a bookclub.");
        return;
      }

      const clubDoc = await getDoc(clubRef);
      if (!clubDoc.exists()) {
        console.log("clubRef path:", clubRef?.path);

        console.error("Bookclub document not found.");
        return;
      }

      const club = clubDoc.data();
      setClubData(club);

      const bookRef = club.currentBookId;
      console.log("Current book reference:", bookRef?.path);
      if (!bookRef) {
        console.warn("No current book set for this bookclub.");
        return;
      }

      const bookDoc = await getDoc(bookRef);
      if (!bookDoc.exists()) {
        console.error("Book document not found.");
        return;
      }

      const book = { id: bookDoc.id, ...bookDoc.data() }; // ✅ capture ID


      if (!book.image) {
        const placeholder = "https://bookstoreromanceday.org/wp-content/uploads/2020/09/book-cover-placeholder.png";
        await updateDoc(bookRef, { image: placeholder });
        book.image = placeholder;
      }

      setBookData(book);

      //Get progress
      const progressQuery = query(
        collection(db, "progress"),
        where("user", "==", doc(db, "users/", uid)),
        where("books", "==", bookRef)
      );
      const progressSnap = await getDocs(progressQuery);
      if (!progressSnap.empty) {
        setProgress(progressSnap.docs[0].data().progress);
      }

      //Get rating
      const ratingQuery = query(
        collection(db, "ratings"),
        where("user", "==", doc(db, "users/", uid)),
        where("book", "==", bookRef)
      );
      const ratingSnap = await getDocs(ratingQuery);
      if (!ratingSnap.empty) {
        setRating(ratingSnap.docs[0].data().rating);
      }
    };

    fetchData();
  }, []);

  const formatDate = (timestamp) => {
    const date = timestamp?.toDate?.();
    return date ? date.toLocaleDateString() : "Unknown";
  };

  const handleProgressUpdate = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !bookData) return;

    let newProgress;

    if (inputType === "percent") {
      const percent = parseFloat(inputValue.percent);
      newProgress = Math.min(100, Math.max(0, percent));
    } else {
      const pagesRead = parseInt(inputValue.pagesRead);
      const totalPages = parseInt(inputValue.totalPages);

      if (!pagesRead || !totalPages || totalPages <= 0) {
        console.warn("Invalid page input");
        return;
      }

      newProgress = Math.round((pagesRead / totalPages) * 100);
      newProgress = Math.min(100, Math.max(0, newProgress));
    }

    try {
      const progressQuery = query(
        collection(db, "progress"),
        where("user", "==", doc(db, "users", uid)),
        where("books", "==", doc(db, "books", bookData.id))
      );
      const progressSnap = await getDocs(progressQuery);

      if (!progressSnap.empty) {
        const progressDocRef = progressSnap.docs[0].ref;
        await updateDoc(progressDocRef, { progress: newProgress });
      } else {
        await addDoc(collection(db, "progress"), {
          user: doc(db, "users", uid),
          books: doc(db, "books", bookData.id),
          progress: newProgress
        });
      }

      setProgress(newProgress);
      setShowProgressForm(false);
      setInputValue({ percent: "", pagesRead: "", totalPages: "" });
    } catch (error) {
      console.error("Error updating progress:", error);
    }
  };

  const StarRating = ({ rating, onChange }) => {
    const stars = [];

    for (let i = 1; i <= 5; i++) {
      const full = i <= rating;
      const half = i - 0.5 === rating;

      stars.push(
        <span
          key={i}
          style={{ cursor: "pointer", fontSize: "1.5rem", color: "#f5c518" }}
          onClick={() => onChange(i)}
          onMouseEnter={() => onChange(i)}
        >
          {full ? "★" : half ? "⯨" : "☆"}
        </span>
      );
      stars.push(
        <span
          key={`half-${i}`}
          style={{ cursor: "pointer", fontSize: "1.5rem", color: "#f5c518" }}
          onClick={() => onChange(i - 0.5)}
          onMouseEnter={() => onChange(i - 0.5)}
        >
          {rating >= i - 0.5 && rating < i ? "⯨" : ""}
        </span>
      );
    }

    return <div>{stars}</div>;
  };

  const handleRatingSubmit = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !bookData || !newRating) return;

    const ratingValue = parseFloat(newRating);
    if (ratingValue < 0.5 || ratingValue > 5) {
      console.warn("Rating must be between 0.5 and 5");
      return;
    }

    try {
      const ratingQuery = query(
        collection(db, "ratings"),
        where("user", "==", doc(db, "users", uid)),
        where("book", "==", doc(db, "books", bookData.id))
      );
      const ratingSnap = await getDocs(ratingQuery);

      if (!ratingSnap.empty) {
        const ratingDocRef = ratingSnap.docs[0].ref;
        await updateDoc(ratingDocRef, { rating: ratingValue });
      } else {
        await addDoc(collection(db, "ratings"), {
          user: doc(db, "users", uid),
          book: doc(db, "books", bookData.id),
          rating: ratingValue
        });
      }

      setRating(ratingValue);
      setShowRatingForm(false);
      setNewRating(0);
    } catch (error) {
      console.error("Error submitting rating:", error);
    }
  };





  const getCountdown = (timestamp) => {
    const date = timestamp?.toDate?.();
    if (!date) return "";
    const now = new Date();
    const diff = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
    return `${diff} day${diff !== 1 ? "s" : ""}`;
  };

  return (
    <div className="container py-5">
      <div className="text-center mb-5">
        <h2>Home</h2>
        {/* <p className="lead">
          Browse your collection, track your reading, and get ready for the next book club.
        </p> */}
      </div>

      <div className="row g-4">
        {/* Currently Reading */}
        <div className="col-md-6">
          <div className=" p-3">
            <h4>
              <strong>
                <i>{clubData?.name || "Your club"}</i>
              </strong>{" "}
              is currently Reading
            </h4>
            {bookData ? (
              <>
                <div className="book-cover mb-3 center">
                  {bookData.image && (
                    <Link to={`/book/${bookData.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <img
                      src={
                        bookData.image ||
                        "https://bookstoreromanceday.org/wp-content/uploads/2020/09/book-cover-placeholder.png"
                      }
                      alt="Book cover"
                      className="img-fluid mb-2"
                    />
</Link>
                  )}
                </div>
                <p><strong>{bookData.title}</strong> by {bookData.author}</p>
                <p>Your progress: {progress !== null ? `${progress}%` : "Not started"}</p>
                <p>Your rating: {rating !== null ? `${rating} ⭐` : "Not rated yet"}</p>
                <button
                  className="btn btn-outline-success btn-sm"
                  onClick={() => setShowProgressForm(true)}
                >
                  Update Progress
                </button>

                <button
                  className="btn btn-outline-primary btn-sm ms-2"
                  onClick={() => setShowRatingForm(true)}
                >
                  Rate this Book
                </button>

                {showRatingForm && (
                  <div className="mt-3">
                    <label>Give a rating (1–5):</label>
                    <StarRating rating={newRating} onChange={setNewRating} />

                    <button
                      className="btn btn-sm btn-primary me-2"
                      onClick={handleRatingSubmit}
                    >
                      Submit
                    </button>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => setShowRatingForm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                )}

              </>
            ) : (
              <p>Loading book info...</p>
            )}
          </div>
        </div>
        {showProgressForm && (
          <div className="mt-3">
            <label>Update your progress:</label>
            <div className="mb-2">
              <select
                value={inputType}
                onChange={(e) => setInputType(e.target.value)}
                className="form-select form-select-sm"
              >
                <option value="percent">By Percentage</option>
                <option value="pages">By Pages</option>
              </select>
            </div>

            {inputType === "percent" ? (
              <input
                type="number"
                className="form-control form-control-sm mb-2"
                placeholder="Enter % read"
                value={inputValue.percent}
                onChange={(e) =>
                  setInputValue({ ...inputValue, percent: e.target.value })
                }
                min="0"
                max="100"
              />
            ) : (
              <>
                <input
                  type="number"
                  className="form-control form-control-sm mb-2"
                  placeholder="Pages you've read"
                  value={inputValue.pagesRead}
                  onChange={(e) =>
                    setInputValue({ ...inputValue, pagesRead: e.target.value })
                  }
                  min="0"
                />
                <input
                  type="number"
                  className="form-control form-control-sm mb-2"
                  placeholder="Total pages (e.g. your edition)"
                  value={inputValue.totalPages}
                  onChange={(e) =>
                    setInputValue({ ...inputValue, totalPages: e.target.value })
                  }
                  min="1"
                />
              </>
            )}


            <button
              className="btn btn-sm btn-primary me-2"
              onClick={handleProgressUpdate}
            >
              Save
            </button>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => setShowProgressForm(false)}
            >
              Cancel
            </button>
          </div>
        )}






        {/* Next Book Club */}
        <div className="col-md-6">
          <div className="card shadow-sm p-3">
            <h4>📅 Next Book Club</h4>
            {clubData ? (
              <>
                <p>Club: <strong>{clubData.name}</strong></p>
                <p>Meeting: {formatDate(clubData.nextMeeting)}</p>
                <p>Countdown: {getCountdown(clubData.nextMeeting)}</p>
              </>
            ) : (
              <p>Loading club info...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PrivateHome;
