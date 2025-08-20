import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc
} from "firebase/firestore";
import "../App.css";
import { Link } from "react-router-dom";

function PrivateHome() {
  const [userData, setUserData] = useState(null);
  const [clubData, setClubData] = useState(null);
  const [bookData, setBookData] = useState(null);
  const [progress, setProgress] = useState(null);
  const [rating, setRating] = useState(null);
  const [showMenu, setShowMenu] = useState(false);


  const [showProgressForm, setShowProgressForm] = useState(false);
  const [inputType, setInputType] = useState("percent");
  const [inputValue, setInputValue] = useState({ percent: "", pagesRead: "", totalPages: "" });

  const [showRatingForm, setShowRatingForm] = useState(false);
  const [newRating, setNewRating] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const userDoc = await getDoc(doc(db, "users", uid));
      if (!userDoc.exists()) return;

      const user = userDoc.data();
      setUserData(user);

      const clubRef = user.bookclub;
      if (!clubRef) return;

      const clubDoc = await getDoc(clubRef);
      if (!clubDoc.exists()) return;

      const club = clubDoc.data();
      setClubData(club);

      const bookRef = club.currentBookId;
      if (!bookRef) return;

      const bookDoc = await getDoc(bookRef);
      if (!bookDoc.exists()) return;

      const book = { id: bookDoc.id, ...bookDoc.data() };

      if (!book.image) {
        const placeholder = "https://bookstoreromanceday.org/wp-content/uploads/2020/09/book-cover-placeholder.png";
        await updateDoc(bookRef, { image: placeholder });
        book.image = placeholder;
      }

      setBookData(book);

      const progressQuery = query(
        collection(db, "progress"),
        where("user", "==", doc(db, "users", uid)),
        where("books", "==", bookRef)
      );
      const progressSnap = await getDocs(progressQuery);
      if (!progressSnap.empty) {
        setProgress(progressSnap.docs[0].data().progress);
      }

      const ratingQuery = query(
        collection(db, "ratings"),
        where("user", "==", doc(db, "users", uid)),
        where("book", "==", bookRef)
      );
      const ratingSnap = await getDocs(ratingQuery);
      if (!ratingSnap.empty) {
        setRating(ratingSnap.docs[0].data().rating);
      }
    };

    fetchData();
  }, []);

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
      if (!pagesRead || !totalPages || totalPages <= 0) return;
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
        await updateDoc(progressSnap.docs[0].ref, { progress: newProgress });
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

  const handleRatingSubmit = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !bookData || !newRating) return;

    const ratingValue = parseFloat(newRating);
    if (ratingValue < 0.5 || ratingValue > 5) return;

    try {
      const ratingQuery = query(
        collection(db, "ratings"),
        where("user", "==", doc(db, "users", uid)),
        where("book", "==", doc(db, "books", bookData.id))
      );
      const ratingSnap = await getDocs(ratingQuery);

      if (!ratingSnap.empty) {
        await updateDoc(ratingSnap.docs[0].ref, { rating: ratingValue });
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
        >
          {full ? "★" : "☆"}
        </span>
      );
      stars.push(
        <span
          key={`half-${i}`}
          style={{ cursor: "pointer", fontSize: "1.5rem", color: "#f5c518" }}
          onClick={() => onChange(i - 0.5)}
        >
          {rating >= i - 0.5 && rating < i ? "⯨" : ""}
        </span>
      );
    }
    return <div className="star-rating">{stars}</div>;
  };

  return (
    <div className="container py-5">
      <div className="text-center">
        <h2><strong>Currently Reading</strong></h2>
      </div>

      <div className="row g-4">
        <div className="col-md-6 container-bookshelf">
          <div className="p-3 text-center">
            {bookData ? (
              <>
                <div className="book-cover-zone mb-3 animate-fade-in">
                  <Link to={`/book/${bookData.id}`}>
                    <img
                      src={bookData.image}
                      alt="Book cover"
                      className="img-fluid book-on-shelf"
                    />
                  </Link>
                </div>


<div className="book-header d-flex align-items-center justify-content-between position-relative mb-3">
  {/* Progress on the left */}
  <div className="progress-display m-0">{progress !== null ? `${progress}%` : "0%"}</div>

  {/* Title centered */}
  <div className="flex-grow-1 text-center">
    <h4 className="book-title m-0 ms-3 me-3"><strong>{bookData.title}</strong></h4>
  </div>

  {/* Three-dot icon on the right */}
  <div className="menu-icon-wrapper">
    <button
      className="menu-icon"
      onClick={() => setShowMenu(prev => !prev)}
      aria-label="Options"
    >
      <span className="three-dots">⋯</span>
    </button>

    {/* Popup menu */}
    {showMenu && (
      <div className="popup-menu">
        <button className="popup-item" onClick={() => { setShowRatingForm(true); setShowMenu(false); }}>
          ⭐ Rate this book
        </button>
        <button className="popup-item" onClick={() => { setShowProgressForm(true); setShowMenu(false); }}>
          📈 Update progress
        </button>
      </div>
    )}
  </div>
</div>


               {/*  <p className="progress-display">{progress !== null ? `${progress}%` : "0%"}</p>
                <h4 className="mt-2"><strong>{bookData.title}</strong></h4>
                <p className="text-muted">{bookData.author}</p>

                <p className="rating-prompt">Rate this book</p>
                <StarRating rating={newRating || rating || 0} onChange={setNewRating} />

                <div className="dropdown mt-3">
                  <button className="btn btn-outline-dark dropdown-toggle btn-sm" type="button" data-bs-toggle="dropdown">
                    ☰
                  </button>
                  <ul className="dropdown-menu">
                    <li><button className="dropdown-item" onClick={() => setShowRatingForm(true)}>⭐ Rate</button></li>
                    <li><button className="dropdown-item" onClick={() => setShowProgressForm(true)}>📈 Update progress</button></li>
                  </ul>
                </div> */}

                {showRatingForm && (
                  <div className="mt-3">
                    <label>Give a rating (0.5–5):</label>
                    <StarRating rating={newRating} onChange={setNewRating} />
                    <div className="mt-2">
                      <button className="btn btn-sm btn-primary me-2" onClick={handleRatingSubmit}>Submit</button>
                      <button className="btn btn-sm btn-secondary" onClick={() => setShowRatingForm(false)}>Cancel</button>
                    </div>
                  </div>
                )}

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
              </>
            ) : (
              <p>Loading book info...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PrivateHome;
