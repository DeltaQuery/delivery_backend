const Ride = require('../models/rideModel')
const User = require('../models/userModel')
const APIFeatures = require('../utils/apiFeatures')
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/appError')
const filterObj = require("../utils/filterObj")
const getDistance = require("../utils/getDistance")
 
exports.createMyRide = catchAsync(async (req, res, next) => {
  const filteredBody = filterObj(req.body, "origin", "destiny", "note")
  filteredBody.customer = req.user._id
  const newRide = await Ride.create(filteredBody)
  if(!newRide) return next(new AppError('The ride could not be created', 404))

  const customer = await User.findById(req.user._id)
  if (customer) {
    if(customer.current_order){
      return next(new AppError('You cannot create a new ride is you have a delivery in process!', 404))
    }
    let orders_history = customer.orders_history
    orders_history.push(newRide._id)
    const updatedUser = await User.findByIdAndUpdate(customer._id, { orders_history: orders_history })
    if(!updatedUser) return next(new AppError('The user could not be updated with the new orders_history', 404))
  }

  res.status(200).json({
    status: 'success',
    data: {
      ride: newRide
    }
  })
})

exports.getMyRides = catchAsync(async (req, res, next) => {
  let field 
  if(req.user.user_type === "customer") field = "customer"
  if(req.user.user_type === "rider") field = "rider"
  const myRides = await Ride.find({ [field] : req.user._id })
  .populate({ path: "customer", model: User, select: { "orders_history": 0, "photo": 0, "user_type": 0 } })
  .populate({ path: "rider", model: User, select: { "orders_history": 0, "photo": 0, "user_type": 0 } })
  if(!myRides) return next(new AppError('There was an error retrieving your rides', 404))

  res.status(200).json({
    status: 'success',
    data: {
      rides: myRides
    }
  })
})

exports.updateMyRide = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id)
  if (!user) {
    return next(new AppError('Your ID as an user was not found', 404))
  }
  if (!user.current_order) {
    return next(new AppError('There is not a current order at the moment', 404))
  }

  const originalRide = await Ride.findById(user.current_order._id)

  if (!originalRide) {
    return next(new AppError('No ride found with that ID', 404))
  }

  if (req.user.id != originalRide.customer && req.user.id != originalRide.rider) {
    return next(new AppError('This is not your ride. You cannot update it!', 404))
  }

  let filteredFields = []

  //if user is customer
  if (req.user.id == originalRide.customer) {
    filteredFields = ["note", "customer_rating"]
    //if delivery is not completed, dont allow customer_rating
    if (originalRide.ride_state === ("received" || "processing")) {
      filteredFields.pop()
    }
    //if delivery is finished, dont allow to update note
    if (originalRide.ride_state === ("completed" || "canceled" || "failed")) {
      filteredFields.shift()
    }
  }

  //if user is rider
  if (req.user._id == originalRide.rider) {
    filteredFields = ["ride_state", "finishedAt"]
    //allow to update ride_state to completed
    if (req.body.ride_state === ("completed" || "failed")) {
      req.body.finishedAt = new Date()
    } else {
      filteredFields.pop()
    }
    //rider cannot update ride_state if it is completed, canceled or failed
    if (originalRide.ride_state === ("completed" || "canceled" || "failed")) filteredFields = undefined
  }

  const filteredBody = filterObj(req.body, ...filteredFields)

  const newRide = await Ride.findByIdAndUpdate(originalRide._id, filteredBody, {
    new: true,
    runValidators: true
  })

  if (!newRide) {
    return next(new AppError('No ride found with that ID', 404))
  }

  res.status(200).json({
    status: 'success',
    data: {
      user: newRide
    }
  })
})
 
exports.cancelMyRide = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id)
  if (!user) {
    return next(new AppError('Your ID as an user was not found', 404))
  }
  if (!user.current_order) {
    return next(new AppError('There is not a current order at the moment', 404))
  }
  const originalRide = await Ride.findById(user.current_order._id)

  if (!originalRide) {
    return next(new AppError('No ride found with that ID', 404))
  }

  if (req.user.id != originalRide.customer) {
    return next(new AppError('This is not your ride. You cannot update it!', 404))
  }

  if (originalRide.ride_state !== "received") {
    return next(new AppError('You cannot cancel your ride because it is processing or finished. Please contact Customer Support', 404))
  }

  originalRide.ride_state = "canceled"
  originalRide.finishedAt = new Date()

  const newRide = await Ride.findByIdAndUpdate(originalRide._id, originalRide, {
    new: true,
    runValidators: true
  })

  if (!newRide) {
    return next(new AppError('No ride found with that ID', 404))
  }

  res.status(200).json({
    status: 'success',
    data: {
      user: newRide
    }
  })
})

exports.getAllRides = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Ride.find()
    .populate({ path: "customer", model: User, select: { "orders_history": 0, "photo": 0, "user_type": 0 } })
    .populate({ path: "rider", model: User, select: { "orders_history": 0, "photo": 0, "user_type": 0 } }),
    req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate()
  const rides = await features.query

  res.status(200).json({
    status: 'success',
    results: rides.length,
    data: {
      rides
    }
  })
}) 

exports.getRide = catchAsync(async (req, res, next) => {
  const ride = await Ride.findById(req.params.id).populate({ path: "customer", model: User }).populate({ path: "rider", model: User })

  if (!ride) {
    return next(new AppError('No ride found with that ID', 404))
  }

  res.status(200).json({
    status: 'success',
    data: {
      ride
    }
  })
})

exports.createRide = catchAsync(async (req, res, next) => {
  const customer = await User.findById(req.body.customer)
  if(!customer) return next(new AppError('The customer id could not be found', 404))
  if(customer.user_type !== "customer") return next(new AppError('The user must be a customer', 404))
  const newRide = await Ride.create(req.body)
  if(!newRide) return next(new AppError('The ride could not be created', 404))

  if (customer) {
    let orders_history = customer.orders_history
    orders_history.push(newRide._id)
    const newCustomer = await User.findByIdAndUpdate(customer._id, { orders_history: orders_history })
    if(!newCustomer) return next(new AppError('The customer could not be updated with the new order_history', 404))
  }

  res.status(201).json({
    status: 'success',
    data: {
      ride: newRide
    }
  })
})

exports.assignRider = catchAsync(async (req, res, next) => {
  if (req.body.rider === undefined) return next(new AppError('You didnt provide a rider id!', 404))
  const ride = await Ride.findById(req.params.id)
  if (!ride) return next(new AppError('The ride id you provided could not be found!', 404))
  let newRider
  if (req.body.rider !== null) {
    newRider = await User.findById(req.body.rider)
    if (!newRider) return next(new AppError('The new rider id you provided could not be found!', 404))
  }
  if (req.body.rider == ride.customer.toString()) {
    return next(new AppError('You cannot assign a rider with the same id as the customer!', 404))
  }
  /*si es null, checkear ride que quiero modificar. Si rider es undefined o undefined, no hacer nada.
  Si rider tiene id asignado, poner null. Tomar ese rider previo y retirarle ride_id de su orders_history */
  if (req.body.rider === null) {
    if (ride.rider === undefined || ride.rider === null) {
      return res.status(200).json({
        status: 'success',
        data: {
          ride
        }
      })
    } else {
      const rider = await User.findById(ride.rider)
      let old_orders_history = rider.orders_history
      let index = old_orders_history.findIndex(ride => ride._id.toString() == ride._id.toString())
      if (index !== -1) {
        old_orders_history.splice(index, 1)
      }
      await User.findByIdAndUpdate(ride.rider, { orders_history: old_orders_history }, {
        new: true,
        runValidators: true
      })
      ride.rider = null
      const newRide = await Ride.findByIdAndUpdate(req.params.id, ride, {
        new: true,
        runValidators: true
      })
      return res.status(200).json({
        status: 'success',
        data: {
          newRide
        }
      })
    }
  }
  /*si rider NO es null, hacer lo demás:
  Si rider.id es distinto del ride.rider.id, entonces proceder:
   */
  //to avoid problems with toString(), transform null or undefined in ""
  let rideRider = ride.rider
  if (rideRider === null || rideRider === undefined) {
    rideRider = ""
  }

  if (rideRider.toString() != req.body.rider.toString()) {
    let new_orders_history
    let index
    //añadir ride a history de newRider
    /*si newRider YA tenía un ride actual asignado, buscar ese ride y:
  a) quitarle ese ride de su history
  b) quitar rider de ese ride */
    new_orders_history = newRider.orders_history
    //quitarle ride actual anterior a newRider, si tenía currentOrder
    if (newRider.current_order) {
      const currentOrderId = newRider.current_order._id
      index = newRider.orders_history.findIndex(el => el._id.toString() == newRider.current_order._id.toString())
      if (index !== -1) {
        new_orders_history.splice(index, 1)
      }
      //actualizar current_order (ride) para poner null rider
      await Ride.findByIdAndUpdate(currentOrderId, { rider: null })
    }
    //añadir ride nuevo a history de newRider
    index = newRider.orders_history.findIndex(el => el._id.toString() == ride._id.toString())
    if (index === -1) {
      new_orders_history = newRider.orders_history
      new_orders_history.push(ride._id)
    }

    await User.findByIdAndUpdate(req.body.rider, { orders_history: new_orders_history }, {
      runValidators: true
    })

    /*retirar ride de history de oldRider */
    if (ride.rider !== undefined && ride.rider !== null) {
      const oldRider = await User.findById(ride.rider)
      if (oldRider) {
        new_orders_history = oldRider.orders_history
        index = new_orders_history.findIndex(el => el._id.toString() == ride._id.toString())
        if (index !== -1) {
          new_orders_history.splice(index, 1)
        }
        await User.findByIdAndUpdate(ride.rider, { orders_history: new_orders_history }, {
          runValidators: true
        })
      }
    }
  }

  const newRide = await Ride.findByIdAndUpdate(req.params.id, { rider: req.body.rider }, {
    new: true,
    runValidators: true
  })
  if (!newRide) {
    return next(new AppError('No ride found with that ID', 404))
  }

  res.status(200).json({
    status: 'success',
    data: {
      newRide
    }
  })
})

exports.updateRide = catchAsync(async (req, res, next) => {
  const originalRide = await Ride.findById(req.params.id)
  if (!originalRide) return next(new AppError('The ride id you provided could not be found!', 404))
  // 2) Name only wwanted fields names that are allowed to be updated
  const filteredBody = filterObj(req.body, "ride_state", "note", "origin", "destiny", "finishedAt")

  //if origin or destiny changed, reprice ride
  filteredBody.price = getDistance(
    filteredBody.origin ? filteredBody.origin : originalRide.origin,
    filteredBody.destiny ? filteredBody.destiny : originalRide.destiny
  )
  //if ride_state changed, updatefinishedAt
  if (req.body.ride_state) {
    filteredBody.finishedAt = new Date()
  } else {
    delete filteredBody.finishedAt
  }

  const newRide = await Ride.findByIdAndUpdate(req.params.id, filteredBody, {
    new: true,
    runValidators: true
  })

  if (!newRide) {
    return next(new AppError('No ride found with that ID', 404))
  }

  res.status(200).json({
    status: 'success',
    data: {
      newRide
    }
  })
})

exports.deleteRide = catchAsync(async (req, res, next) => {
  const originalRide = await Ride.findById(req.params.id)

  if (!originalRide) {
    return next(new AppError('No ride found with that ID', 404))
  }

  if (originalRide.rider) {
    const rider = await User.findById(originalRide.rider)
    if (rider) {
      let orders_history = rider.orders_history
      const index = orders_history.findIndex(obj => obj._id.toString() == originalRide._id.toString())
      if (index !== -1) orders_history.splice(index, 1)
      await User.findByIdAndUpdate(originalRide.rider, { orders_history: orders_history }, {
        runValidators: true
      })
    }
  }

  const customer = await User.findById(originalRide.customer)
  if (customer) {
    let orders_history = customer.orders_history
    if (orders_history.length > 0) {
      const index = orders_history.findIndex(obj => obj._id.toString() === originalRide._id.toString())
      if (index !== -1) orders_history.splice(index, 1)
    }
    await User.findByIdAndUpdate(originalRide.customer, { orders_history: orders_history }, {
      runValidators: true
    })
  }

  await Ride.findByIdAndDelete(req.params.id)

  res.status(204).json({
    status: 'success',
    data: null
  })
})

exports.getRideStats = catchAsync(async (req, res, next) => {
  const stats = await Ride.aggregate([
    {
      $group: {
        _id: { ride_state: '$ride_state' },

        numRides: { $sum: 1 },
        numRatings: { $sum: { $cond: [{ $eq: ["$ride_state", "completed"] }, '$customer_rating', 0] } },
        avgRating: { $avg: { $cond: [{ $eq: ["$ride_state", "completed"] }, '$customer_rating', 0] } },
        avgPrice: { $avg: '$price' },
      },
    }
  ])
  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  })
})

/*exports.aliasTopRides = (req, res, next) => {
  req.query.limit = '5'
  req.query.sort = '-ratingsAverage,price'
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty'
  next()
}

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1 // 2021

  const plan = await Ride.aggregate([
    {
      $unwind: '$startDates'
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numRideStarts: { $sum: 1 },
        rides: { $push: '$name' }
      }
    },
    {
      $addFields: { month: '$_id' }
    },
    {
      $project: {
        _id: 0
      }
    },
    {
      $sort: { numRideStarts: -1 }
    },
    {
      $limit: 12
    }
  ])

  res.status(200).json({
    status: 'success',
    data: {
      plan
    }
  })
})
*/


