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

    alert("Marked as read!");
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
      alert("Added to your Want to Read list!");
    } else {
      const docId = existingSnap.docs[0].id;
      await deleteDoc(doc(db, "wantToRead", docId));
      setMarkedWantToReadIds(prev => prev.filter(id => id !== bookId));
      alert("Removed from your Want to Read list.");
    }
  };

  const handleRate = async (bookId) => {
    // You can expand this with a modal or rating logic later
    alert(`You rated book with ID: ${bookId}`);
  };

  const handleUpdateProgress = async (bookId) => {
    // You can expand this with a progress input or modal later
    alert(`Updating progress for book ID: ${bookId}`);
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
    if (activeTab === "wantToRead") return wantToReadBooks;
    if (activeTab === "clubInterest") return clubInterestBooks;
    return books.filter(book =>
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


      {activeTab === "all" && (
        <input
          type="text"
          className="form-control mb-4"
          placeholder="Search by title or author..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      )}
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
            <button className="popup-item" onClick={() => { handleWantToRead(book.id); setShowMenu(null); }}>
              Add to want to read
            </button>
            <button className="popup-item" onClick={() => { handleRate(book.id); setShowMenu(null); }}>
              Rate
            </button>
            <button className="popup-item" onClick={() => { handleUpdateProgress(book.id); setShowMenu(null); }}>
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

      

</div>


    </div>
  );
}

export default BookList;
