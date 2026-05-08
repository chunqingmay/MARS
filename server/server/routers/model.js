const express = require('express')

const ModelController = require('../controllers/modelController')

const router = express.Router()

router.post('/saveModel', ModelController.saveModel)
router.get('/getModel', ModelController.getModel)
// router.post('/exportGltf', ModelController.exportGltf)
// router.post('/exportStl', ModelController.exportStl)
// router.post('/exportObj', ModelController.exportObj)


module.exports = router