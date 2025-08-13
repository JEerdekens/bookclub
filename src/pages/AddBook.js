import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function AddBook() {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [image, setImage] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const navigate = useNavigate();

  const defaultImage =
    "https://bookstoreromanceday.org/wp-content/uploads/2020/08/book-cover-placeholder.png?w=144";

  const isValidImage = async (url) => {
    try {
      const response = await fetch(url, { method: "GET" });
      const contentType = response.headers.get("Content-Type");
      return response.ok && contentType?.startsWith("image/");
    } catch {
      return false;
    }
  };

useEffect(() => {
  const trimmed = image.trim();
  const img = new Image();

  img.onload = () => setPreviewUrl(trimmed);
  img.onerror = () => setPreviewUrl(defaultImage);

  if (trimmed) {
    img.src = trimmed;
  } else {
    setPreviewUrl(defaultImage);
  }
}, [image]);




  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedImage = image.trim();
    const valid = trimmedImage && (await isValidImage(trimmedImage));
    const finalImage = valid ? trimmedImage : defaultImage;

    await addDoc(collection(db, "books"), {
      title: title.trim(),
      author: author.trim(),
      image: finalImage
    });

    navigate("/books");
  };

  return (
    <div className="container mt-5">
      <h2>➕ Add a New Book</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          className="form-control mb-3"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <input
          type="text"
          className="form-control mb-3"
          placeholder="Author"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          required
        />
        <input
          type="text"
          className="form-control mb-3"
          placeholder="Image URL"
          value={image}
          onChange={(e) => setImage(e.target.value)}
        />

        <div className="mb-3 text-center">
<img
  src={previewUrl}
  alt="Book cover preview"
  style={{ maxHeight: "250px", objectFit: "contain" }}
  className="img-fluid border rounded"
/>



        </div>

        <button type="submit" className="btn btn-primary">
          Add Book
        </button>
      </form>
    </div>
  );
}

export default AddBook;
