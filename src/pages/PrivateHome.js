import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";
import "../App.css";
import { updateDoc } from "firebase/firestore"; // make sure this is imported




function PrivateHome() {
  const [userData, setUserData] = useState(null);
  const [clubData, setClubData] = useState(null);
  const [bookData, setBookData] = useState(null);
  const [progress, setProgress] = useState(null);
  const [rating, setRating] = useState(null);

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

      const book = bookDoc.data();

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
                <button className="btn btn-outline-success btn-sm">Update Progress</button>
              </>
            ) : (
              <p>Loading book info...</p>
            )}
          </div>
        </div>

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
