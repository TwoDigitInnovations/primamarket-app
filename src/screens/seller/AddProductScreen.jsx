// Complete React Native CLI Version - AddProductScreen.jsx
// Copy this entire file to: C:\Users\vaibh\Music\mobapp\merkapp\src\screens\seller\AddProductScreen.jsx

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Image,
  Alert, ActivityIndicator, Modal, StyleSheet, Platform, PermissionsAndroid
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Postwithimage, GetApi } from '../../Helper/Service';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ChevronLeftIcon } from 'react-native-heroicons/outline';

const API_BASE_URL = 'https://api.merkapp.net/api';
const SIZE_LIST = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL', 'For adult'];
const PRESET_COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
  '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB', '#A52A2A',
  '#808080', '#008000', '#000080', '#800000', '#808000', '#008080',
  '#FFD700', '#C0C0C0', '#FF6347', '#4169E1', '#32CD32', '#FF1493'
];

// Helper functions for color conversion
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

const rgbToHex = (r, g, b) => {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
};

export default function AddProductScreen({ navigation, route }) {
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const productId = route?.params?.productId || null;
  
  const [productData, setProductData] = useState({
    name: '', category: '', sku: '', model: '', origin: '', expirydate: '',
    manufacturername: '', manufactureradd: '', short_description: '',
    long_description: '', price: '', Offerprice: '', hasVariants: false, images: [], pendingImages: []
  });

  const [categories, setCategories] = useState([]);
  const [variants, setVariants] = useState([{
    color: '#000000', image: [], pendingImages: [], selected: [], price: '', Offerprice: ''
  }]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [currentVariantIndex, setCurrentVariantIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [rgbValues, setRgbValues] = useState({ r: 0, g: 0, b: 0 });
  const [imageUrl, setImageUrl] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const updateColorFromRgb = (r, g, b) => {
    const hex = rgbToHex(Math.round(r), Math.round(g), Math.round(b));
    setSelectedColor(hex);
    setRgbValues({ r, g, b });
  };

  const updateColorFromHex = (hex) => {
    if (/^#[0-9A-F]{6}$/i.test(hex)) {
      const rgb = hexToRgb(hex);
      setRgbValues(rgb);
      setSelectedColor(hex.toUpperCase());
    }
  };

  useEffect(() => {
    loadUserData();
    fetchCategories();
    if (productId) fetchProductById();
  }, []);

  const loadUserData = async () => {
    try {
      const user = await AsyncStorage.getItem('userInfo');
      console.log('Loading user data...');
      if (user) {
        const userData = JSON.parse(user);
        console.log('User data loaded:', userData);
        setUserId(userData._id);
        console.log('User ID set:', userData._id);
      } else {
        console.error('No user data found in AsyncStorage');
        Alert.alert('Error', 'Please login again to continue');
      }
    } catch (error) {
      console.error('Error loading user:', error);
      Alert.alert('Error', 'Failed to load user data. Please login again.');
    }
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await GetApi('getCategory');
      if (response?.status) setCategories(response.data);
    } catch (error) {
      console.error('Fetch categories error:', error);
      Alert.alert('Error', 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  const fetchProductById = async () => {
    try {
      setLoading(true);
      const response = await GetApi(`getProductById/${productId}`);
      if (response?.status) {
        const product = response.data;
        const hasVariants = product.varients?.length > 0;
        setProductData({
          ...productData,
          name: product.name || '',
          category: product.category?._id || '',
          sku: product.sku || '',
          model: product.model || '',
          origin: product.origin || '',
          expirydate: product.expirydate || '',
          manufacturername: product.manufacturername || '',
          manufactureradd: product.manufactureradd || '',
          short_description: product.short_description || '',
          long_description: product.long_description || '',
          hasVariants,
          price: hasVariants ? '' : (product.price_slot?.[0]?.price || ''),
          Offerprice: hasVariants ? '' : (product.price_slot?.[0]?.Offerprice || ''),
          images: product.images || []
        });
        if (hasVariants) setVariants(product.varients);
      }
    } catch (error) {
      console.error('Fetch product error:', error);
      Alert.alert('Error', 'Failed to fetch product');
    } finally {
      setLoading(false);
    }
  };

  const requestStoragePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const apiLevel = Platform.Version;
        
        // Android 13+ (API 33+) doesn't need READ_EXTERNAL_STORAGE for image picker
        if (apiLevel >= 33) {
          return true;
        }
        
        // For Android 12 and below
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'App needs access to your photos to upload images',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error('Permission error:', err);
        return false;
      }
    }
    return true;
  };

  const pickImage = async (variantIndex = null) => {
    try {
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required', 
          'Please grant storage permission from app settings to upload images',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
              Alert.alert('Info', 'Please enable storage permission from Settings > Apps > MerkApp > Permissions');
            }}
          ]
        );
        return;
      }

      launchImageLibrary({ 
        mediaType: 'photo', 
        quality: 0.8, 
        selectionLimit: 0,
        includeBase64: false,
      }, async (response) => {
        if (response.didCancel) {
          console.log('User cancelled image picker');
        } else if (response.errorCode) {
          console.error('ImagePicker Error:', response.errorCode, response.errorMessage);
          Alert.alert('Error', `Failed to pick image: ${response.errorMessage || 'Unknown error'}`);
        } else if (response.assets && response.assets.length > 0) {
          // Store images locally first (for preview)
          const imageFiles = response.assets.map(asset => ({
            uri: asset.uri,
            type: asset.type || 'image/jpeg',
            name: asset.fileName || `image_${Date.now()}.jpg`,
          }));
          
          if (variantIndex !== null) {
            // Add to variant pending images
            const newVariants = [...variants];
            if (!newVariants[variantIndex].pendingImages) {
              newVariants[variantIndex].pendingImages = [];
            }
            newVariants[variantIndex].pendingImages = [
              ...newVariants[variantIndex].pendingImages, 
              ...imageFiles
            ];
            setVariants(newVariants);
            Alert.alert('Success', `${imageFiles.length} image(s) selected. They will be uploaded when you create the product.`);
          } else {
            // Add to product pending images
            setProductData(prev => ({ 
              ...prev, 
              pendingImages: [...(prev.pendingImages || []), ...imageFiles] 
            }));
            Alert.alert('Success', `${imageFiles.length} image(s) selected. They will be uploaded when you create the product.`);
          }
        }
      });
    } catch (error) {
      console.error('Pick image error:', error);
      Alert.alert('Error', 'Failed to open image picker');
    }
  };

const uploadImagesToServer = async (images) => {
  try {
    console.log('Starting upload for', images.length, 'images');
    
    const formData = new FormData();
    
    images.forEach((asset, index) => {
      console.log(`Processing image ${index + 1}:`, {
        uri: asset.uri,
        type: asset.type,
        name: asset.fileName,
        size: asset.fileSize
      });
      
      // Create the file object for FormData - backend expects 'images' field
      const file = {
        uri: asset.uri,
        type: asset.type || 'image/jpeg',
        name: asset.fileName || `image_${Date.now()}_${index}.jpg`,
      };
      
      // Backend controller expects req.files, so we append with field name 'images'
      formData.append('images', file);
    });

    console.log('Uploading images using Postwithimage...');
    
    // Use Postwithimage helper function
    const response = await Postwithimage('uploadImages', formData);

    console.log('Upload response:', response);
    
    // Check for error in response
    if (response?.error) {
      console.error('Server returned error:', response.error);
      throw new Error(response.error);
    }
    
    // Handle success response - backend returns { message, images }
    if (response?.data?.images) {
      console.log('Images uploaded successfully:', response.data.images);
      return response.data.images;
    } else if (response?.images) {
      console.log('Images uploaded successfully:', response.images);
      return response.images;
    } else if (Array.isArray(response?.data)) {
      return response.data;
    } else if (Array.isArray(response)) {
      return response;
    }
    
    console.error('Unexpected response format:', response);
    throw new Error('Server did not return image URLs');
    
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};



  const handleSubmit = async () => {
    // Validation
    if (!productData.name || !productData.category) {
      Alert.alert('Error', 'Please fill required fields: Product Name and Category');
      return;
    }

    if (!productData.hasVariants) {
      if (!productData.price) {
        Alert.alert('Error', 'Please enter product price');
        return;
      }
      const totalImages = (productData.images?.length || 0) + (productData.pendingImages?.length || 0);
      if (totalImages === 0) {
        Alert.alert('Error', 'Please add at least one product image');
        return;
      }
    } else {
      // Validate variants
      for (let i = 0; i < variants.length; i++) {
        const variant = variants[i];
        if (!variant.color) {
          Alert.alert('Error', `Please select color for Variant #${i + 1}`);
          return;
        }
        if (!variant.price) {
          Alert.alert('Error', `Please enter price for Variant #${i + 1}`);
          return;
        }
        if (variant.selected.length === 0) {
          Alert.alert('Error', `Please add at least one size for Variant #${i + 1}`);
          return;
        }
        const totalImages = (variant.image?.length || 0) + (variant.pendingImages?.length || 0);
        if (totalImages === 0) {
          Alert.alert('Error', `Please add at least one image for Variant #${i + 1}`);
          return;
        }
      }
    }

    try {
      setLoading(true);
      console.log('Submitting product...');
      
      if (!userId) {
        Alert.alert('Error', 'User not logged in. Please login again.');
        setLoading(false);
        return;
      }
      
      console.log('User ID:', userId);
      
      // Upload pending images first
      let uploadedProductImages = [];
      if (productData.pendingImages && productData.pendingImages.length > 0) {
        console.log('Uploading', productData.pendingImages.length, 'product images...');
        try {
          uploadedProductImages = await uploadImagesToServer(productData.pendingImages);
          console.log('Product images uploaded:', uploadedProductImages);
        } catch (error) {
          console.error('Failed to upload product images:', error);
          Alert.alert('Error', 'Failed to upload product images. Please try again.');
          setLoading(false);
          return;
        }
      }
      
      // Upload variant images
      const updatedVariants = [...variants];
      for (let i = 0; i < updatedVariants.length; i++) {
        if (updatedVariants[i].pendingImages && updatedVariants[i].pendingImages.length > 0) {
          console.log(`Uploading ${updatedVariants[i].pendingImages.length} images for variant ${i + 1}...`);
          try {
            const uploadedUrls = await uploadImagesToServer(updatedVariants[i].pendingImages);
            updatedVariants[i].image = [...updatedVariants[i].image, ...uploadedUrls];
            console.log(`Variant ${i + 1} images uploaded:`, uploadedUrls);
          } catch (error) {
            console.error(`Failed to upload variant ${i + 1} images:`, error);
            Alert.alert('Error', `Failed to upload images for Variant #${i + 1}. Please try again.`);
            setLoading(false);
            return;
          }
        }
      }
      
      // Combine URL images with uploaded images
      const allProductImages = [...productData.images, ...uploadedProductImages];
      
      const formData = new FormData();
      Object.keys(productData).forEach(key => {
        if (key !== 'images' && key !== 'hasVariants' && key !== 'pendingImages') {
          const value = productData[key];
          console.log(`Adding ${key}:`, value);
          formData.append(key, value || '');
        }
      });
      formData.append('userid', userId);
      formData.append('hasVariants', productData.hasVariants);
      
      if (productData.hasVariants) {
        formData.append('price_slot', JSON.stringify([]));
        // Remove pendingImages from variants before sending
        const variantsToSend = updatedVariants.map(v => {
          const { pendingImages, ...rest } = v;
          return rest;
        });
        formData.append('varients', JSON.stringify(variantsToSend));
        console.log('Variants:', JSON.stringify(variantsToSend, null, 2));
      } else {
        formData.append('price_slot', JSON.stringify([{
          value: 1,
          price: parseFloat(productData.price) || 0,
          Offerprice: parseFloat(productData.Offerprice) || 0
        }]));
        formData.append('varients', JSON.stringify([]));
        formData.append('imageUrls', JSON.stringify(allProductImages));
        console.log('Images:', allProductImages);
      }
      
      if (productId) formData.append('id', productId);
      
      const endpoint = productId ? 'updateProduct' : 'createProduct';
      console.log('Calling endpoint:', endpoint);
      
      const response = await Postwithimage(endpoint, formData);
      
      console.log('Response:', response);
      
      if (response?.status) {
        const message = productId 
          ? 'Product updated successfully' 
          : 'Product submitted for admin approval';
        Alert.alert('Success', message, [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Error', response?.message || 'Failed to save product');
      }
    } catch (error) {
      console.error('Submit error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error headers:', error.response?.headers);
      console.error('Request data:', {
        name: productData.name,
        category: productData.category,
        hasVariants: productData.hasVariants,
        userId: userId,
        variantsCount: variants.length,
        imagesCount: productData.images.length
      });
      
      let errorMessage = 'Failed to save product';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please check all required fields and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E59013" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      {/* <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{productId ? 'Edit Product' : 'Add Product'}</Text>
        <View style={styles.headerRight} />
      </View> */}<View className="bg-[#0B051D] px-4 py-5">
                    <View className="flex-row items-center">
                      <TouchableOpacity 
                        onPress={() => navigation.goBack()}
                        className="mr-4"
                      >
                        <ChevronLeftIcon size={24} color="white" />
                      </TouchableOpacity>
                      <Text style={styles.headerTitle}>{productId ? 'Edit Product' : 'Add Product'}</Text>
                    </View>
                  </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Product Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter product name"
            value={productData.name}
            onChangeText={(text) => setProductData({ ...productData, name: text })}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={productData.category}
              onValueChange={(value) => setProductData({ ...productData, category: value })}
            >
              <Picker.Item label="Select Category" value="" />
              {categories.map((cat) => (
                <Picker.Item key={cat._id} label={cat.name} value={cat._id} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>SKU (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Auto-generated if empty"
            value={productData.sku}
            onChangeText={(text) => setProductData({ ...productData, sku: text })}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Model</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter model"
            value={productData.model}
            onChangeText={(text) => setProductData({ ...productData, model: text })}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Country of Origin *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter country"
            value={productData.origin}
            onChangeText={(text) => setProductData({ ...productData, origin: text })}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Expiry Date *</Text>
          <TouchableOpacity 
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.datePickerText}>
              {productData.expirydate || 'Select expiry date'}
            </Text>
            <Text style={styles.calendarIcon}>📅</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={productData.expirydate ? new Date(productData.expirydate) : selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (date) {
                  const formattedDate = date.toISOString().split('T')[0];
                  setProductData({ ...productData, expirydate: formattedDate });
                  setSelectedDate(date);
                }
              }}
              minimumDate={new Date()}
            />
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Manufacturer Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter manufacturer name"
            value={productData.manufacturername}
            onChangeText={(text) => setProductData({ ...productData, manufacturername: text })}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Manufacturer Address *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter address"
            value={productData.manufactureradd}
            onChangeText={(text) => setProductData({ ...productData, manufactureradd: text })}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Short Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter short description"
            value={productData.short_description}
            onChangeText={(text) => setProductData({ ...productData, short_description: text })}
            multiline
            numberOfLines={2}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Long Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter detailed description"
            value={productData.long_description}
            onChangeText={(text) => setProductData({ ...productData, long_description: text })}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Product Type */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Product Type</Text>
          <TouchableOpacity
            style={[styles.radioOption, !productData.hasVariants && styles.radioOptionSelected]}
            onPress={() => setProductData({ ...productData, hasVariants: false })}
          >
            <View style={[styles.radio, !productData.hasVariants && styles.radioSelected]} />
            <Text style={styles.radioText}>Normal Product (Single Price)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioOption, productData.hasVariants && styles.radioOptionSelected]}
            onPress={() => setProductData({ ...productData, hasVariants: true })}
          >
            <View style={[styles.radio, productData.hasVariants && styles.radioSelected]} />
            <Text style={styles.radioText}>Product with Variants</Text>
          </TouchableOpacity>
        </View>

        {/* Normal Product */}
        {!productData.hasVariants && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Product Pricing</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Regular Price ($) *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={productData.price}
                onChangeText={(text) => setProductData({ ...productData, price: text })}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Offer Price ($)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={productData.Offerprice}
                onChangeText={(text) => setProductData({ ...productData, Offerprice: text })}
                keyboardType="decimal-pad"
              />
            </View>

            <Text style={styles.cardTitle}>Product Images</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.flex1]}
                placeholder="Enter image URL"
                value={imageUrl}
                onChangeText={setImageUrl}
              />
              <TouchableOpacity style={styles.btnSmall} onPress={() => {
                if (imageUrl) {
                  setProductData(prev => ({ ...prev, images: [...prev.images, imageUrl] }));
                  setImageUrl('');
                }
              }}>
                <Text style={styles.btnText}>Add</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.btnSecondary} onPress={() => pickImage(null)}>
              <Text style={styles.btnText}>Upload from Gallery</Text>
            </TouchableOpacity>
            <View style={styles.imageGrid}>
              {/* URL Images */}
              {productData.images.map((img, idx) => (
                <View key={`url-${idx}`} style={styles.imageWrapper}>
                  <Image source={{ uri: img }} style={styles.imageThumb} />
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => {
                      const newImages = [...productData.images];
                      newImages.splice(idx, 1);
                      setProductData({ ...productData, images: newImages });
                    }}
                  >
                    <Text style={styles.removeBtnText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {/* Pending Images (from gallery) */}
              {productData.pendingImages && productData.pendingImages.map((file, idx) => (
                <View key={`pending-${idx}`} style={styles.imageWrapper}>
                  <Image source={{ uri: file.uri }} style={styles.imageThumb} />
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>📤</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => {
                      const newFiles = [...productData.pendingImages];
                      newFiles.splice(idx, 1);
                      setProductData({ ...productData, pendingImages: newFiles });
                    }}
                  >
                    <Text style={styles.removeBtnText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Variants */}
        {productData.hasVariants && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Product Variants</Text>
            {variants.map((variant, vIdx) => (
              <View key={vIdx} style={styles.variantCard}>
                <View style={styles.variantHeader}>
                  <Text style={styles.variantTitle}>Variant #{vIdx + 1}</Text>
                  {variants.length > 1 && (
                    <TouchableOpacity
                      style={styles.btnDanger}
                      onPress={() => {
                        if (variants.length > 1) {
                          setVariants(variants.filter((_, i) => i !== vIdx));
                        }
                      }}
                    >
                      <Text style={styles.btnText}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Color *</Text>
                  <View style={styles.row}>
                    <TextInput
                      style={[styles.input, styles.flex1]}
                      placeholder="#000000"
                      value={variant.color}
                      onChangeText={(text) => {
                        const newVariants = [...variants];
                        newVariants[vIdx].color = text;
                        setVariants(newVariants);
                      }}
                    />
                    <TouchableOpacity
                      style={[styles.colorBox, { backgroundColor: variant.color }]}
                      onPress={() => {
                        setCurrentVariantIndex(vIdx);
                        const rgb = hexToRgb(variant.color);
                        setRgbValues(rgb);
                        setSelectedColor(variant.color);
                        setShowColorPicker(true);
                      }}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Regular Price ($) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    value={variant.price}
                    onChangeText={(text) => {
                      const newVariants = [...variants];
                      newVariants[vIdx].price = text;
                      setVariants(newVariants);
                    }}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Offer Price ($)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    value={variant.Offerprice}
                    onChangeText={(text) => {
                      const newVariants = [...variants];
                      newVariants[vIdx].Offerprice = text;
                      setVariants(newVariants);
                    }}
                    keyboardType="decimal-pad"
                  />
                </View>

                <Text style={styles.label}>Sizes</Text>
                {variant.selected.map((size, sIdx) => (
                  <View key={sIdx} style={styles.sizeRow}>
                    <View style={[styles.pickerContainer, styles.flex1]}>
                      <Picker
                        selectedValue={size.value}
                        onValueChange={(value) => {
                          const newVariants = [...variants];
                          newVariants[vIdx].selected[sIdx].value = value;
                          setVariants(newVariants);
                        }}
                      >
                        <Picker.Item label="Select Size" value="" />
                        {SIZE_LIST.map((s) => (
                          <Picker.Item key={s} label={s} value={s} />
                        ))}
                      </Picker>
                    </View>
                    <TextInput
                      style={[styles.input, styles.qtyInput]}
                      placeholder="Qty"
                      value={size.total?.toString()}
                      onChangeText={(text) => {
                        const newVariants = [...variants];
                        newVariants[vIdx].selected[sIdx].total = text;
                        setVariants(newVariants);
                      }}
                      keyboardType="number-pad"
                    />
                    <TouchableOpacity
                      style={styles.btnDanger}
                      onPress={() => {
                        const newVariants = [...variants];
                        newVariants[vIdx].selected.splice(sIdx, 1);
                        setVariants(newVariants);
                      }}
                    >
                      <Text style={styles.btnText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.btnSuccess}
                  onPress={() => {
                    const newVariants = [...variants];
                    newVariants[vIdx].selected.push({ value: '', total: 0 });
                    setVariants(newVariants);
                  }}
                >
                  <Text style={styles.btnText}>Add Size</Text>
                </TouchableOpacity>

                <Text style={styles.label}>Variant Images</Text>
                <View style={styles.row}>
                  <TextInput
                    style={[styles.input, styles.flex1]}
                    placeholder="Enter image URL"
                    value={imageUrl}
                    onChangeText={setImageUrl}
                  />
                  <TouchableOpacity
                    style={styles.btnSmall}
                    onPress={() => {
                      if (imageUrl) {
                        const newVariants = [...variants];
                        newVariants[vIdx].image.push(imageUrl);
                        setVariants(newVariants);
                        setImageUrl('');
                      }
                    }}
                  >
                    <Text style={styles.btnText}>Add</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.btnSecondary} onPress={() => pickImage(vIdx)}>
                  <Text style={styles.btnText}>Upload from Gallery</Text>
                </TouchableOpacity>
                <View style={styles.imageGrid}>
                  {/* URL Images */}
                  {variant.image.map((img, imgIdx) => (
                    <View key={`url-${imgIdx}`} style={styles.imageWrapper}>
                      <Image source={{ uri: img }} style={styles.imageThumb} />
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => {
                          const newVariants = [...variants];
                          newVariants[vIdx].image.splice(imgIdx, 1);
                          setVariants(newVariants);
                        }}
                      >
                        <Text style={styles.removeBtnText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  {/* Pending Images */}
                  {variant.pendingImages && variant.pendingImages.map((file, imgIdx) => (
                    <View key={`pending-${imgIdx}`} style={styles.imageWrapper}>
                      <Image source={{ uri: file.uri }} style={styles.imageThumb} />
                      <View style={styles.pendingBadge}>
                        <Text style={styles.pendingText}>📤</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => {
                          const newVariants = [...variants];
                          newVariants[vIdx].pendingImages.splice(imgIdx, 1);
                          setVariants(newVariants);
                        }}
                      >
                        <Text style={styles.removeBtnText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => setVariants([...variants, {
                color: '#000000', image: [], pendingImages: [], selected: [], price: '', Offerprice: ''
              }])}
            >
              <Text style={styles.btnText}>Add More Variant</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.btnSubmit} onPress={handleSubmit}>
          <Text style={styles.btnSubmitText}>
            {productId ? 'Update Product' : 'Create Product'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Color Picker Modal */}
      <Modal visible={showColorPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScrollView}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Color</Text>
              
              {/* Color Preview */}
              <View style={styles.selectedColorPreview}>
                <View style={[styles.colorPreviewBox, { backgroundColor: selectedColor }]} />
                <Text style={styles.colorText}>{selectedColor}</Text>
              </View>

              {/* Preset Colors */}
              <Text style={styles.sectionLabel}>Quick Colors:</Text>
              <View style={styles.colorGrid}>
                {PRESET_COLORS.map((color, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      selectedColor === color && styles.colorOptionSelected
                    ]}
                    onPress={() => {
                      const rgb = hexToRgb(color);
                      setRgbValues(rgb);
                      setSelectedColor(color);
                    }}
                  >
                    {selectedColor === color && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Hex Input */}
              <Text style={styles.sectionLabel}>Or Enter Hex Code:</Text>
              <TextInput
                style={styles.input}
                placeholder="#000000"
                value={selectedColor}
                onChangeText={(text) => {
                  setSelectedColor(text.toUpperCase());
                  updateColorFromHex(text);
                }}
                maxLength={7}
                autoCapitalize="characters"
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnCancel]}
                  onPress={() => setShowColorPicker(false)}
                >
                  <Text style={styles.btnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnConfirm]}
                  onPress={() => {
                    const newVariants = [...variants];
                    newVariants[currentVariantIndex].color = selectedColor;
                    setVariants(newVariants);
                    setShowColorPicker(false);
                  }}
                >
                  <Text style={styles.btnText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    backgroundColor: '#1F2937', 
    paddingHorizontal: 16, 
    paddingVertical: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backButton: { 
    padding: 8,
    marginLeft: -8,
  },
  backIcon: { 
    fontSize: 32, 
    color: '#fff',
    fontWeight: 'bold',
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerRight: { 
    width: 40,
  },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 100 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginBottom: 16 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#1f2937' },
  textArea: { height: 80, textAlignVertical: 'top' },
  datePickerButton: { 
    backgroundColor: '#fff', 
    borderWidth: 1, 
    borderColor: '#d1d5db', 
    borderRadius: 8, 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  datePickerText: { fontSize: 14, color: '#1f2937' },
  calendarIcon: { fontSize: 20 },
  pickerContainer: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 12 },
  radioOption: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 8, marginBottom: 8 },
  radioOptionSelected: { backgroundColor: '#fef3c7' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#9ca3af', marginRight: 8 },
  radioSelected: { borderColor: '#E58F14', backgroundColor: '#E58F14' },
  radioText: { fontSize: 14, color: '#1f2937' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  flex1: { flex: 1 },
  btnSmall: { backgroundColor: '#E58F14', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8 },
  btnSecondary: { backgroundColor: '#E58F14', paddingVertical: 12, borderRadius: 8, marginBottom: 8 },
  btnPrimary: { backgroundColor: '#E58F14', paddingVertical: 12, borderRadius: 8, marginTop: 8 },
  btnSuccess: { backgroundColor: '#E58F14', paddingVertical: 12, borderRadius: 8, marginTop: 8 },
  btnDanger: { backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  btnText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
  btnSubmit: { backgroundColor: '#E58F14', paddingVertical: 16, borderRadius: 8, marginTop: 24, marginBottom: 32 },
  btnSubmitText: { color: '#fff', textAlign: 'center', fontSize: 18, fontWeight: 'bold' },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  imageWrapper: { position: 'relative' },
  imageThumb: { width: 80, height: 80, borderRadius: 8 },
  pendingBadge: { position: 'absolute', bottom: 4, left: 4, backgroundColor: 'rgba(229, 143, 20, 0.9)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  pendingText: { fontSize: 12 },
  removeBtn: { position: 'absolute', top: -8, right: -8, backgroundColor: '#ef4444', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  removeBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  variantCard: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, marginBottom: 12 },
  variantHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  variantTitle: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  colorBox: { width: 48, height: 48, borderRadius: 8, borderWidth: 2, borderColor: '#9ca3af' },
  sizeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  qtyInput: { width: 80 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 24, width: '90%', maxWidth: 400 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginBottom: 16, textAlign: 'center' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, gap: 8 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 8 },
  modalBtnCancel: { backgroundColor: '#6b7280' },
  modalBtnConfirm: { backgroundColor: '#E58F14' },
  modalScrollView: { maxHeight: '90%' },
  selectedColorPreview: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16, gap: 12 },
  colorPreviewBox: { width: 80, height: 80, borderRadius: 12, borderWidth: 3, borderColor: '#d1d5db' },
  colorText: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 12, marginBottom: 8 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  colorOption: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#d1d5db', justifyContent: 'center', alignItems: 'center' },
  colorOptionSelected: { borderColor: '#E58F14', borderWidth: 3 },
  checkmark: { color: '#fff', fontSize: 20, fontWeight: 'bold', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  sliderGroup: { marginBottom: 16 },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  sliderLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  sliderValue: { fontSize: 14, fontWeight: 'bold', color: '#1f2937' },
  slider: { width: '100%', height: 40 },
  helperText: { fontSize: 12, color: '#6b7280', marginTop: 4, fontStyle: 'italic' },
});
