// pages/FacultyClassroomPage.tsx
// Simple launcher page for teachers — one click straight out to Google Classroom.
// No OAuth, no data mirrored into the portal — teachers manage Classroom directly
// in their own Google account, this just opens classroom.google.com in a new tab.

import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, GraduationCap } from "lucide-react";

const GOOGLE_CLASSROOM_URL = "https://classroom.google.com";

export const FacultyClassroomPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-3xl animate-in fade-in duration-300">
      <button
        type="button"
        onClick={() => navigate("/faculty")}
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        <ArrowLeft size={16} />
        Teacher Dashboard
      </button>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-green-50 border border-green-100 mx-auto flex items-center justify-center mb-5">
          <GraduationCap size={32} className="text-green-600" />
        </div>
        <h1 className="text-xl font-black text-gray-800 mb-2">Google Classroom</h1>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed max-w-md mx-auto">
          Head over to Google Classroom to post announcements, assignments, and grade
          coursework for your classes. This opens in a new tab using your own Google account.
        </p>
        <a
          href={GOOGLE_CLASSROOM_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 transition-colors shadow-lg shadow-green-100"
        >
          Open Google Classroom
          <ExternalLink size={16} />
        </a>
      </div>
    </div>
  );
};

export default FacultyClassroomPage;