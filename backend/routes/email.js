const express = require('express');
const verifyToken = require('../middleware/verifyToken');
const { getForwardingAddress } = require('../controllers/emailForwardingController');
const imports = require('../controllers/emailImportController');

const router = express.Router();

router.get('/forwarding-address', verifyToken, getForwardingAddress);

router.use('/imports', verifyToken, imports.requireImportUser);
router.get('/imports', imports.listImports);
router.get('/imports/:id', imports.getImportDetails);
router.patch('/imports/:id', imports.editImport);
router.post('/imports/:id/approve', imports.approveImport);
router.post('/imports/:id/dismiss', imports.dismissImport);
router.use('/imports', imports.handleImportError);

module.exports = router;
