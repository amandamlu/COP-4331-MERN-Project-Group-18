const express = require('express');
const router = express.Router();

const contactRoutes = require('./contact'); 

// Adjust the import if verifyToken is a named export in your project:
// const { verifyToken } = require('../middleware/verifyToken');
const verifyToken = require('../middleware/verifyToken');
const {
  createApplication,
  getApplications,
  getApplicationStats,
  getApplicationById,
  updateApplication,
  deleteApplication,
} = require('../controllers/applicationController');

// Every application route requires a logged-in user
router.use(verifyToken);

router.post('/', createApplication);          // #6  Create
router.get('/', getApplications);             // #7  List (+ #11 search & filtering via query params)

console.log('Statistics route registered');
router.get('/stats', getApplicationStats); // #19 Retrieve statistics

router.use('/:id/contacts', contactRoutes);
router.get('/:id', getApplicationById);       // #8  Retrieve one
router.patch('/:id', updateApplication);      // #9  Update
router.delete('/:id', deleteApplication);     // #10 Delete

module.exports = router;