import NetInfo from '@react-native-community/netinfo';

const ConnectionCheck = {
  isConnected: function () {
    return new Promise((resolve, reject) => {
      NetInfo.fetch().then(
        (state) => {
          resolve(state.isConnected);
        },
        (err) => {
          reject(err);
        },
      );
    });
  },
};

export default ConnectionCheck;
