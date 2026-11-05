const express = require('express');
// mergeParams lets this router read :id from the parent path (/api/applications/:id/contacts)
const router = express.Router({ mergeParams: true });

const {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
} = require('../controllers/contactController');

// Authentication (verifyToken) is applied by the parent router in application.js
router.get('/', getContacts);                    // #14 Retrieve contacts
router.post('/', createContact);                 // #15 Create contact
router.patch('/:contactId', updateContact);      // #16 Update contact
router.delete('/:contactId', deleteContact);     // #17 Delete contact

module.exports = router;