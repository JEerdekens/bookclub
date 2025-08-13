import React, { useEffect, useState, useRef } from "react";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc
} from "firebase/firestore";
import "../App.css";
import { useParams } from "react-router-dom";

function BookPage() {
  const [bookData, setBookData] = useState(null);
  const [comments, setComments] = useState([]);
  const [spoilerTab, setSpoilerTab] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [userRating, setUserRating] = useState(null);
  const [userProgress, setUserProgress] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const { bookId } = useParams();
  const commentsRef = useRef(null);

  const fetchBookDetails = async () => {
    const uid = auth.currentUser?.uid;
    setCurrentUserId(uid);
    if (!uid || !bookId) return;

    const bookRef = doc(db, "books", bookId);
    const bookSnap = await getDoc(bookRef);
    if (!bookSnap.exists()) return;

    const book = { id: bookSnap.id, ...bookSnap.data() };
    setBookData(book);

    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;

    const userData = userSnap.data();
    const clubRef = userData.bookclub;
    if (!clubRef) return;

    const membersQuery = query(
      collection(db, "users"),
      where("bookclub", "==", clubRef)
    );
    const membersSnap = await getDocs(membersQuery);
    const memberRefs = membersSnap.docs.map(doc => doc.ref);

    const commentQuery = query(
      collection(db, "comments"),
      where("book", "==", bookRef)
    );
    const commentSnap = await getDocs(commentQuery);

    const enrichedComments = await Promise.all(
      commentSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(comment =>
          memberRefs.some(ref => ref.path === comment.user.path)
        )
        .map(async comment => {
          const userSnap = await getDoc(comment.user);
          const username = userSnap.exists() ? userSnap.data().username : "Unknown";
          return { ...comment, username };
        })
    );
    setComments(enrichedComments);

    const ratingQuery = query(
      collection(db, "ratings"),
      where("user", "==", userRef),
      where("book", "==", bookRef)
    );
    const ratingSnap = await getDocs(ratingQuery);
    if (!ratingSnap.empty) {
      setUserRating(ratingSnap.docs[0].data().rating);
    }

    const progressQuery = query(
      collection(db, "progress"),
      where("user", "==", userRef),
      where("books", "==", bookRef)
    );
    const progressSnap = await getDocs(progressQuery);
    if (!progressSnap.empty) {
      setUserProgress(progressSnap.docs[0].data().progress);
    }
  };

  useEffect(() => {
    fetchBookDetails();
  }, [bookId]);

  const handleEditComment = (comment) => {
    setEditingComment(comment);
    setNewComment(comment.text);
    setIsSpoiler(comment.spoiler);
    document.getElementById("commentBox")?.focus();
  };

  const handleDeleteComment = async (comment) => {
    if (!comment.id) return;
    await deleteDoc(doc(db, "comments", comment.id));
    await fetchBookDetails();
  };

  const handleCommentSubmit = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !newComment.trim()) return;

    const bookRef = doc(db, "books", bookId);
    const userRef = doc(db, "users", uid);

    if (editingComment) {
      const commentRef = doc(db, "comments", editingComment.id);
      await updateDoc(commentRef, {
        text: newComment.trim(),
        spoiler: isSpoiler,
        timestamp: new Date()
      });
      setEditingComment(null);
    } else {
      await addDoc(collection(db, "comments"), {
        user: userRef,
        book: bookRef,
        text: newComment.trim(),
        spoiler: isSpoiler,
        timestamp: new Date()
      });
    }

    setNewComment("");
    setIsSpoiler(false);
    await fetchBookDetails();
    commentsRef.current?.scrollIntoView({ behavior: "smooth" });
    document.getElementById("commentBox")?.focus();
  };

  const filteredComments = comments
    .filter(c => c.spoiler === spoilerTab)
    .sort((a, b) => b.timestamp?.toDate?.() - a.timestamp?.toDate?.());

  return (
    <div className="container" style={{ paddingBottom: "50px", paddingTop: "1rem" }}>
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
        {editingComment && (
          <div className="alert alert-info">
            Editing comment by <strong>{editingComment.username}</strong>
            <button
              className="btn btn-sm btn-link"
              onClick={() => setEditingComment(null)}
            >
              Cancel
            </button>
          </div>
        )}
        <textarea
          className="form-control mb-2"
          rows="3"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Share your thoughts..."
          id="commentBox"
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
          {editingComment ? "Update Comment" : "Submit Comment"}
        </button>
      </div>

      <div className="mb-4" ref={commentsRef}>
        <h5>Comments</h5>
        {filteredComments.length > 0 ? (
          filteredComments.map((c, idx) => {
            const date = c.timestamp?.toDate?.();
            const formatted = date ? date.toLocaleString() : "Unknown time";
            const isMine = c.user.id === currentUserId;

            return (
              <div key={idx} className="border rounded p-2 mb-2">
                <p><strong>{c.username}</strong>: {c.text}</p>
                <small className="text-muted d-block">
                  {c.spoiler ? "⚠️ Spoiler" : "🗨️ No Spoiler"} • {formatted}
                </small>

                {isMine && (
                  <div className="mt-2">
                    <button
                      className="btn btn-sm btn-outline-secondary me-2"
                      onClick={() => handleEditComment(c)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDeleteComment(c)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })
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
