import React, { Component } from 'react';
import { ActivityIndicator, View, Button, TouchableOpacity, Dimensions, Alert, StyleSheet } from 'react-native';
import { GiftedChat, Send, Message } from 'react-native-gifted-chat';
import { ChatManager, TokenProvider } from '@pusher/chatkit-client';
import Icon from 'react-native-vector-icons/FontAwesome';
import axios from 'axios';
import Config from 'react-native-config';
import { DocumentPicker, DocumentPickerUtil } from 'react-native-document-picker';
import Modal from 'react-native-modal';
import Pdf from 'react-native-pdf';

const CHATKIT_INSTANCE_LOCATOR_ID = Config.CHATKIT_INSTANCE_LOCATOR_ID;
const CHATKIT_SECRET_KEY = Config.CHATKIT_SECRET_KEY;
const CHATKIT_TOKEN_PROVIDER_ENDPOINT = Config.CHATKIT_TOKEN_PROVIDER_ENDPOINT;

const CHAT_SERVER = 'YOUR NGROK HTTPS URL';

import ChatBubble from '../components/ChatBubble';
import AudioPlayer from '../components/AudioPlayer';
import VideoPlayer from '../components/VideoPlayer';

const image_filetypes = ['image/png', 'image/jpeg', 'image/gif'];

class Chat extends Component {

  state = {
    messages: [],
    is_picking_file: false,
    has_attachment: false,

    is_sending: false,
    is_modal_visible: false,
    video_uri: null,

    is_viewing_pdf: false,
    pdf_source: null,

    uploaded_media_url: null,
    uploaded_media_type: null
  };


  static navigationOptions = ({ navigation }) => {
    const { params } = navigation.state;
    return {
      headerTitle: params.room_name
    };
  };
  //

  constructor(props) {
    super(props);
    const { navigation } = this.props;

    this.user_id = navigation.getParam("user_id");
    this.room_id = navigation.getParam("room_id");
  }


  componentWillUnMount() {
    this.currentUser.disconnect();
  }


  async componentDidMount() {
    try {
      const chatManager = new ChatManager({
        instanceLocator: CHATKIT_INSTANCE_LOCATOR_ID,
        userId: this.user_id,
        tokenProvider: new TokenProvider({ url: CHATKIT_TOKEN_PROVIDER_ENDPOINT })
      });

      let currentUser = await chatManager.connect();
      this.currentUser = currentUser;

      await this.currentUser.subscribeToRoomMultipart({
        roomId: this.room_id,
        hooks: {
          onMessage: this.onReceive
        },
        messageLimit: 10
      });

      await this.setState({
        room_users: this.currentUser.users
      });

    } catch (chat_mgr_err) {
      console.log("error with chat manager: ", chat_mgr_err);
    }
  }


  onReceive = (data) => {
    const { message } = this.getMessage(data);
    this.setState((previousState) => ({
      messages: GiftedChat.append(previousState.messages, message)
    }));

    if (this.state.messages.length > 1) {
      this.setState({
        show_load_earlier: true
      });
    }
  }


  getMessage = ({ id, sender, parts, createdAt }) => {
    const text = parts.find(part => part.partType === 'inline').payload.content;
    const url_part = parts.find(part => part.partType === 'url') ? parts.find(part => part.partType === 'url').payload : null;

    let msg_data = {
      _id: id,
      text: text,
      createdAt: new Date(createdAt),
      user: {
        _id: sender.id,
        name: sender.name,
        avatar: sender.avatarURL
      }
    }

    if (url_part) {
      msg_data.attachment = url_part;
      if (image_filetypes.includes(url_part.type)) {
        msg_data.image = url_part.url;
      }
    }

    return {
      message: msg_data
    };
  }


  render() {
    const { messages, is_modal_visible, video_uri, pdf_source, is_viewing_pdf } = this.state;

    return (
      <View style={styles.container}>
        {
          !is_viewing_pdf &&
          <GiftedChat
            messages={messages}
            onSend={messages => this.onSend(messages)}
            user={{
              _id: this.user_id
            }}
            renderActions={this.renderCustomActions}
            renderSend={this.renderSend}
            renderMessage={this.renderMessage}
          />
        }

        <Modal isVisible={is_modal_visible}>
          <View style={styles.modal}>
            <TouchableOpacity onPress={this.hideModal}>
              <Icon name={"close"} size={20} color={"#FFF"} style={styles.close} />
            </TouchableOpacity>
            {
              video_uri &&
              <VideoPlayer uri={video_uri} />
            }
          </View>
        </Modal>

        {
          is_viewing_pdf && pdf_source &&
          <View style={styles.pdf_container}>
            <View style={styles.pdf_header}>
              <TouchableOpacity onPress={this.hidePdfModal}>
                <Icon name={"close"} size={20} color={"#333"} style={styles.close} />
              </TouchableOpacity>
            </View>
            <Pdf source={{ uri: pdf_source, cache: true }} style={styles.pdf} />
          </View>
        }
      </View>
    );
  }
  //

  hidePdfModal = () => {
    this.setState({
      pdf_source: null,
      is_viewing_pdf: false
    });
  }


  renderSend = props => {
    if (this.state.is_sending) {
      return (
        <ActivityIndicator
          size="small"
          color="#0064e1"
          style={[styles.loader, styles.sendLoader]}
        />
      );
    }

    return <Send {...props} />;
  }
  //

  renderMessage = (msg) => {
    const { attachment } = msg.currentMessage;
    const renderBubble = (attachment) ? this.renderPreview.bind(this, attachment.url, attachment.type) : null;

    let modified_msg = {
      ...msg,
      renderBubble,
      videoProps: {
        paused: true
      }
    };

    return <Message {...modified_msg} />
  }
  //


  renderPreview = (uri, uri_type, bubbleProps) => {
    const text_color = (bubbleProps.position == 'right') ? '#FFF' : '#000';
    const modified_bubbleProps = {
      ...bubbleProps
    };

    if (uri_type === 'application/pdf') {
      return (
        <ChatBubble {...modified_bubbleProps}>
          <Button
            onPress={() => {
              this.viewPdf(uri);
            }}
            title="View PDF"
          />
        </ChatBubble>
      );
      //
    }

    if (uri_type === 'audio/mpeg') {
      return (
        <ChatBubble {...modified_bubbleProps}>
          <AudioPlayer url={uri} position={bubbleProps.position} />
        </ChatBubble>
      );
    }
    //

    if (uri_type === 'video/mp4') {
      return (
        <ChatBubble {...modified_bubbleProps}>
          <Button
            onPress={() => {
              this.viewVideo(uri);
            }}
            title="View Video"
          />
        </ChatBubble>
      );
    }

    return <ChatBubble {...bubbleProps} />

  }
  //

  viewPdf = (uri) => {
    console.log("pdf uri: ", uri);
    this.setState({
      is_viewing_pdf: true,
      pdf_source: uri
    });
  }


  viewVideo = (uri) => {
    this.setState({
      is_modal_visible: true,
      video_uri: uri
    });
  }


  hideModal = () => {
    this.setState({
      is_modal_visible: false,
      video_uri: null
    });
  }


  onSend = async ([message]) => {
    const { uploaded_media_type, uploaded_media_url } = this.state;
    const message_parts = [
      { type: "text/plain", content: message.text },
      { type: uploaded_media_type, url: uploaded_media_url }
    ];

    try {
      await this.currentUser.sendMultipartMessage({
        roomId: this.room_id,
        parts: message_parts
      });

      this.setState({
        uploaded_media_type: null,
        uploaded_media_url: null,
        has_attachment: false
      });
    } catch (send_msg_err) {
      console.log("error sending message: ", send_msg_err);
    }
  }


  renderCustomActions = () => {
    const { is_picking_file, has_attachment } = this.state;
    if (!this.state.is_picking_file) {
      const icon_color = has_attachment ? "#0064e1" : "#808080";

      return (
        <View style={styles.customActionsContainer}>
          <TouchableOpacity onPress={this.openFilePicker}>
            <View style={styles.buttonContainer}>
              <Icon name="paperclip" size={23} color={icon_color} />
            </View>
          </TouchableOpacity>
        </View>
      );
    }
    //

    return (
      <ActivityIndicator size="small" color="#0064e1" style={styles.loader} />
    );
  }

  //

  openFilePicker = async () => {
    await this.setState({
      is_picking_file: true
    });

    DocumentPicker.show({
      filetype: [DocumentPickerUtil.allFiles()],
    }, async (err, file) => {

      if (!err) {
        try {
          const data = new FormData();

          data.append('fileData', {
            uri : file.uri,
            type: file.type,
            name: file.fileName
          });

          const upload_instance = axios.create({
            baseURL: CHAT_SERVER,
            timeout: 20000,
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'multipart/form-data',
            }
          });

          const res = await upload_instance.post('/upload', data);
          this.setState({
            uploaded_media_type: res.data.type,
            uploaded_media_url: res.data.url,
            is_picking_file: false,
            has_attachment: true
          });

        } catch (read_file_err) {
          Alert.alert("Invalid file", "File shouldn't exceed 10mb and it should be a valid video, audio, document, or image file.");
          this.setState({
            is_picking_file: false,
            has_attachment: false
          });
        }
      } else {
        this.setState({
          is_picking_file: false,
          has_attachment: false
        });
      }
    });
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  customActionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  buttonContainer: {
    padding: 10
  },
  modal: {
    flex: 1
  },
  close: {
    alignSelf: 'flex-end',
    marginBottom: 10
  },
  pdf_container: {
    flex: 1
  },
  pdf_header: {
    padding: 5
  },
  pdf: {
    flex:1,
    width: Dimensions.get('window').width
  }
});

export default Chat;