import React, { useEffect, useState } from "react";
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


  const filteredBooks = (() => {
    if (activeTab === "wantToRead") return wantToReadBooks;
    if (activeTab === "clubInterest") return clubInterestBooks;
    return books.filter(book =>
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase())
    );
  })();

  return (
    <div className="container mt-5">
      <ul className="nav nav-tabs mb-4">
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

      <div className="row">
        {filteredBooks.map(book => (
          <div key={book.id} className="col-md-4 mb-4">
            <div className="card h-100">
              <Link to={`/book/${book.id}`} className="text-decoration-none text-dark">
                <img
                  src={
                    book.image ||
                    "https://bookstoreromanceday.org/wp-content/uploads/2020/09/book-cover-placeholder.png"
                  }
                  alt="Book cover"
                  className="card-img-top"
                  style={{ height: "250px", objectFit: "cover" }}
                />
                <div className="card-body">
                  <h5 className="card-title">{book.title}</h5>
                  <p className="card-text">by {book.author}</p>
                </div>
              </Link>
              <div className="card-footer bg-white border-top-0">
                <button
                  className="btn btn-sm btn-outline-primary w-100"
                  onClick={() => handleMarkAsRead(book.id)}
                >
                  I have read this
                </button>
                <button
                  className={`btn btn-sm w-100 mt-2 ${markedWantToReadIds.includes(book.id)
                      ? "btn-outline-danger"
                      : "btn-outline-secondary"
                    }`}
                  onClick={() => handleWantToRead(book.id)}
                >
                  {markedWantToReadIds.includes(book.id)
                    ? "Remove from Want to Read"
                    : "Want to Read"}
                </button>

              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BookList;
