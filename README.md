# React-App
Employee Self Service (ESS) Portal built with React &amp; TypeScript, powered by ERPNext/Frappe REST APIs.


<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1XB8LHCi9e5-o6H2C23jEoFx9XD7li-V6

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


   # Learn School — Employee Self Service Portal

A modern, responsive Employee Self Service (ESS) web application 
built with **React 18** and **TypeScript**, integrated with 
**ERPNext (Frappe Framework)** via REST APIs.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Routing:** React Router DOM (Hash Router)
- **HTTP Client:** Axios
- **Backend:** ERPNext v15 / Frappe Framework (REST API)
- **Auth:** Frappe session-based authentication with CSRF token handling

## Features

- 🔐 Custom React login page (bypasses ERPNext default login)
- 📅 Attendance tracking & biometric logs
- 🌿 Leave application & approval management
- 💰 Salary slip viewing & download
- 👤 Employee profile management
- 📁 Employee directory with search
- 🏫 Faculty portal — course schedules, student attendance & assessment results
- ✅ Todo / task management
- 📆 Calendar & event management
- 🔔 Real-time notifications

## Architecture

The app communicates entirely through ERPNext REST APIs 
(`/api/method` and `/api/resource`), using cookie-based session 
auth with automatic CSRF token management. Deployed as a static 
build on the same domain as ERPNext, with Nginx serving the 
React app independently from the ERP backend.
```
