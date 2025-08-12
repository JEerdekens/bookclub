import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

function BookDetails() {
  const { id } = useParams();
  const [book, setBook] = useState(null);

  useEffect(() => {
    const fetchBook = async () => {
      const docRef = doc(db, "books", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setBook(docSnap.data());
      } else {
        alert("Book not found");
      }
    };
    fetchBook();
  }, [id]);

  return (
    <div className="container mt-5">
      {book ? (
        <>
          <h2>{book.title}</h2>
          <p><strong>Author:</strong> {book.author}</p>
        </>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}

export default BookDetails;
