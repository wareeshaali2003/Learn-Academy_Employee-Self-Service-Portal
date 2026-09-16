import axios from 'axios';
import { ClassroomStatus, ClassroomDashboardCourse, ClassroomCourseDetail } from '../types/classroom';

// In dev these are proxied by Vite (see vite.config.ts) to the Node backend in /server.
// In prod, point VITE_CLASSROOM_SERVER_URL at wherever that backend is deployed and
// swap these base paths for `${VITE_CLASSROOM_SERVER_URL}/api/classroom` / `/auth`.
const API_BASE = '/gc-api';
const AUTH_BASE = '/gc-auth';

// A teacher can be listed on many courses, and each one needs several live Google
// Classroom API calls (coursework, all-student submissions, roster) — with several
// courses that adds up to well over Axios's old 30s default, especially if Google's
// API rate-limits a call and our backend has to back off and retry. 90s gives real
// dashboards room to finish instead of erroring out.
const client = axios.create({ baseURL: API_BASE, timeout: 90000 });

export const classroomService = {
  /** Redirects the whole browser tab to Google's OAuth consent screen. */
  connect(employeeId: string) {
    window.location.href = `${AUTH_BASE}/google?employeeId=${encodeURIComponent(employeeId)}`;
  },

  async disconnect(employeeId: string): Promise<void> {
    await axios.post(`${AUTH_BASE}/google/disconnect`, { employeeId });
  },

  async getStatus(employeeId: string): Promise<ClassroomStatus> {
    const { data } = await client.get('/status', { params: { employeeId } });
    return data;
  },

  /** Always hits the live Google Classroom API — nothing is cached server-side. */
  async getDashboard(employeeId: string): Promise<ClassroomDashboardCourse[]> {
    const { data } = await client.get('/dashboard', { params: { employeeId } });
    return data.courses || [];
  },

  async getCourseDetail(employeeId: string, classroomCourseId: string): Promise<ClassroomCourseDetail> {
    const { data } = await client.get(`/courses/${encodeURIComponent(classroomCourseId)}`, {
      params: { employeeId },
    });
    return data;
  },
};

export default classroomService;