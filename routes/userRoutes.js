const express = require('express')
const userController = require('../controllers/userController')
const authController = require('../controllers/authController')
const multer = require('multer')
const upload = multer({ dest: 'uploads/' })
const router = express.Router()

router.route('/customers').get(userController.getCustomers)
router.route('/riders').get(userController.getRiders)
router.route('/employees').get(userController.getEmployees)

router.post('/signup', upload.single('photo'), authController.signup)

router.post('/login', authController.login)
router.post('/logout', authController.logout)

router.get('/myProfile', authController.protect, userController.getMyProfile)

router.post('/forgotPassword', authController.forgotPassword)
router.patch('/resetPassword/:token', authController.resetPassword)

router.patch(
  '/updateMyPassword',
  authController.protect,
  authController.updatePassword
)

router.patch('/updateMe',
  authController.protect,
  upload.single('photo'),
  authController.roleUpdate,
  userController.updateMe)
router.delete('/deleteMe', authController.protect, userController.deleteMe)

router
  .route('/')
  .get(userController.getAllUsers)
  .post(
    authController.protect,
    authController.restrictTo('admin'),
    upload.single('photo'),
    authController.roleUpdate,
    userController.createUser)

router
  .route('/:id')
  .get(userController.getUser)
  .patch(
    authController.protect,
    authController.restrictTo('admin'),
    upload.single('photo'),
    authController.roleUpdate,
    userController.updateUser)
  .delete(
    authController.protect,
    authController.restrictTo('admin'),
    userController.deleteUser)

module.exports = router



