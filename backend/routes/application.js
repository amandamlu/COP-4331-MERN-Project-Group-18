const express = require('express');
const router = express.Router();

// Adjust the import if verifyToken is a named export in your project:
// const { verifyToken } = require('../middleware/verifyToken');
const verifyToken = require('../middleware/verifyToken');
const {
  createApplication,
  getApplications,
  getApplicationById,
  updateApplication,
  deleteApplication,
} = require('../controllers/applicationController');

// Every application route requires a logged-in user
router.use(verifyToken);

router.use('/:id/contacts', contactRoutes);
router.post('/', createApplication);          // #6  Create
router.get('/', getApplications);             // #7  List (+ #11 search & filtering via query params)
router.get('/:id', getApplicationById);       // #8  Retrieve one
router.patch('/:id', updateApplication);      // #9  Update
router.delete('/:id', deleteApplication);     // #10 Delete

module.exports = router;