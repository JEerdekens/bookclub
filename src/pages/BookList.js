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
  updateDoc
} from "firebase/firestore";
import { Link } from "react-router-dom";

function BookList() {
  const [books, setBooks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchBooks = async () => {
      const snapshot = await getDocs(collection(db, "books"));
      setBooks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchBooks();
  }, []);

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

  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>📖 All Books</h2>
        <Link to="/add" className="btn btn-sm btn-success">
          ➕ Add Book
        </Link>
      </div>

      <input
        type="text"
        className="form-control mb-4"
        placeholder="Search by title or author..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

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
                  ✅ I have read this
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
