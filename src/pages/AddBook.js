import React, { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

function AddBook() {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "books"), { title, author });
    setTitle("");
    setAuthor("");
    alert("Book added!");
  };

  return (
    <div className="container mt-5">
      <h2>Add a New Book</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Title" className="form-control mb-2" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input type="text" placeholder="Author" className="form-control mb-2" value={author} onChange={(e) => setAuthor(e.target.value)} />
        <button className="btn btn-primary">Add Book</button>
      </form>
    </div>
  );
}

export default AddBook;
