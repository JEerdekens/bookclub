import React, { useEffect, useState, useRef } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  addDoc,
  query,
  where,
  getDoc,
  updateDoc, deleteDoc
} from "firebase/firestore";
import { Link } from "react-router-dom";

function BookList() {
  const [books, setBooks] = useState([]);
  const [wantToReadBooks, setWantToReadBooks] = useState([]);
  const [clubInterestBooks, setClubInterestBooks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [markedWantToReadIds, setMarkedWantToReadIds] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [popupDirections, setPopupDirections] = useState({});

  const [showRatingForm, setShowRatingForm] = useState(false);
  const [showProgressForm, setShowProgressForm] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [inputType, setInputType] = useState("percent");
  const [inputValue, setInputValue] = useState({ percent: "", pagesRead: "", totalPages: "" });
  const [activeBookId, setActiveBookId] = useState(null); // Tracks which book is being rated or updated


  const cardRefs = useRef({});
  const popupRefs = useRef({});
  const lastClickedRef = useRef(null);







  useEffect(() => {
    const handleClickOutside = (event) => {
      const popupRef = popupRefs.current[showMenu];
      const clickedInsidePopup = popupRef?.current?.contains(event.target);
      const clickedButton = lastClickedRef.current === event.target;

      if (!clickedInsidePopup && !clickedButton) {
        setShowMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  useEffect(() => {
    const fetchBooks = async () => {
      const snapshot = await getDocs(collection(db, "books"));
      setBooks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchBooks();
  }, []);

  useEffect(() => {
    const fetchWantToRead = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const userRef = doc(db, "users", uid);
      const querySnap = await getDocs(
        query(collection(db, "wantToRead"), where("user", "==", userRef))
      );

      const bookRefs = querySnap.docs.map(doc => doc.data().book);
      const bookDocs = await Promise.all(bookRefs.map(ref => getDoc(ref)));
      const booksData = bookDocs
        .filter(doc => doc.exists())
        .map(doc => ({ id: doc.id, ...doc.data() }));

      setWantToReadBooks(booksData);
      setMarkedWantToReadIds(bookDocs.map(doc => doc.id)); // Track IDs
    };


    if (activeTab === "wantToRead") fetchWantToRead();
  }, [activeTab]);

  useEffect(() => {
    const fetchBookclubInterest = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const userSnap = await getDoc(doc(db, "users", uid));
      const clubRef = userSnap.data().bookclub;
      if (!clubRef) return;

      const membersQuery = query(
        collection(db, "users"),
        where("bookclub", "==", clubRef)
      );
      const membersSnap = await getDocs(membersQuery);
      const memberRefs = membersSnap.docs.map(doc => doc.ref);

      const interestQuery = query(collection(db, "wantToRead"));
      const interestSnap = await getDocs(interestQuery);

      const interestedBooks = interestSnap.docs
        .map(doc => doc.data())
        .filter(entry =>
          memberRefs.some(ref => ref.path === entry.user.path)
        )
        .map(entry => entry.book.id);

      const uniqueBookIds = [...new Set(interestedBooks)];
      const bookDocs = await Promise.all(
        uniqueBookIds.map(id => getDoc(doc(db, "books", id)))
      );

      const booksData = bookDocs
        .filter(doc => doc.exists())
        .map(doc => ({ id: doc.id, ...doc.data() }));

      setClubInterestBooks(booksData);
    };

    if (activeTab === "clubInterest") fetchBookclubInterest();
  }, [activeTab]);


  const handleMarkAsRead = async (bookId) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const userRef = doc(db, "users", uid);
    const bookRef = doc(db, "books", bookId);

    const progressQuery = query(
      collection(db, "progress"),
      where("user", "==", userRef),
      where("books", "==", bookRef)
    );
    const progressSnap = await getDocs(progressQuery);

    if (!progressSnap.empty) {
      const progressDocRef = progressSnap.docs[0].ref;
      await updateDoc(progressDocRef, { progress: 100 });
    } else {
      await addDoc(collection(db, "progress"), {
        user: userRef,
        books: bookRef,
        progress: 100
      });
    }

    /* alert("Marked as read!"); */
  };

  const handleWantToRead = async (bookId) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const userRef = doc(db, "users", uid);
    const bookRef = doc(db, "books", bookId);

    const existingQuery = query(
      collection(db, "wantToRead"),
      where("user", "==", userRef),
      where("book", "==", bookRef)
    );
    const existingSnap = await getDocs(existingQuery);

    if (existingSnap.empty) {
      await addDoc(collection(db, "wantToRead"), {
        user: userRef,
        book: bookRef,
        timestamp: new Date()
      });
      setMarkedWantToReadIds(prev => [...prev, bookId]);
      // alert("Added to your Want to Read list!");
    } else {
      const docId = existingSnap.docs[0].id;
      await deleteDoc(doc(db, "wantToRead", docId));
      setMarkedWantToReadIds(prev => prev.filter(id => id !== bookId));
      /* alert("Removed from your Want to Read list."); */
    }
  };

  const handleRate = (bookId) => {
    setActiveBookId(bookId);
    setShowRatingForm(true);
    setShowMenu(null);
  };

  const handleUpdateProgress = (bookId) => {
    setActiveBookId(bookId);
    setShowProgressForm(true);
    setShowMenu(null);
  };
  const StarRating = ({ rating, onChange }) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const full = i <= rating;
      const half = i - 0.5 === rating;
      stars.push(
        <span
          key={i}
          style={{ cursor: "pointer", fontSize: "1.5rem", color: "#b38349" }}
          onClick={() => onChange(i)}
        >
          {full ? "★" : "☆"}
        </span>
      );
      stars.push(
        <span
          key={`half-${i}`}
          style={{ cursor: "pointer", fontSize: "1.5rem", color: "#b38349" }}
          onClick={() => onChange(i - 0.5)}
        >
          {rating >= i - 0.5 && rating < i ? "⯨" : ""}
        </span>
      );
    }
    return <div className="star-rating">{stars}</div>;
  };


  const [popupDirection, setPopupDirection] = useState("right");
  const cardRef = useRef(null);

  useEffect(() => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const screenWidth = window.innerWidth;
      if (rect.left < 150) {
        setPopupDirection("right");
      } else if (screenWidth - rect.right < 150) {
        setPopupDirection("left");
      } else {
        setPopupDirection("right");
      }
    }
  }, [showMenu]);

  const handleProgressUpdate = async () => {
  const uid = auth.currentUser?.uid;
  if (!uid || !activeBookId) return;

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
      where("books", "==", doc(db, "books", activeBookId))
    );
    const progressSnap = await getDocs(progressQuery);

    if (!progressSnap.empty) {
      await updateDoc(progressSnap.docs[0].ref, { progress: newProgress });
    } else {
      await addDoc(collection(db, "progress"), {
        user: doc(db, "users", uid),
        books: doc(db, "books", activeBookId),
        progress: newProgress
      });
    }

    setShowProgressForm(false);
    setInputValue({ percent: "", pagesRead: "", totalPages: "" });
  } catch (error) {
    console.error("Error updating progress:", error);
  }
};

   const handleRatingSubmit = async () => {
  const uid = auth.currentUser?.uid;
  if (!uid || !activeBookId || !newRating) return;

  const ratingValue = parseFloat(newRating);
  if (ratingValue < 0.5 || ratingValue > 5) return;

  try {
    const ratingQuery = query(
      collection(db, "ratings"),
      where("user", "==", doc(db, "users", uid)),
      where("book", "==", doc(db, "books", activeBookId))
    );
    const ratingSnap = await getDocs(ratingQuery);

    if (!ratingSnap.empty) {
      await updateDoc(ratingSnap.docs[0].ref, { rating: ratingValue });
    } else {
      await addDoc(collection(db, "ratings"), {
        user: doc(db, "users", uid),
        book: doc(db, "books", activeBookId),
        rating: ratingValue
      });
    }

    setShowRatingForm(false);
    setNewRating(0);
  } catch (error) {
    console.error("Error submitting rating:", error);
  }
};




  const handleShowMenu = (bookId) => {
    setTimeout(() => {
      setShowMenu(prev => (prev === bookId ? null : bookId));

      const ref = cardRefs.current[bookId];
      if (ref?.current) {
        const rect = ref.current.getBoundingClientRect();
        const screenWidth = window.innerWidth;
        const direction =
          rect.left < 150 ? "right" :
            screenWidth - rect.right < 150 ? "left" :
              "right";

        setPopupDirections(prev => ({ ...prev, [bookId]: direction }));
      }
    }, 0); // Let the event bubble finish before toggling
  };



  const filteredBooks = (() => {
    const source =
      activeTab === "wantToRead"
        ? wantToReadBooks
        : activeTab === "clubInterest"
          ? clubInterestBooks
          : books;

    return source.filter(book =>
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase())
    );
  })();






  return (
    <div className="container mt-5 mb-5">
      <ul className="nav nav-underline nav-justified mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All Books
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "wantToRead" ? "active" : ""}`}
            onClick={() => setActiveTab("wantToRead")}
          >
            Want to Read
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "clubInterest" ? "active" : ""}`}
            onClick={() => setActiveTab("clubInterest")}
          >
            Bookclub Want to Read
          </button>
        </li>
      </ul>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          {activeTab === "all" && "All Books"}
          {activeTab === "wantToRead" && "Your Want to Read List"}
          {activeTab === "clubInterest" && "Bookclub Members Want to Read"}
        </h2>
        {activeTab === "all" && (
          <Link to="/add" className="btn btn-sm btn-success">
            ➕ Add Book
          </Link>
        )}
      </div>



      <input
        type="text"
        className="form-control mb-4"
        placeholder="Search by title or author..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />


      <div className="d-flex flex-wrap gap-4 justify-content-start">
        {filteredBooks.map(book => {
          if (!cardRefs.current[book.id]) {
            cardRefs.current[book.id] = React.createRef();
          }

          if (!popupRefs.current[book.id]) {
            popupRefs.current[book.id] = React.createRef();
          }


          return (
            <div
              key={book.id}
              ref={cardRefs.current[book.id]}
              className="book-card p-2 position-relative"
              style={{ width: "160px" }}
            >
              <Link to={`/book/${book.id}`} className="text-decoration-none text-dark">
                <img
                  src={
                    book.image ||
                    "https://bookstoreromanceday.org/wp-content/uploads/2020/09/book-cover-placeholder.png"
                  }
                  alt="Book cover"
                  className="card-img-top align-center"
                  style={{
                    height: "200px",
                    width: "auto",
                    display: "block",
                    marginLeft: "auto",
                    marginRight: "auto",
                    borderRadius: "0px",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)"
                  }}
                />
              </Link>

              <div className="card-body px-0">
                <div className="d-flex justify-content-end">
                  <button
                    className="menu-icon ms-2"
                    onClick={(e) => {
                      lastClickedRef.current = e.target;
                      handleShowMenu(book.id);
                    }}
                    aria-label="Options"
                  >
                    <span className="three-dots">⋯</span>
                  </button>


                </div>

                {showMenu === book.id && (
                  <div
                    ref={popupRefs.current[book.id]}
                    className={`popup-menu2 ${popupDirections[book.id] === "left" ? "align-left-popup" : "align-right-popup"}`}
                  >
                    <div className="popup-header">
                      <h6 className="card-title mb-1">{book.title}</h6>
                      <p className="card-text small text-muted">by {book.author}</p>
                    </div>
                    <button
                      className="popup-item"
                      onClick={async () => {
                        await handleWantToRead(book.id); // Wait for DB update
                        setShowMenu(null);
                        window.location.reload(); // Refresh after it's done
                      }}
                    >
                      {markedWantToReadIds.includes(book.id)
                        ? "Remove from Want to Read"
                        : "Add to Want to Read"}
                    </button>



                    <button className="popup-item" onClick={() => handleRate(book.id)}>
                      Rate
                    </button>
                    <button className="popup-item" onClick={() => handleUpdateProgress(book.id)}>
                      Update progress
                    </button>

                    <button className="popup-item" onClick={() => { handleMarkAsRead(book.id); setShowMenu(null); }}>
                      Mark as finished
                    </button>
                  </div>
                )}
              </div>
            </div>


          );
        })}

        {showRatingForm && activeBookId && (
           <div className="popup-overlay">
              <div className="popup-card">
                <label>Give a rating (0–5):</label>
                <StarRating rating={newRating} onChange={setNewRating} />
                <div className="mt-2">
                  <button className="btn btn-sm btn-bd-primary me-2" onClick={handleRatingSubmit}>Submit</button>
                  <button className="btn btn-sm btn-secondary" onClick={() => setShowRatingForm(false)}>Cancel</button>
                </div>
              </div>
            </div>
        )}

        {showProgressForm && activeBookId && (
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




      </div>


    </div>
  );
}

export default BookList;
