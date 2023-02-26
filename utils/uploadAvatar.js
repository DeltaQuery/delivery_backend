const cloudinary = require("cloudinary")
const { storage } = require("../storage/storage")
const multer = require('multer')

const uploadAvatar = async (file) => {
    try {

        const photo = await cloudinary.v2.uploader.upload(file.path)
        return photo.secure_url
    } catch (e) {
        throw new Error(e)
    }
}

module.exports = uploadAvatar
