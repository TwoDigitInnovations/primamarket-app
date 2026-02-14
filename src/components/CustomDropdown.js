import { memo } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Text,
  Dimensions,
} from 'react-native';
import { XMarkIcon} from 'react-native-heroicons/outline';

const width = Dimensions.get('screen').width;
const CoustomDropdown = props => {
  console.log(props);
  return (
    <Modal
      transparent={true}
      animationType={'none'}
      visible={props.visible}
      style={{zIndex: 1100}}
      onRequestClose={() => {}}>
      <View style={Styles.modalBackground}>
        {/* <View style={Styles.activityIndicatorWrapper}> */}
          <View
            style={{
              borderColor: '#FFFFFF',
              borderWidth: 2,
              borderRadius: 10,
              padding: 20,
              width: width * 0.8,
              backgroundColor: '#FFFFFF',
            }}>
              {/* <CrossIcon
                color={Constants.black}
                height={15}
                width={15}
                style={{alignSelf:'flex-end'}}
                onPress={props.onClose}
              /> */}
              <View style={{alignItems:'flex-end'}}>
              <XMarkIcon size={20} color="black" onPress={props.onClose} />
              </View>
            {!!props.title && (
              <Text
                style={{
                  textAlign: 'center',
                  fontSize: 20,
                  color: '#022661',
                  marginBottom: 18,
                  fontFamily: 'Helvetica',
                }}>
                {props.title}
              </Text>
            )}
            {props.data !== undefined &&
              props.data.map((item, index) => (
                <Text
                  key={index}
                  style={{
                    color: '#022661',
                    fontSize: 16,
                    lineHeight: 25,
                    fontWeight: '700',
                    borderBottomColor: '#c0c1c2',
                    borderBottomWidth: 1,
                    paddingBottom: 5,
                  }}
                  onPress={() => props.getDropValue(item)}>
                  {item?.name}
                </Text>
              ))}
          </View>
        {/* </View> */}
      </View>
    </Modal>
  );
};

const Styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    // height:'80%',
    // width:'80%',
    alignItems: 'center',
    flexDirection: 'column',
    justifyContent: 'space-around',
    backgroundColor: '#rgba(0, 0, 0, 0.5)',
    zIndex: 9999,
  },
  activityIndicatorWrapper: {
    flex: 1,
    height: 100,
    width: 100,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    marginTop: 210,
    // justifyContent: 'space-around',
  },
});

export default memo(CoustomDropdown);