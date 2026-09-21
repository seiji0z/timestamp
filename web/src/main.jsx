import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import ReactGA from 'react-ga4'

if (import.meta.env.VITE_GA_MEASUREMENT_ID) {
  ReactGA.initialize(import.meta.env.VITE_GA_MEASUREMENT_ID)
  ReactGA.send({ hitType: "pageview", page: window.location.pathname, title: "Home" })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)