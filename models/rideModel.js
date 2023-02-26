const mongoose = require('mongoose')
const getDistance = require("../utils/getDistance")
// const validator = require('validator')

const rideSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, 'A ride must have a customer']
    },
    rider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      //required: [true, 'A ride must have a rider']
    },
    note: {
      type: String,
    },
    origin: {
      type: [Number],
      required: [true, 'A ride must have an origin'],
      index: '2dsphere',
      validate: function (value) {
        return value.length === 2 &&
          value[0] >= -90 && value[0] <= 90 &&
          value[1] >= -180 && value[1] <= 180
      }
    },
    destiny: {
      type: [Number],
      required: [true, 'A ride must have a destiny'],
      index: '2dsphere',
      validate: function (value) {
        return value.length === 2 &&
          value[0] >= -90 && value[0] <= 90 &&
          value[1] >= -180 && value[1] <= 180
      }
    },
    price: {
      type: Number,
      /*required: [true, 'A ride must have a price']*/
    },
    ride_state: {
      type: String,
      required: [true, 'A ride must have a state'],
      default: "received",
      enum: {
        values: ["received", 'processing', 'completed', "on the way", 'canceled', "failed"],
        message: 'State is either: received, processing, on the way, completed, canceled, failed'
      }
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    finishedAt: {
      type: Date,
    },
    customer_rating: {
      type: Number,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0']
    },
    ride_registry: {
      type: [String],
      default: function() {
        return ["Your ride was received at: " + new Date()]
      }
    }
  }
)

rideSchema.pre('save', async function (next) {
  //price
  this.price = getDistance(this.origin, this.destiny)
  next()
})

const Ride = mongoose.model('Ride', rideSchema)

module.exports = Ride


