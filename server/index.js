const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const Chatkit = require('@pusher/chatkit-server');

const filetype = require('file-type');
const fs = require('fs');
const multer  = require('multer');
const randomstring = require('randomstring');

const ffmpeg = require('fluent-ffmpeg');
const nodePandoc = require('node-pandoc');
const gm = require('gm').subClass({ imageMagick: true });
const mimetypes = require('mime-types');

const valid_filetypes = [
  'mkv', 'mp4', 'avi', 'flv', 'mov', 'webm', 'wmv',
  'wav', 'flacc', 'mp3', 'ogg', 'm4v',
  'jpeg', 'jpg', 'png', 'gif', 'bmp', 'tif', 'webp',
  'odt', 'epub', 'docx', 'pdf'
];

const video_mimetypes = ['video/x-matroska', 'video/x-flv', 'video/quicktime', 'video/webm', 'video/ms-asf', 'video/x-ms-wmv', 'video/x-msvideo']; // convert to mp4
const audio_mimetypes = ['audio/mp4', 'audio/ogg', 'audio/vnd.wav']; // convert to mp3
const image_mimetypes = ['image/bmp', 'image/webp', 'image/tiff'];
const doc_mimetypes = ['application/epub+zip', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.oasis.opendocument.text'];

const upload = multer({
  limits: {
    fileSize: 30 * 1024 * 1024, // 30mb
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (valid_filetypes.some(ext => file.originalname.endsWith("." + ext))) {
      return cb(null, true);
    }
    return cb(new Error('Invalid file type'));
  }
});

const validateFileType = async (req, res, next) => {
  try {
    const mime = filetype(req.file.buffer);
    if (!mime || !valid_filetypes.includes(mime.ext)) {
      return next(new Error('invalid file type.'));
    }
  } catch (err) {
    return next(new Error('invalid file type.'));
  }

  next();
}

require('dotenv').config();
const app = express();

const INSTANCE_LOCATOR_ID = process.env.CHATKIT_INSTANCE_LOCATOR_ID;
const CHATKIT_SECRET = process.env.CHATKIT_SECRET_KEY;

const chatkit = new Chatkit.default({
  instanceLocator: INSTANCE_LOCATOR_ID,
  key: CHATKIT_SECRET
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
app.use('/uploads', express.static('uploads'))

app.get("/", (req, res) => {
  res.send('all green');
});

app.post("/user", async (req, res) => {
  const { username } = req.body;
  try {
    const users = await chatkit.getUsers();
    const user = users.find((usr) => usr.name == username);
    res.send({ user });
  } catch (get_user_err) {
    console.log("error getting user: ", get_user_err);
  }
});

app.post("/rooms", async (req, res) => {
  const { user_id } = req.body;
  try {
    const rooms = await chatkit.getUserRooms({
      userId: user_id
    });
    rooms.map((item) => {
      item.joined = true;
      return item;
    });

    const joinable_rooms = await chatkit.getUserJoinableRooms({
      userId: user_id
    });
    joinable_rooms.map((item) => {
      item.joined = false;
      return item;
    });

    const all_rooms = rooms.concat(joinable_rooms);

    res.send({ rooms: all_rooms });
  } catch (get_rooms_err) {
    console.log("error getting rooms: ", get_rooms_err);
  }
});

app.post("/user/join", async (req, res) => {
  const { room_id, user_id } = req.body;
  try {
    await chatkit.addUsersToRoom({
      roomId: room_id,
      userIds: [user_id]
    });

    res.send('ok');
  } catch (user_permissions_err) {
    console.log("error getting user permissions: ", user_permissions_err);
  }
});


app.post('/upload', upload.single('fileData'), validateFileType, (req, res, next) => {

  const filename = randomstring.generate();
  fs.writeFile(`uploads/${filename}`, req.file.buffer, (err) => {

    if (err) {
      console.log("error: ", err);
      res.status(400).send(new Error('error getting the file'));
    }

    const mime_type = req.file.mimetype;
    const file_path = `uploads/${filename}`;
    const file_ext = mimetypes.extension(mime_type);

    const host = req.get('host');

    if (video_mimetypes.includes(mime_type) || audio_mimetypes.includes(mime_type)) {
      const is_video = video_mimetypes.includes(mime_type);
      const converted_file_ext = is_video ? 'mp4' : 'mp3';

      let file = ffmpeg(file_path);
      if (is_video) {
        file = file.size('360x?');
      }

      file.output(`${file_path}.${converted_file_ext}`)
      .on('end', () => {
        return res.send({
          url: `https://${host}/${file_path}.${converted_file_ext}`,
          type: is_video ? 'video/mp4' : 'audio/mpeg'
        });
      })
      .run();
    } else if (image_mimetypes.includes(mime_type)) {
      gm(file_path)
        .resize(400)
        .write(`${file_path}.png`, (err) => {
          if (!err) {
            return res.send({
              url: `https://${host}/${file_path}.png`,
              type: 'image/png'
            });
          }
        });
    } else if (doc_mimetypes.includes(mime_type)) {
      nodePandoc(file_path, `-f ${file_ext} -t html5 -o ${file_path}.pdf`, (err, result) => {
        if (!err) {
          return res.send({
            url: `https://${host}/${file_path}.pdf`,
            type: 'application/pdf'
          });
        }
      });
    } else {
      fs.rename(file_path, `${file_path}.${file_ext}`, function(err) {
        if (!err) {
          return res.send({
            url: `https://${host}/${file_path}.${file_ext}`,
            type: mime_type
          });
        }
      });
    }
  });
});

const PORT = 5000;
app.listen(PORT, (err) => {
  if (err) {
    console.error(err);
  } else {
    console.log(`Running on ports ${PORT}`);
  }
});