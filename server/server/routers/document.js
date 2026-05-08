const express = require('express')

const DocumentController = require('../controllers/documentController')

const router = express.Router()

router.get('/getDoc', DocumentController.getDocumentList)
router.post('/createDoc', DocumentController.createDocument)
router.delete('/deleteDoc', DocumentController.deleteDocument)
router.get('/getDocumentById', DocumentController.getDocumentById)

module.exports = router