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
    const [newComment, setNewComment] = useState("");
    const [isSpoiler, setIsSpoiler] = useState(false);
    const [userRating, setUserRating] = useState(null);
    const [userProgress, setUserProgress] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [editingComment, setEditingComment] = useState(null);
    const { bookId } = useParams();
    const commentsRef = useRef(null);
    const [revealedSpoilers, setRevealedSpoilers] = useState([]);
    const [averageRating, setAverageRating] = useState(null);
    const [ratingCount, setRatingCount] = useState(0);
    const [memberRatings, setMemberRatings] = useState([]);
    const [memberProgress, setMemberProgress] = useState([]);
    const [showRatings, setShowRatings] = useState(false);
    const [showProgress, setShowProgress] = useState(false);




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
                    const userData = userSnap.exists() ? userSnap.data() : {};
                    const username = userData.username || "Unknown";
                    const photoBase64 = userData.photoBase64 || null;
                    return { ...comment, username, photoBase64 };
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
            // Fetch ratings from all members
    const ratingsQuery = query(
    collection(db, "ratings"),
    where("book", "==", bookRef)
    );
    const ratingsSnap = await getDocs(ratingsQuery);

    const ratingsData = await Promise.all(
    ratingsSnap.docs.map(async doc => {
        const data = doc.data();
        const userSnap = await getDoc(data.user);
        const user = userSnap.exists() ? userSnap.data() : {};
        return {
        username: user.username || "Unknown",
        photoBase64: user.photoBase64 || null,
        rating: data.rating
        };
    })
    );
    setMemberRatings(ratingsData);

    if (ratingsData.length > 0) {
  const total = ratingsData.reduce((sum, r) => sum + r.rating, 0);
  const avg = total / ratingsData.length;
  setAverageRating(avg.toFixed(1)); // one decimal place
  setRatingCount(ratingsData.length);
} else {
  setAverageRating(null);
  setRatingCount(0);
}



    const progressData = await Promise.all(
    progressSnap.docs.map(async doc => {
        const data = doc.data();
        const userSnap = await getDoc(data.user);
        const user = userSnap.exists() ? userSnap.data() : {};
        return {
        username: user.username || "Unknown",
        photoBase64: user.photoBase64 || null,
        progress: data.progress
        };
    })
    );
    setMemberProgress(progressData);
    
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
    const handleRevealSpoiler = (commentId) => {
        setRevealedSpoilers(prev => [...prev, commentId]);
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
        .sort((a, b) => b.timestamp?.toDate?.() - a.timestamp?.toDate?.());

const renderStars = (rating) => {
  const fullStars = Math.floor(rating);
  const halfStar = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  return (
    <>
      {"★".repeat(fullStars)}
      {halfStar && "½"}
      {"☆".repeat(emptyStars)}
    </>
  );
};





    return (
        <div className="container py-5" >
            {bookData && (
                <>
                    
                    <div className="d-flex align-items-start gap-4 mb-4">
  <img
    src={
      bookData.image ||
      "https://bookstoreromanceday.org/wp-content/uploads/2020/09/book-cover-placeholder.png"
    }
    alt="Book cover"
    className="img-fluid"
    style={{ maxWidth: "160px", borderRadius: "4px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
  />
  <div>
    <h2 className="mb-1">{bookData.title}</h2>
    <p className="text-muted">by {bookData.author}</p> 

 {averageRating && (
  <p className="mb-3">
    {renderStars(averageRating)} ({ratingCount})
  </p>
)}


    

<button
  className="btn btn-sm btn-bd-primary me-2 mb-2"
  style={{ width: "150px" }}
  data-bs-toggle="modal"
  data-bs-target="#ratingsModal"
>
  Show All Ratings
</button>

<button
  className="btn btn-sm btn-bd-primary me-2 mb-2"
  style={{ width: "150px" }}
  data-bs-toggle="modal"
  data-bs-target="#progressModal"
>
  Show All Progress
</button>




  </div>
</div>

                </>
            )}

<div className="modal fade" id="ratingsModal" tabIndex="-1" aria-labelledby="ratingsModalLabel" aria-hidden="true">
  <div className="modal-dialog modal-dialog-scrollable">
    <div className="modal-content">
      <div className="modal-header">
        <h5 className="modal-title" id="ratingsModalLabel">Member Ratings</h5>
        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div className="modal-body">
        {memberRatings.length > 0 ? (
          memberRatings.map((member, idx) => (
            <div key={idx} className="d-flex align-items-center mb-2 gap-3">
              <img
                src={
                  member.photoBase64?.startsWith("data:image")
                    ? member.photoBase64
                    : member.photoBase64
                      ? `data:image/jpeg;base64,${member.photoBase64}`
                      : "/bookclub/images/default-avatar.png"
                }
                alt="User avatar"
                className="rounded-circle"
                style={{ width: "40px", height: "40px", objectFit: "cover" }}
              />
              <strong>{member.username}</strong>
              <span>{renderStars(member.rating)} ({member.rating})</span>
            </div>
          ))
        ) : (
          <p>No ratings from members yet.</p>
        )}
      </div>
    </div>
  </div>
</div>

<div className="modal fade" id="progressModal" tabIndex="-1" aria-labelledby="progressModalLabel" aria-hidden="true">
  <div className="modal-dialog modal-dialog-scrollable">
    <div className="modal-content">
      <div className="modal-header">
        <h5 className="modal-title" id="progressModalLabel">Member Progress</h5>
        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div className="modal-body">
        {memberProgress.length > 0 ? (
          memberProgress.map((member, idx) => (
            <div key={idx} className="d-flex align-items-center mb-2 gap-3">
              <img
                src={
                  member.photoBase64?.startsWith("data:image")
                    ? member.photoBase64
                    : member.photoBase64
                      ? `data:image/jpeg;base64,${member.photoBase64}`
                      : "/bookclub/images/default-avatar.png"
                }
                alt="User avatar"
                className="rounded-circle"
                style={{ width: "40px", height: "40px", objectFit: "cover" }}
              />
              <strong>{member.username}</strong>
              <span>{member.progress}%</span>
            </div>
          ))
        ) : (
          <p>No progress updates from members yet.</p>
        )}
      </div>
    </div>
  </div>
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
                                <div className="d-flex align-items-center mb-2 gap-2">
                                    <img
                                        src={
                                            c.photoBase64?.startsWith("data:image")

                                                ? c.photoBase64
                                                : c.photoBase64
                                                    ? `data:image/jpeg;base64,${c.photoBase64}`
                                                    : "/bookclub/images/default-avatar.png"
                                        }
                                        alt="User avatar"
                                        className="rounded-circle"
                                        style={{ width: "40px", height: "40px", objectFit: "cover" }}
                                    />
                                    <strong>{c.username}</strong>
                                </div>

                                {c.spoiler && !revealedSpoilers.includes(c.id) ? (
                                    <div className="spoiler-overlay">
                                        <p className="blurred-text">{c.text}</p>
                                        <button
                                            className="btn btn-sm btn-outline-warning mt-2"
                                            onClick={() => handleRevealSpoiler(c.id)}
                                        >
                                            Show anyway
                                        </button>
                                    </div>
                                ) : (
                                    <p>{c.text}</p>
                                )}

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

           
        </div>
    );
}

export default BookPage;
