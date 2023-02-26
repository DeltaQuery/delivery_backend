const crypto = require('crypto')
const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')

/* {
    "name": "DeltaQuery",
    "email": "cebracho94@gmail.com",
    "phone" : "584140000000",
    "photo": "https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/c31b8f89-a809-446b-8275-a5adab4be586/d85o4zy-ecaafe3e-0d07-4dc4-8ead-0e9a48947e5b.png?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7InBhdGgiOiJcL2ZcL2MzMWI4Zjg5LWE4MDktNDQ2Yi04Mjc1LWE1YWRhYjRiZTU4NlwvZDg1bzR6eS1lY2FhZmUzZS0wZDA3LTRkYzQtOGVhZC0wZTlhNDg5NDdlNWIucG5nIn1dXSwiYXVkIjpbInVybjpzZXJ2aWNlOmZpbGUuZG93bmxvYWQiXX0.wHdLS-Ukzeo0-rgAZiPadnyxRiq-jiWr9Zrktbwg5vc",
    "user_type": "employee",
    "role": "admin",
    "password": "delivery",
    "passwordConfirm": "delivery"
}*/

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please tell us your name!']
    },
    email: {
        type: String,
        required: [true, 'Please provide your email.'],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Please provide a valid email.']
    },
    phone: {
        type: Number,
        required: [true, "Phone is required to contact the user."],
    },
    photo: String,
    user_type: {
        type: String,
        enum: ['employee', 'customer', 'rider'],
        required: [true, "Please select an user type between employee, customer or rider."]
    },
    role: {
        type: String,
        enum: ['admin', 'coordinator', 'clerk']
    },
    password: {
        type: String,
        required: [true, 'Please provide a password.'],
        minlength: 8,
        select: false
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Please confirm your password.'],
        validate: {
            // This only works on CREATE and SAVE!!!
            validator: function (el) {
                return el === this.password
            },
            message: 'Passwords are not the same!'
        }
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
        type: Boolean,
        default: true,
        select: false
    },
    orders_history: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ride' }]
},
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    })

userSchema.virtual('current_order').get(function () {
    if (this.orders_history && this.orders_history?.length > 0) {
        if (this.orders_history[this.orders_history.length - 1].ride_state === "received"
        ||
        this.orders_history[this.orders_history.length - 1].ride_state === "processing"
        ||
        this.orders_history[this.orders_history.length - 1].ride_state === "on the way") {
            return this.orders_history[this.orders_history.length - 1]
        }
    }
})

userSchema.pre('save', async function (next) {
    // Only run this function if password was actually modified
    if (!this.isModified('password')) return next()

    // Hash the password with cost of 12
    this.password = await bcrypt.hash(this.password, 12)

    // Delete passwordConfirm field
    this.passwordConfirm = undefined
    next()
})

userSchema.pre('save', function (next) {
    if (!this.isModified('password') || this.isNew) return next()

    this.passwordChangedAt = Date.now() - 1000
    next()
})

userSchema.pre('save', function (next) {
    if (!this.isModified('user_type')) return next()

    if (this.user_type === "employee") {
        if (this.role === undefined || this.role === null) {
            throw new Error('If you are an employee, you must pick a role!')
        }
    }
    if (this.user_type !== "employee" && this.role !== undefined) {
        throw new Error('If you are not an employee, you must leave your role empty!')
    }
    next()
})

/*
userSchema.pre(/^find/, function (next) {
    this.find({ active: { $ne: false } })
    next()
})*/
/*
userSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'orders_history',
        select: "customer rider origin destiny price ride_state createdAt finishedAt customer_rating"
    })
    next()
})*/

//virtual populate example. To populate rides without storing them in database! Be careful because it can get messed up with other populates, creating a chain of populates
userSchema.virtual("rides", {
    ref: "Ride",
    foreignField: "customer",
    localField: "_id"
})

userSchema.methods.correctPassword = async function (
    candidatePassword,
    userPassword
) {
    return await bcrypt.compare(candidatePassword, userPassword)
}

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(
            this.passwordChangedAt.getTime() / 1000,
            10
        )

        return JWTTimestamp < changedTimestamp
    }
    // False means NOT changed
    return false
}

userSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString('hex')

    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex')

    //console.log({ resetToken }, this.passwordResetToken)

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000

    return resetToken
}

const user = mongoose.model('user', userSchema)

module.exports = user



