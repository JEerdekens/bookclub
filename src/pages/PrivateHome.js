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




function PrivateHome() {
  const [userData, setUserData] = useState(null);
  const [clubData, setClubData] = useState(null);
  const [bookData, setBookData] = useState(null);
  const [progress, setProgress] = useState(null);
  const [rating, setRating] = useState(null);

  const [showProgressForm, setShowProgressForm] = useState(false);
  const [inputType, setInputType] = useState("percent"); // "percent" or "pages"
  const [inputValue, setInputValue] = useState({ percent: "", pagesRead: "", totalPages: "" });



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
                    <img
                      src={
                        bookData.image ||
                        "https://bookstoreromanceday.org/wp-content/uploads/2020/09/book-cover-placeholder.png"
                      }
                      alt="Book cover"
                      className="img-fluid mb-2"
                    />

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
