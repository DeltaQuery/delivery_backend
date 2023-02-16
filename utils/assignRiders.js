
const Ride = require('../models/rideModel')
const User = require('../models/userModel')

const assignRiders = async () => {
    try {
        const rides_data = await getPendingRides()
        const rides = rides_data.data.rides
        const riders_data = await getRiders()
        const riders = Object.assign({}, riders_data.data.riders)
        if(rides.length > 0 && riders.length > 0){
          for (let i = 0; i < rides.length; i++) {
                    await setRider(riders[0]._id, rides[i]._id)
                    riders.push(riders.shift())
                }  
        }

    } catch (e) {
        console.log("There was an error running the assignRiders function: ", e)
    } finally {
        setTimeout(assignRiders, 1000000)
    }
}

const getPendingRides = async () => {
    try {
        const rides = await Ride.find({ rider: { $eq: undefined } }).sort({ startedAt: 1 })

        return {
            results: rides.length,
            data: {
                rides
            }
        }
    } catch (e) {
        console.log(e)
    }
}

const sortRiders = (riders) => {
    riders.sort((a, b) => {
        if (b.current_order === a.current_order) {
            return 0
        }

        return b.current_order ? -1 : 1
    })
    return riders
}

const getRiders = async () => {
    try {
        const riders = await User.find({ user_type: { $eq: "rider" } })

        return {
            results: riders.length,
            data: {
                riders: sortRiders(riders)
            }
        }
    } catch (e) {
        console.log(e)
    }
}

const setRider = async (riderId, rideId) => {
    const ride = await Ride.findById(rideId)
    if (!ride) throw Error('The ride id you provided could not be found!', 404)
    const newRider = await User.findById(riderId)
    if (!newRider) throw Error('The rider id you provided could not be found!', 404)

    //to avoid problems with toString(), transform null or undefined in ""
    let rideRider = ride.rider
    if (rideRider === null || rideRider === undefined) {
        rideRider = ""
    }

    if (rideRider.toString() != riderId.toString()) {
        let new_orders_history
        let index

        new_orders_history = newRider.orders_history

        if (newRider.current_order) {
            const currentOrderId = newRider.current_order._id
            await Ride.findByIdAndUpdate(currentOrderId, { ride_state: "finished" })
        }
        //añadir ride nuevo a history de newRider
        index = newRider.orders_history.findIndex(el => el._id.toString() == ride._id.toString())
        if (index === -1) {
            new_orders_history = newRider.orders_history
            new_orders_history.push(ride._id)
        }

        await User.findByIdAndUpdate(riderId, { orders_history: new_orders_history }, {
            runValidators: true
        })
    }

    const newRide = await Ride.findByIdAndUpdate(rideId, { rider: riderId }, {
        new: true,
        runValidators: true
    })
    if (!newRide) {
        throw Error('No ride found with that id when trying to update!', 404)
    }

    return newRide
}

module.exports = assignRiders