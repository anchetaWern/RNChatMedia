import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MessageText, MessageImage, Time } from 'react-native-gifted-chat';

const ChatBubble = (props) => {
  const { position, children, currentMessage } = props;
  return (
    <View style={styles[`${position}Container`]}>
      <View style={styles[`${position}Wrapper`]}>
        <MessageText {...props} />
        {
          currentMessage.image &&
          <MessageImage {...props} />
        }
        {children}
        <Time {...props} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  leftContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  leftWrapper: {
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    marginRight: 60,
    minHeight: 20,
    justifyContent: 'flex-end',
  },
  rightContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  rightWrapper: {
    borderRadius: 15,
    backgroundColor: '#0084ff',
    marginLeft: 60,
    minHeight: 20,
    justifyContent: 'flex-end',
  }
});

export default ChatBubble;