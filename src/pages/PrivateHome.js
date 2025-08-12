import React from "react";
import "../App.css"; // Ensure cozy styles are applied

function PrivateHome() {
  return (
    <div className="container py-5">
      <div className="text-center mb-5">
        <h2>Bookclub Home</h2>
        <p className="lead">
          Browse your collection, track your reading, and get ready for the next book club.
        </p>
      </div>

      <div className="row g-4">
        {/* Currently Reading */}
        <div className="col-md-6">
          <div className="card shadow-sm p-3">
            <h4>📚 Currently Reading</h4>
            <p>“The Midnight Library” by Matt Haig</p>
            <p>Progress: 60%</p>
            <button className="btn btn-outline-success btn-sm">Update Progress</button>
          </div>
        </div>

        {/* Next Book Club */}
        <div className="col-md-6">
          <div className="card shadow-sm p-3">
            <h4>📅 Next Book Club</h4>
            <p>Meeting: August 24th, 2025</p>
            <p>Countdown: 14 days</p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default PrivateHome;
