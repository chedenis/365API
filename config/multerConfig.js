const multer = require("multer");

const storage = multer.memoryStorage();


const upload = multer ({
    storage,
    limits: {
        fileSize: 5* 1024 * 1024
    },
    fileFilter: () => {
        if(file.mimeType.startsWith("image/")){
            cb(null, true)
        }else {
            cb(new Error ("Invalid File type, only images are allowed "), false)
        }
    }
});

module.exports = upload;