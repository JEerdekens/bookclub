import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase"; // adjust path as needed
import {
  getDoc,
  getDocs,
  query,
  where,
  doc,
  collection,
  updateDoc
} from "firebase/firestore";

export default function ScheduleBookClub() {
  const [formData, setFormData] = useState({
    date: "",
    time: "",
    location: "",
    book: "",
  });
const [locations, setLocations] = useState([]);
  useEffect(() => {
  const fetchLocations = async () => {
    const locationsSnap = await getDocs(collection(db, "clubLocations"));
    const locations = locationsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setLocations(locations);
  };

  fetchLocations();
}, []);




  const [bookclubPicks, setBookclubPicks] = useState([]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const userSnap = await getDoc(doc(db, "users", uid));
    const clubRef = userSnap.data().bookclub;
    if (!clubRef) return;

    await updateDoc(clubRef, {
      nextMeeting: {
        date: formData.date,
        time: formData.time,
        location: formData.location,
        bookId: formData.book,
      },
    });

    alert("Book club scheduled!");
  };

  useEffect(() => {
    const fetchBookclubPicks = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const userSnap = await getDoc(doc(db, "users", uid));
      const clubRef = userSnap.data().bookclub;
      if (!clubRef) return;

      const membersQuery = query(collection(db, "users"), where("bookclub", "==", clubRef));
      const membersSnap = await getDocs(membersQuery);
      const memberRefs = membersSnap.docs.map(doc => doc.ref);

      const wantToReadSnap = await getDocs(collection(db, "wantToRead"));
      const clubWantToReadEntries = wantToReadSnap.docs
        .map(doc => doc.data())
        .filter(entry =>
          memberRefs.some(ref => ref.path === entry.user.path)
        );

      const uniqueBookRefs = [
        ...new Set(clubWantToReadEntries.map(entry => entry.book))
      ];

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

      const filteredBookRefs = uniqueBookRefs.filter(bookRef =>
        Object.values(memberProgressMap).every(progress =>
          (progress[bookRef.id] || 0) < 100
        )
      );

      const bookDocs = await Promise.all(filteredBookRefs.map(ref => getDoc(ref)));
      const booksData = bookDocs
        .filter(doc => doc.exists())
        .map(doc => ({ id: doc.id, ...doc.data() }));

      setBookclubPicks(booksData);
    };

    fetchBookclubPicks();
  }, []);

  return (
    <div className="container mt-4">
      <h2>Schedule Next Book Club</h2>
      <form onSubmit={handleSubmit} className="mt-3">
        <div className="mb-3">
          <label className="form-label">Date</label>
          <input type="date" name="date" className="form-control" onChange={handleChange} required />
        </div>
        <div className="mb-3">
          <label className="form-label">Time</label>
          <input type="time" name="time" className="form-control" onChange={handleChange} required />
        </div>
        <div className="mb-3">
          <label className="form-label">Location</label>
<select
  name="location"
  className="form-select"
  onChange={handleChange}
  required
>
  <option value="">Select a location</option>
  {locations.map(loc => (
    <option key={loc.id} value={loc.address}>
      {loc.name} ({loc.address})
    </option>
  ))}
</select>
        </div>
        <div className="mb-3">
          <label className="form-label">Book</label>
          <select
            name="book"
            className="form-select"
            onChange={handleChange}
            required
          >
            <option value="">Select a book</option>
            {bookclubPicks.map(book => (
              <option key={book.id} value={book.id}>
                {book.title} {book.author ? `by ${book.author}` : ""}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-success">
          Save Book Club
        </button>
      </form>
    </div>
  );
}
