import React from "react";

import { HashRouter } from "react-router-dom";

import AppWrapper from "./components/AppWrapper";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap-icons/font/bootstrap-icons.css';

function App() {
  return (
    <HashRouter>
      <AppWrapper />
    </HashRouter>
  );
}

export default App;
