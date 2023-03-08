const express = require('express')
const rideController = require('../controllers/rideController')
const authController = require('../controllers/authController')

const router = express.Router()

router.route('/ride-stats').get(rideController.getRideStats)

router.route('/myRides').get(
  authController.protect,
  rideController.getMyRides)

router.route('/createMyRide').post(
  authController.protect,
  rideController.createMyRide)

router.route('/updateMyRide/:id?').patch(
  authController.protect,
  rideController.updateMyRide)

router.route('/cancelMyRide').patch(
  authController.protect,
  rideController.cancelMyRide)

router.route('/:id/assignRider').patch(
    authController.protect,
    authController.restrictTo('admin', "coordinator"),
    rideController.assignRider)

router
  .route('/')
  .get(rideController.getAllRides)

router
  .route('/:id')
  .get(authController.protect, rideController.getRide)
  .patch(
    authController.protect, authController.restrictTo('admin', "coordinator"), rideController.cancelRide)
  .delete(
    authController.protect,
    authController.restrictTo('admin'),
    rideController.deleteRide
  )

//ruta para que rider actualice ride para cambiar status del mismo y finishedAt
//ruta para que customer actualice ride para cambiar status (a cancelado, solo si status es "received")
//ruta para que customer asigne rating (solo si status es "completed")

module.exports = router


