import React, { useEffect, useState } from "react";
import "../App.css";
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

import { Link } from "react-router-dom";
import CircleMeter from "../components/CircleMeter";

import { useNavigate } from "react-router-dom";




function PrivateHome() {
  const [userData, setUserData] = useState(null);
  const [clubData, setClubData] = useState(null);
  const [bookData, setBookData] = useState(null);
  const [progress, setProgress] = useState(null);
  const [rating, setRating] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const [showProgressForm, setShowProgressForm] = useState(false);
  const [inputType, setInputType] = useState("percent");
  const [inputValue, setInputValue] = useState({ percent: "", pagesRead: "", totalPages: "" });

  const [showRatingForm, setShowRatingForm] = useState(false);
  const [newRating, setNewRating] = useState(0);

  useEffect(() => {
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVh();
    window.addEventListener('resize', setVh);
    return () => window.removeEventListener('resize', setVh);
  }, []);

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

      // Fetch user's progress
      const progressQuery = query(
        collection(db, "progress"),
        where("user", "==", doc(db, "users", uid)),
        where("books", "==", bookRef)
      );
      const progressSnap = await getDocs(progressQuery);
      if (!progressSnap.empty) {
        setProgress(progressSnap.docs[0].data().progress);
      }

      // Fetch user's rating
      const ratingQuery = query(
        collection(db, "ratings"),
        where("user", "==", doc(db, "users", uid)),
        where("book", "==", bookRef)
      );
      const ratingSnap = await getDocs(ratingQuery);
      if (!ratingSnap.empty) {
        setRating(ratingSnap.docs[0].data().rating);
      }

      // Step 1: Get all users in the book club
      const usersQuery = query(
        collection(db, "users"),
        where("bookclub", "==", clubRef)
      );
      const usersSnap = await getDocs(usersQuery);
      const userIds = usersSnap.docs.map(doc => doc.ref); // assuming 'user' in ratings is a DocumentReference

      // Step 2: Get all ratings for the book by those users
      const ratingsQuery = query(
        collection(db, "ratings"),
        where("book", "==", bookRef),
        where("user", "in", userIds)
      );
      const ratingsSnap = await getDocs(ratingsQuery);
      const ratings = ratingsSnap.docs.map(doc => doc.data().rating);
      const avgRating = ratings.length
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : null;


      // 🔍 Fetch all progress entries for this book
      const allProgressQuery = query(
        collection(db, "progress"),
        where("books", "==", bookRef)
      );
      const allProgressSnap = await getDocs(allProgressQuery);
      const allProgress = allProgressSnap.docs.map(doc => doc.data().progress);
      const avgProgress = allProgress.length
        ? allProgress.reduce((a, b) => a + b, 0) / allProgress.length
        : null;

      // ✅ Store in clubData for display
      setClubData(prev => ({
        ...prev,
        averageRating: avgRating,
        averageProgress: avgProgress
      }));

      setIsLoading(false);

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

  const handleRatingSubmit = async (value) => {
    const uid = auth.currentUser?.uid;
    if (!uid || !bookData || !value) return;

    const ratingValue = parseFloat(value);
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
      setNewRating(0);
    } catch (error) {
      console.error("Error submitting rating:", error);
    }
  };


  const StarRating = ({ rating, onChange, handleRatingSubmit }) => {
    const handleClick = (value) => {
      onChange(value); // update local state
      if (handleRatingSubmit) {
        handleRatingSubmit(value); // save to DB immediately
      }
    };

    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const full = i <= rating;
      const half = i - 0.5 === rating;

      stars.push(
        <span
          key={i}
          style={{ cursor: "pointer", fontSize: "1.5rem", color: "#b38349" }}
          onClick={() => handleClick(i)}
        >
          {full ? "★" : "☆"}
        </span>
      );

      stars.push(
        <span
          key={`half-${i}`}
          style={{ cursor: "pointer", fontSize: "1.5rem", color: "#b38349" }}
          onClick={() => handleClick(i - 0.5)}
        >
          {rating >= i - 0.5 && rating < i ? "⯨" : ""}
        </span>
      );
    }

    return <div className="star-rating">{stars}</div>;
  };


  const MemoizedMeter = React.memo(({ value }) => <CircleMeter value={value} />);

  console.log("userData:", userData);
  console.log("clubData:", clubData);
  console.log("userData.bookclub?.id:", userData?.bookclub?.id);
  console.log("clubData.creator?.id:", clubData?.creator?.id);
  console.log(
    "Is creator?",
    userData?.bookclub?.id === clubData?.creator?.id
  );




  return (
    <div className="container py-5">
      <div className="text-center">
        {clubData?.name || "Your Book Club"} is
        <h2 class="mt-1">Currently Reading</h2>
      </div>

      <div className="text-center mb-4">
        {bookData ? (<>
          <div className="container-bookshelf">

            <div className="book-cover-zone mb-2">
              <Link to={`/book/${bookData.id}`}>
                <img
                  src={bookData.image}
                  alt="Book cover"
                  className="img-fluid book-on-shelf"
                />
              </Link>
            </div>

            <div className="book-header d-flex align-items-center justify-content-between position-relative mb-3 mt-4-5">
              {/* Progress on the left */}
              <div className="progress-display align-self-center">{progress !== null ? `${progress}%` : "0%"}</div>

              <div className="book-title-wrapper flex-grow-1 text-center">
                <h4 className="book-title m-0"><strong>{bookData.title}</strong></h4>
                <p className="text-muted">{bookData.author}</p>
              </div>

              <div className="menu-icon-wrapper d-flex justify-content-end align-self-center">
                <button className="menu-icon" onClick={() => setShowMenu(prev => !prev)} aria-label="Options">
                  <span className="three-dots">⋯</span>
                </button>
                {showMenu && (
                  <div className="popup-menu">
                    <button className="popup-item" onClick={() => { setShowRatingForm(true); setShowMenu(false); }}>
                      Rate this book
                    </button>
                    <button className="popup-item" onClick={() => { setShowProgressForm(true); setShowMenu(false); }}>
                      Update progress
                    </button>
                  </div>
                )}
              </div>
            </div>

            <p className="rating-prompt mb-0">
              {rating ? "Your rating:" : "Rate this book:"}
            </p>
            <StarRating
              rating={newRating || rating || 0}
              onChange={setNewRating}
              handleRatingSubmit={handleRatingSubmit}
            />

            <div class="d-flex justify-content-center align-items-center gap-4 fs-3 mt-4-5 mb-2">
              <button type="button" class="btn btn-link fs-3 text-bd-secondary" data-bs-toggle="modal" data-bs-target="#statsModal" title="View Statistics">
                <i class="bi bi-bar-chart-fill"></i>
              </button>
              <button
                type="button"
                class="btn btn-link fs-3 text-bd-secondary"
                data-bs-toggle="modal"
                data-bs-target="#calendarModal"
                title="Next Book Club"
              >
                <i class="bi bi-calendar3"></i>
              </button>
            </div>
          </div>

          <div class="modal fade" id="statsModal" tabindex="-1" aria-labelledby="statsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title" id="statsModalLabel">Club Statistics</h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                  <div class="d-flex flex-column align-items-center mb-4">
                    <p>Average Progress</p>
                    <div class="d-flex justify-content-center">
                      <CircleMeter
                        value={clubData.averageProgress}
                        className={isLoading ? "" : "loaded"}
                      />
                    </div>
                  </div>

                  <div class="d-flex flex-column align-items-center">
                    <p>Average Rating</p>
                    <div class="d-flex justify-content-center">
                      <CircleMeter
                        value={clubData.averageRating * 20}
                        className={isLoading ? "" : "loaded"}
                      />
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>

          <div class="modal fade" id="calendarModal" tabindex="-1" aria-labelledby="calendarModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title" id="calendarModalLabel">Next Book Club</h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body text-center">
                  <p><strong>Date:</strong> 28 August 2025</p>
                  <p><strong>Time:</strong> 19:00 CET</p>
                  <p><strong>Location:</strong> Online via Zoom</p>
                  <hr />
                  <p>
                    <strong>Days Until:</strong>
                    <span id="daysUntil"></span>
                  </p>

                  {auth.currentUser?.uid === clubData?.creator?.id && (
                    <button
                      type="button"
                      className="btn btn-outline-primary mt-3"
                      onClick={() => navigate("/schedule-bookclub")} data-bs-dismiss="modal"
                    >
                      <i className="bi bi-calendar-plus"></i> Schedule Next Book Club
                    </button>
                  )}


                </div>
              </div>
            </div>
          </div>


          {/* Rating Popup */}
          {showRatingForm && (
            <div className="popup-overlay">
              <div className="popup-card">
                <label>Give a rating (0–5):</label>
                <StarRating rating={newRating} onChange={setNewRating} />
                <div className="mt-2">
                  <button
                    className="btn btn-sm btn-bd-primary me-2"
                    onClick={() => {
                      handleRatingSubmit(newRating);
                      setShowRatingForm(false);
                    }}
                  >
                    Submit
                  </button>
                  <button className="btn btn-sm btn-secondary" onClick={() => setShowRatingForm(false)}>Cancel</button>
                </div>
              </div>
            </div>
          )}



          {/* Progress Popup */}
          {showProgressForm && (
            <div className="popup-overlay">
              <div className="popup-card">
                <label>Update your progress:</label>
                <div className="mb-2 mt-2">
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
                      placeholder="Total pages"
                      value={inputValue.totalPages}
                      onChange={(e) =>
                        setInputValue({ ...inputValue, totalPages: e.target.value })
                      }
                      min="1"
                    />
                  </>
                )}

                <button className="btn btn-sm btn-bd-primary me-2" onClick={handleProgressUpdate}>Save</button>
                <button className="btn btn-sm btn-secondary" onClick={() => setShowProgressForm(false)}>Cancel</button>
              </div>
            </div>
          )}





        </>
        ) : (
          <p>Loading book info...</p>
        )}

      </div>
    </div>
  );
}

export default PrivateHome;
