const dotenv = require('dotenv')
const cloudinary = require('cloudinary').v2
const { CloudinaryStorage } = require('multer-storage-cloudinary')
dotenv.config({ path: 'vars/config.env' })

cloudinary.config({
    cloud_name:process.env.CLOUD_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret:process.env.CLOUDINARY_SECRET
})

const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'CloudinaryFolder',
        allowedFormats: ['jpeg', 'png', 'jpg'],
    }
})

module.exports = {
    storage
}