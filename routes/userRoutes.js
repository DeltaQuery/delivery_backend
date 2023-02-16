const express = require('express')
const userController = require('../controllers/userController')
const authController = require('../controllers/authController')

const router = express.Router()

router.route('/customers').get(userController.getCustomers)
router.route('/riders').get(userController.getRiders)
router.route('/employees').get(userController.getEmployees)

router.post('/signup', authController.signup)
router.post('/login', authController.login)
router.post('/logout', authController.logout)

router.post('/forgotPassword', authController.forgotPassword)
router.patch('/resetPassword/:token', authController.resetPassword)

router.patch(
  '/updateMyPassword',
  authController.protect,
  authController.updatePassword
)

router.patch('/updateMe',
  authController.protect,
  authController.roleUpdate,
  userController.updateMe)
router.delete('/deleteMe', authController.protect, userController.deleteMe)

router
  .route('/')
  .get(userController.getAllUsers)
  .post(
    authController.protect,
    authController.restrictTo('admin'),
    authController.roleUpdate,
    userController.createUser)

router
  .route('/:id')
  .get(userController.getUser)
  .patch(
    authController.protect,
    authController.restrictTo('admin'),
    authController.roleUpdate,
    userController.updateUser)
  .delete(
    authController.protect,
    authController.restrictTo('admin'),
    userController.deleteUser)

module.exports = router



