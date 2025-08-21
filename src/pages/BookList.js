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
  const [activeBookId, setActiveBookId] = useState(null); 


  const cardRefs = useRef({});
  const popupRefs = useRef({});
  const lastClickedRef = useRef(null);
  const [popupVerticalDirections, setPopupVerticalDirections] = useState({});

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
      setMarkedWantToReadIds(bookDocs.map(doc => doc.id));
    };

    fetchWantToRead(); // Run on mount and tab change
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



useEffect(() => {
  const fetchReadBooks = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const userRef = doc(db, "users", uid);

    // Get all progress entries for this user
    const progressQuery = query(
      collection(db, "progress"),
      where("user", "==", userRef),
      where("progress", "==", 100)
    );
    const progressSnap = await getDocs(progressQuery);

    // Extract book references
    const bookRefs = progressSnap.docs.map(doc => doc.data().books);

    // Fetch book data
    const bookDocs = await Promise.all(bookRefs.map(ref => getDoc(ref)));
    const booksData = bookDocs
      .filter(doc => doc.exists())
      .map(doc => ({ id: doc.id, ...doc.data() }));

    setBooks(booksData); // Or setReadBooks if you want to isolate it
  };

  if (activeTab === "Read") fetchReadBooks();
}, [activeTab]);


useEffect(() => {
  const fetchAllBooks = async () => {
    const snapshot = await getDocs(collection(db, "books"));
    const booksData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setBooks(booksData);
  };

  if (activeTab === "all") fetchAllBooks();
}, [activeTab]); 

useEffect(() => {
  const fetchclubPastBooks = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      console.log("No user ID found.");
      return;
    }

    const userSnap = await getDoc(doc(db, "users", uid));
    const clubRef = userSnap.data().bookclub;
    if (!clubRef) {
      console.log("No bookclub reference found for user.");
      return;
    }

    console.log("Club Ref:", clubRef);

    const clubBooksQuery = query(
      collection(db, "BookclubBooks"),
      where("bookclub", "==", clubRef)
    );
    const clubBooksSnap = await getDocs(clubBooksQuery);

    console.log("Fetched BookclubBooks:", clubBooksSnap.docs.length);

    const now = new Date();

    const pastBookRefs = clubBooksSnap.docs
      .map(doc => doc.data())
      .filter(entry => {
        const FinishDate = entry.FinishDate?.toDate?.();
        const isPast = FinishDate && FinishDate < now;
        if (!isPast) {
          console.log("Skipping book:", entry.book?.id, "Finish date:", FinishDate);
        }
        return isPast;
      })
      .map(entry => entry.book);

    console.log("Past Book Refs:", pastBookRefs);

    const bookDocs = await Promise.all(pastBookRefs.map(ref => getDoc(ref)));
    const booksData = bookDocs
      .filter(doc => doc.exists())
      .map(doc => ({ id: doc.id, ...doc.data() }));

    console.log("Resolved Book Data:", booksData);

    setBooks(booksData);
  };

  if (activeTab === "clubPastBooks") fetchclubPastBooks();
}, [activeTab]);




useEffect(() => {
  const fetchBookclubPicks = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // Get current user's bookclub reference
    const userSnap = await getDoc(doc(db, "users", uid));
    const clubRef = userSnap.data().bookclub;
    if (!clubRef) return;

    // Get all members of the bookclub
    const membersQuery = query(collection(db, "users"), where("bookclub", "==", clubRef));
    const membersSnap = await getDocs(membersQuery);
    const memberRefs = membersSnap.docs.map(doc => doc.ref);

    // Get all wantToRead entries from those members
    const wantToReadQuery = query(collection(db, "wantToRead"));
    const wantToReadSnap = await getDocs(wantToReadQuery);

    const clubWantToReadEntries = wantToReadSnap.docs
      .map(doc => doc.data())
      .filter(entry =>
        memberRefs.some(ref => ref.path === entry.user.path)
      );

    const uniqueBookRefs = [
      ...new Set(clubWantToReadEntries.map(entry => entry.book))
    ];

    // Fetch progress for each member
    const memberProgressMap = {};

    for (const memberRef of memberRefs) {
      const progressQuery = query(collection(db, "progress"), where("user", "==", memberRef));
      const progressSnap = await getDocs(progressQuery);

      memberProgressMap[memberRef.id] = {};
      progressSnap.forEach(doc => {
        const data = doc.data();
        memberProgressMap[memberRef.id][data.books.id] = data.progress;
      });
    }

    // Filter out books that any member has finished
    const filteredBookRefs = uniqueBookRefs.filter(bookRef =>
      Object.values(memberProgressMap).every(progress =>
        (progress[bookRef.id] || 0) < 100
      )
    );

    // Fetch book data
    const bookDocs = await Promise.all(filteredBookRefs.map(ref => getDoc(ref)));
    const booksData = bookDocs
      .filter(doc => doc.exists())
      .map(doc => ({ id: doc.id, ...doc.data() }));

    setBooks(booksData); // Or setBookclubPicks if you want to isolate it
  };

  if (activeTab === "BookclubPicks") fetchBookclubPicks();
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
    } else {
      const docId = existingSnap.docs[0].id;
      await deleteDoc(doc(db, "wantToRead", docId));
    }

    // Refresh the list immediately
    const updatedSnap = await getDocs(
      query(collection(db, "wantToRead"), where("user", "==", userRef))
    );
    const updatedBookRefs = updatedSnap.docs.map(doc => doc.data().book);
    const updatedBookDocs = await Promise.all(updatedBookRefs.map(ref => getDoc(ref)));
    setMarkedWantToReadIds(updatedBookDocs.map(doc => doc.id));
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
        const screenHeight = window.innerHeight;
        const screenWidth = window.innerWidth;

        const horizontalDirection =
          rect.left < 150 ? "right" :
            screenWidth - rect.right < 150 ? "left" :
              "right";

        const verticalDirection =
          screenHeight - rect.bottom < 200 ? "up" : "down";

        setPopupDirections(prev => ({ ...prev, [bookId]: horizontalDirection }));
        setPopupVerticalDirections(prev => ({ ...prev, [bookId]: verticalDirection }));
      }
    }, 0);
  };


  const [bookProgressMap, setBookProgressMap] = useState({});

  useEffect(() => {
    const fetchProgress = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const userRef = doc(db, "users", uid);
      const progressQuery = query(collection(db, "progress"), where("user", "==", userRef));
      const progressSnap = await getDocs(progressQuery);

      const progressData = {};
      progressSnap.docs.forEach(doc => {
        const data = doc.data();
        progressData[data.books.id] = data.progress;
      });

      setBookProgressMap(progressData);
    };

    fetchProgress();
  }, []);

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


      <div className="d-flex justify-content-between align-items-center mb-4 ms-3">
        <h2>
          {activeTab === "all" && "Library"}
          {activeTab === "wantToRead" && "You Want to Read "}
          {activeTab === "clubInterest" && "Bookclub Members Want to Read"}
          {activeTab === "Read" && "Finished Books"}
          {activeTab === "BookclubPicks" && "Possible Bookclub Picks"} 
          {activeTab === "clubPastBooks" && "Past Bookclub Reads"}
        </h2>
        <div>
          <button class="btn" type="button" data-bs-toggle="offcanvas" data-bs-target="#offcanvasExample" aria-controls="offcanvasExample">
            <i class="bi bi-list"></i>
          </button>
        </div>
      </div>

<div
  className="offcanvas offcanvas-end bg-light shadow"
  tabIndex="-1"
  id="offcanvasExample"
  aria-labelledby="offcanvasExampleLabel"
>
  <div className="offcanvas-header border-bottom">
    <h5 className="offcanvas-title fw-semibold" id="offcanvasExampleLabel">
      Collections
    </h5>
    <button
      type="button"
      className="btn-close text-reset"
      data-bs-dismiss="offcanvas"
      aria-label="Close"
    ></button>
  </div>

  <div className="offcanvas-body">
    <div className="d-flex flex-column gap-2 mt-2">
      <div
        className={`nav-link px-0 ${activeTab === "all" ? "fw-bold text-bd-primary" : "text-dark"}`}
        onClick={() => setActiveTab("all")}
        data-bs-dismiss="offcanvas"
        style={{ cursor: "pointer" }}
      >
        <i class="bi bi-book"></i>  All Books
      </div>
      <hr />

      <div
        className={`nav-link px-0 ${activeTab === "wantToRead" ? "fw-bold text-bd-primary" : "text-dark"}`}
        onClick={() => setActiveTab("wantToRead")}
        data-bs-dismiss="offcanvas"
        style={{ cursor: "pointer" }}
      >
        <i class="bi bi-bookmark"></i> Want to Read
      </div>
      <hr />
        <div
        className={`nav-link px-0 ${activeTab === "Read" ? "fw-bold text-bd-primary" : "text-dark"}`}
        onClick={() => setActiveTab("Read")}
        data-bs-dismiss="offcanvas"
        style={{ cursor: "pointer" }}
      >
        <i class="bi bi-bookmark-check"></i> Read
      </div>
     <hr />
      <div
        className={`nav-link px-0 ${activeTab === "clubInterest" ? "fw-bold text-bd-primary" : "text-dark"}`}
        onClick={() => setActiveTab("clubInterest")}
        data-bs-dismiss="offcanvas"
        style={{ cursor: "pointer" }}
      >
        <i class="bi bi-bookmarks"></i> Bookclub Want to Read  
      </div>
      <hr />

        <div
        className={`nav-link px-0 ${activeTab === "BookclubPicks" ? "fw-bold text-bd-primary" : "text-dark"}`}
        onClick={() => setActiveTab("BookclubPicks")}
        data-bs-dismiss="offcanvas"
        style={{ cursor: "pointer" }}
      >
        <i class="bi bi-bookmark-star"></i> Bookclub Picks
      </div>
      <hr />

        <div
        className={`nav-link px-0 ${activeTab === "clubPastBooks" ? "fw-bold text-bd-primary" : "text-dark"}`}
        onClick={() => setActiveTab("clubPastBooks")}
        data-bs-dismiss="offcanvas"
        style={{ cursor: "pointer" }}
      >
        <i class="bi bi-bookmark-heart"></i> Bookclub past books
      </div>
      <hr />


      <div className="mt-4">

        <Link to="/add" className="text-decoration-none text-bd-primary d-flex align-items-center gap-2">
          <i className="bi bi-plus-circle"></i> Add Book
        </Link>
      </div>
    </div>
  </div>
</div>


      
      <div className="d-flex justify-content-center mb-4 ms-3 me-3">
        <input
          type="text"
          className="form-control"
          placeholder="Search by title or author..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="d-flex flex-wrap gap-4 justify-content-start mb-5">
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
              <div className="card-body px-2 d-flex justify-content-between align-items-center">
                {/* Left: Progress or Checkmark */}
                <div className="d-flex align-items-center gap-2">
                  {bookProgressMap[book.id] === 100 ? (
                    <i className="bi bi-check-circle-fill" style={{ color: "#b38349", fontSize: "1.1rem" }}></i>
                  ) : (
                    <span style={{ color: "#888", fontSize: "0.9rem" }}>
                      {bookProgressMap[book.id] != null ? `${bookProgressMap[book.id]}%` : "0%"}
                    </span>
                  )}

                  {/* Bookmark Icon */}
                  <span onClick={() => handleWantToRead(book.id)} style={{ cursor: "pointer" }}>
                    {markedWantToReadIds.includes(book.id) ? (
                      <i
                        className="bi bi-bookmark-check-fill"
                        style={{ color: "#b38349", fontSize: "1.1rem" }}
                      ></i>
                    ) : (
                      <i
                        className="bi bi-bookmark"
                        style={{ color: "#c6bbae", fontSize: "1.1rem" }}
                      ></i>
                    )}
                  </span>

                </div>

                {/* Right: Menu Button */}
                <div>
                  <button
                    className="menu-icon ms-2"
                    onClick={(e) => {
                      lastClickedRef.current = e.target;
                      handleShowMenu(book.id);
                    }}
                    aria-label="Options"
                  >
                    <span className="three-dots-small">⋯</span>
                  </button>
                </div>







                {showMenu === book.id && (
                  <div
                    ref={popupRefs.current[book.id]}
                    className={`popup-menu2 
    ${popupDirections[book.id] === "left" ? "align-left-popup" : "align-right-popup"} 
    ${popupVerticalDirections[book.id] === "up" ? "align-up-popup" : "align-down-popup"}`}
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
