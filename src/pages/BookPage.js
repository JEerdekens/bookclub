import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc
} from "firebase/firestore";
import { updateDoc } from "firebase/firestore";
import "../App.css";

function BookPage({ bookId }) {
  const [bookData, setBookData] = useState(null);
  const [comments, setComments] = useState([]);
  const [spoilerTab, setSpoilerTab] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [userRating, setUserRating] = useState(null);
  const [userProgress, setUserProgress] = useState(null);

  useEffect(() => {
    const fetchBookDetails = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid || !bookId) return;

      const bookRef = doc(db, "books", bookId);
      const bookSnap = await getDoc(bookRef);
      if (bookSnap.exists()) {
        setBookData({ id: bookSnap.id, ...bookSnap.data() });
      }

      // Fetch comments
      const commentQuery = query(
        collection(db, "comments"),
        where("book", "==", bookRef)
      );
      const commentSnap = await getDocs(commentQuery);
      const allComments = commentSnap.docs.map(doc => doc.data());
      setComments(allComments);

      // Fetch rating
      const ratingQuery = query(
        collection(db, "ratings"),
        where("user", "==", doc(db, "users", uid)),
        where("book", "==", bookRef)
      );
      const ratingSnap = await getDocs(ratingQuery);
      if (!ratingSnap.empty) {
        setUserRating(ratingSnap.docs[0].data().rating);
      }

      // Fetch progress
      const progressQuery = query(
        collection(db, "progress"),
        where("user", "==", doc(db, "users", uid)),
        where("books", "==", bookRef)
      );
      const progressSnap = await getDocs(progressQuery);
      if (!progressSnap.empty) {
        setUserProgress(progressSnap.docs[0].data().progress);
      }
    };

    fetchBookDetails();
  }, [bookId]);

  const handleCommentSubmit = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !newComment.trim()) return;

    const bookRef = doc(db, "books", bookId);
    const userRef = doc(db, "users", uid);

    await addDoc(collection(db, "comments"), {
      user: userRef,
      book: bookRef,
      text: newComment.trim(),
      spoiler: isSpoiler,
      timestamp: new Date()
    });

    setNewComment("");
    setIsSpoiler(false);
  };

  const filteredComments = comments.filter(c => c.spoiler === spoilerTab);

  return (
    <div className="container py-4">
      {bookData && (
        <>
          <h2>{bookData.title}</h2>
          <p>by {bookData.author}</p>
          <img
                      src={
                        bookData.image ||
                        "https://bookstoreromanceday.org/wp-content/uploads/2020/09/book-cover-placeholder.png"
                      }
                      alt="Book cover"
                      className="img-fluid mb-2"
                    />
        </>
      )}

      <div className="mb-3">
        <button
          className={`btn btn-sm ${!spoilerTab ? "btn-primary" : "btn-outline-primary"} me-2`}
          onClick={() => setSpoilerTab(false)}
        >
          Comments (No Spoilers)
        </button>
        <button
          className={`btn btn-sm ${spoilerTab ? "btn-danger" : "btn-outline-danger"}`}
          onClick={() => setSpoilerTab(true)}
        >
          Comments (With Spoilers)
        </button>
      </div>

      <div className="mb-4">
        <h5>Leave a Comment</h5>
        <textarea
          className="form-control mb-2"
          rows="3"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Share your thoughts..."
        />
        <div className="form-check mb-2">
          <input
            className="form-check-input"
            type="checkbox"
            checked={isSpoiler}
            onChange={(e) => setIsSpoiler(e.target.checked)}
            id="spoilerCheck"
          />
          <label className="form-check-label" htmlFor="spoilerCheck">
            Contains spoilers
          </label>
        </div>
        <button className="btn btn-sm btn-success" onClick={handleCommentSubmit}>
          Submit Comment
        </button>
      </div>

      <div className="mb-4">
        <h5>Comments</h5>
        {filteredComments.length > 0 ? (
          filteredComments.map((c, idx) => (
            <div key={idx} className="border rounded p-2 mb-2">
              <p>{c.text}</p>
              <small className="text-muted">
                {c.spoiler ? "⚠️ Spoiler" : "🗨️ No Spoiler"}
              </small>
            </div>
          ))
        ) : (
          <p>No comments yet.</p>
        )}
      </div>

      <div className="mb-4">
        <h5>Your Rating</h5>
        <p>{userRating ? `${userRating} ★` : "Not rated yet"}</p>
      </div>

      <div className="mb-4">
        <h5>Your Progress</h5>
        <p>{userProgress !== null ? `${userProgress}%` : "Not started"}</p>
      </div>
    </div>
  );
}

export default BookPage;
