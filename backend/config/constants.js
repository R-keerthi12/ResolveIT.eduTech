/**
 * config/constants.js
 * Shared constants used across the application.
 */

const path = require('path');

module.exports = {
  PORT: process.env.PORT || 3000,

  DATA_DIR: path.join(__dirname, '..', 'data'),

  FILES: {
    USERS:      'users.json',
    GRIEVANCES: 'grievances.json',
    FEEDBACK:   'feedback.json',
  },

  ROLES: {
    ADMIN:    'admin',
    RESOLVER: 'resolver',
    STUDENT:  'student',
  },

  STATUSES: ['Pending', 'In Progress', 'Resolved', 'Forwarded', 'Forwarded to Admin'],

  PRIORITIES: ['Normal', 'High', 'Urgent'],

  DEPARTMENTS: [
    { id: 'ACAD', name: 'Academic Department',       icon: '📚', desc: 'Exams, results, curriculum, faculty issues' },
    { id: 'ADMN', name: 'Administration Department', icon: '🏛️', desc: 'Fees, certificates, admissions, records' },
    { id: 'TECH', name: 'IT / Technical Department', icon: '💻', desc: 'Internet, computers, software, lab issues' },
    { id: 'HOST', name: 'Hostel Department',         icon: '🏠', desc: 'Rooms, food, water, hostel facilities' },
    { id: 'TRAN', name: 'Transport Department',      icon: '🚌', desc: 'Bus routes, schedules, transport issues' },
    { id: 'LIBR', name: 'Library Department',        icon: '📖', desc: 'Books, resources, library access' },
    { id: 'FINC', name: 'Finance Department',        icon: '💰', desc: 'Scholarships, refunds, fee issues' },
    { id: 'SPRT', name: 'Sports Department',         icon: '⚽', desc: 'Sports facilities, equipment, events' },
  ],
};
