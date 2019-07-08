# RNChatMedia
A React Native Chat app which uploads files to a Node.js server.

You can read the tutorial at: [https://pusher.com/tutorials/media-conversion-react-native](https://pusher.com/tutorials/media-conversion-react-native)

### Prerequisites

-   React Native development environment
-   [Node.js](https://nodejs.org/en/)
-   [Yarn](https://yarnpkg.com/en/)
-   Linux server - for converting media (or just use your computer. Just install ffmpeg, imagemagick, pandoc, and wkhtmltopdf)
-   [Chatkit](https://pusher.com/chatkit) - create an app instance and enable token provider URL.
-   [ngrok](https://ngrok.com/) - optional if your conversion server is already in the cloud.

## Getting Started

1. Install conversion server dependencies (ffmpeg, Pandoc, wkhtmltopdf, ImageMagick):

```
sudo add-apt-repository ppa:jonathonf/ffmpeg-4
sudo apt install ffmpeg
ffmpeg -version


wget https://github.com/jgm/pandoc/releases/download/2.7.3/pandoc-2.7.3-1-amd64.deb
sudo dpkg -i pandoc-2.7.3-1-amd64.deb

sudo apt-get install xvfb libfontconfig wkhtmltopdf

sudo apt-get install imagemagick
```

2.  Clone the repo:

```
git clone https://github.com/anchetaWern/RNChatMedia.git
cd RNChatMedia
```

3.  Install the app dependencies:

```
yarn install
```

4. Re-create `android` and `ios` folders:

```
react-native eject
```

5. Link native dependencies:

```
react-native link @react-native-community/async-storage
react-native link react-native-config
react-native link react-native-document-picker
react-native link react-native-gesture-handler
react-native link react-native-permissions
react-native link react-native-vector-icons
react-native link react-native-video
react-native link react-native-pdf
```

6. Follow [extra step for Android for React Native Config](https://github.com/luggit/react-native-config#extra-step-for-android)

7. Set up React Native Audio Toolkit on [Android](https://github.com/react-native-community/react-native-audio-toolkit/blob/master/docs/SETUP.md#android-setup) or [iOS](https://github.com/react-native-community/react-native-audio-toolkit/blob/master/docs/SETUP.md#ios-setup).

8. Install server depdendencies:

```
cd server
yarn install
```

9. Update your `.env` and `server/.env` with your Chatkit credentials:

```
// .env
CHATKIT_INSTANCE_LOCATOR_ID="YOUR CHATKIT INSTANCE LOCATOR ID"
CHATKIT_SECRET_KEY="YOUR CHATKIT SECRET KEY"
CHATKIT_TOKEN_PROVIDER_ENDPOINT="YOUR TOKEN PROVIDER ENDPOINT (only for chat app)"
```

```
// server/.env
CHATKIT_INSTANCE_LOCATOR_ID="YOUR CHATKIT INSTANCE LOCATOR ID"
CHATKIT_SECRET_KEY="YOUR CHATKIT SECRET KEY"
```

10. Expose the server to the internet (optional if your server is already in the cloud):

```
node index.js
./ngrok http 5000
```

11. Update `src/screens/Login.js`, `src/screens/Rooms.js`, and `src/screens/Chat.js` with the ngrok HTTPS URL or server URL (if it's already in the cloud).


```
const CHAT_SERVER = "YOUR NGROK HTTPS URL";
```

12. Run the app:

```
react-native run-android
react-native run-ios
```

## Built With

-   [React Native](http://facebook.github.io/react-native/)
-   [Chatkit](https://pusher.com/chatkit)
-   [ffmpeg](https://ffmpeg.org/), [Pandoc](https://pandoc.org/), [ImageMagick](https://imagemagick.org/index.php)
