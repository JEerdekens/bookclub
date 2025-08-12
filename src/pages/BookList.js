import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

function BookList() {
  const [books, setBooks] = useState([]);

  useEffect(() => {
    const fetchBooks = async () => {
      const snapshot = await getDocs(collection(db, "books"));
      setBooks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchBooks();
  }, []);

  return (
    <div className="container mt-5">
      <h2>📖 All Books</h2>
      <ul className="list-group">
        {books.map(book => (
          <li key={book.id} className="list-group-item">
            <strong>{book.title}</strong> by {book.author}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default BookList;
