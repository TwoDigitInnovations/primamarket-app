
import axios from 'axios';
import { API_BASE_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ConnectionCheck from './ConnectionCheck';
// import RNFetchBlob from 'rn-fetch-blob';
import { Platform } from 'react-native';
import { navigate, reset, navigationRef } from '../../navigationRef';
// import RNFetchBlob from 'rn-fetch-blob';

const GetApi = async (url, props, retryCount = 0) => {
  const requestId = Math.random().toString(36).substr(2, 9);
  // console.log(`[${new Date().toISOString()}] GetApi called for:`, url, `(Attempt ${retryCount + 1})`);
  
  try {
    // Check internet connection
    const connected = await ConnectionCheck.isConnected();
    // console.log('Internet connection status:', connected ? 'Connected' : 'Disconnected');
    // console.log('API Base URL:', API_BASE_URL);
    
    if (!connected) {
      throw new Error('No internet connection');
    }

    console.log('Making request to:', API_BASE_URL + url);
    
    // Get token with error handling
    let token;
    try {
      console.log('Retrieving token from AsyncStorage...');
      token = await AsyncStorage.getItem('userToken');
      // console.log('Token retrieved from storage:', token ? `Found (${token.length} chars)` : 'Not found');
      
      if (!token) {
        if (retryCount < 1) {
          console.log('No token found, waiting 500ms and retrying...');
          await new Promise(resolve => setTimeout(resolve, 500));
          return GetApi(url, props, retryCount + 1);
        }
        throw new Error('No authentication token found in storage');
      }
    } catch (storageError) {
      console.error('Error retrieving token from storage:', storageError);
      throw new Error('Error accessing authentication token');
    }

    // Make the API request
    let timeout;
    try {
      const requestUrl = API_BASE_URL + url;
      // console.log(`[${requestId}] Sending GET request to: ${requestUrl}`);
      
      
      const source = axios.CancelToken.source();
      
     
      const timeoutDuration = 120000; // 60 seconds
      
   
      timeout = setTimeout(() => {
        source.cancel(`Request timed out after ${timeoutDuration}ms`);
      }, timeoutDuration);

      // console.log(`[${requestId}] Setting request timeout to ${timeoutDuration}ms`);
      
      const response = await axios.get(requestUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Request-ID': requestId,
        },
        timeout: 60000, // Increased timeout for slow API responses
        cancelToken: source.token,
        validateStatus: function (status) {
          return status >= 200 && status < 500; // Back to original - let axios handle errors
        }
      });
      
      clearTimeout(timeout);
      // console.log(`[${requestId}] Response received - Status: ${response.status} ${response.statusText}`);
      // console.log(`[${requestId}] Response headers:`, JSON.stringify(response.headers, null, 2));
      
      // Check if response.data exists
      if (!response.data) {
        console.warn('No data in response:', response);
        return { success: false, message: 'No data received from server' };
      }
      
      if (response.data) {
        // console.log(`[${requestId}] Response data type:`, typeof response.data);
        // console.log(`[${requestId}] Response data length:`, 
        //   typeof response.data === 'string' ? response.data.length : 'N/A');
        return response.data;
      } else {
        console.warn(`[${requestId}] No data in response`);
        return { success: false, message: 'No data in response' };
      }
      
    } catch (error) {
      // Clear timeout if it was set
      if (timeout) clearTimeout(timeout);
      
      // Log more detailed error information
      console.error(`[${requestId}] Request error details:`, {
        message: error.message,
        code: error.code,
        isAxiosError: error.isAxiosError,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          timeout: error.config?.timeout,
          headers: error.config?.headers
        },
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : 'No response',
        stack: error.stack
      });
      
      // For timeout errors, provide more context
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout') || error.code === 'ERR_CANCELED') {
        console.warn(`[${requestId}] Request timeout detected. Consider optimizing your API or increasing timeout further.`);
        throw new Error('Request timed out. Please check your internet connection and try again.');
      }
      
      console.error(`[${requestId}] Request error:`, {
        message: error.message,
        code: error.code,
        isAxiosError: error.isAxiosError,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          timeout: error.config?.timeout,
          headers: error.config?.headers
        }
      });

      if (axios.isCancel(error)) {
        throw new Error(`Request was cancelled: ${error.message}`);
      }
      
      if (error.response) {
        // The request was made and the server responded with a status code
        console.error('API Error Response:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers,
        });
        
        if (error.response.status === 401) {
          // Clear all auth related data
          await Promise.all([
            AsyncStorage.removeItem('userToken'),
            AsyncStorage.removeItem('userInfo'),
            AsyncStorage.removeItem('userDetail')
          ]);
          
          // Only navigate if we're not already on an auth screen
          const currentRoute = navigationRef.current?.getCurrentRoute();
          const authRoutes = ['Login', 'Signup', 'ForgotPassword'];
          
          if (currentRoute && !authRoutes.includes(currentRoute.name)) {
            reset('Auth');
          }
          
          throw new Error('Session expired. Please login again.');
        }
        
        // Handle 500 errors specifically
        if (error.response.status === '') {
          console.error(`[${requestId}] Server error (500):`, error.response.data);
          
          // Check if it's the null reference error from backend
          const errorMessage = error.response.data?.message || error.message || '';
          if (errorMessage.includes('Cannot read properties of null') || 
              errorMessage.includes('reading \'_id\'') ||
              errorMessage.includes('null')) {
            // throw new Error('Product not found or has been removed');
          }
          
          // throw new Error('Server error occurred. Please try again later.');
        }
        
        throw new Error(error.response.data?.message || 'Request failed');
        
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
        
        // Check if it's a network error specifically
        if (error.code === 'ERR_NETWORK') {
          // For ERR_NETWORK with status 200, this is a React Native parsing issue
          if (error.request && error.request.status === 200) {
            console.log(`[${requestId}] Status 200 with ERR_NETWORK - React Native parsing issue detected`);
            
            // Log all available properties for debugging
            console.log(`[${requestId}] Available request properties:`, Object.keys(error.request));
            
            try {
              // Try multiple ways to get response in React Native
              let responseData = null;
              
              // Method 1: Direct response text
              if (error.request.responseText) {
                responseData = JSON.parse(error.request.responseText);
              }
              // Method 2: _response property (React Native specific)
              else if (error.request._response) {
                responseData = JSON.parse(error.request._response);
              }
              // Method 3: response property
              else if (error.request.response) {
                responseData = typeof error.request.response === 'string' 
                  ? JSON.parse(error.request.response) 
                  : error.request.response;
              }
              
              if (responseData) {
                console.log(`[${requestId}] Successfully extracted data from status 200 response:`, responseData);
                return responseData;
              }
              
              // If we can't parse but status is 200, return empty success
              console.warn(`[${requestId}] Status 200 but no parseable data, returning empty array`);
              return [];
              
            } catch (parseError) {
              console.error(`[${requestId}] Parse error for status 200 response:`, parseError);
              // Status 200 means success, so return empty array instead of throwing
              return [];
            }
          }
          
          // For non-200 status network errors, retry
          if (retryCount < 2) {
            console.log(`[${requestId}] Network error, retrying... (${retryCount + 1}/3)`);
            await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
            return GetApi(url, props, retryCount + 1);
          }
          
          throw new Error('Cannot connect to server after 3 attempts. Please check if the API server is running and accessible.');
        }
        
        throw new Error('No response from server. Please check your connection.');
        
      } else {
        // Something happened in setting up the request
        console.error('Request setup error:', error.message);
        throw new Error('Error setting up request');
      }
    }
    
  } catch (error) {
    console.error('GetApi Error:', error.message);
    throw error; // Re-throw to be caught by the caller
  }
};

const Post = async (url, data, props) => {
  return new Promise(function (resolve, reject) {
    ConnectionCheck.isConnected().then(
      async connected => {
        console.log(connected);
        if (connected) {
          const token = await AsyncStorage.getItem('userToken');
          console.log('url===>', API_BASE_URL + url);
          console.log('token===>', token ? `Bearer ${token}` : 'No token');
          console.log('data=====>', data);
          
          // Skip token check for auth-related endpoints
          const authEndpoints = ['auth/sendOTP', 'auth/verifyOTP', 'auth/changePassword', 'auth/login', 'auth/register'];
          const requiresAuth = !authEndpoints.some(endpoint => url.includes(endpoint));
          
          if (requiresAuth && !token) {
            return reject('No authentication token found');
          }
          
          const config = {
            headers: {}
          };
          
          if (token) {
            config.headers.Authorization = `Bearer ${token}`; 
          }
          
          console.log('Making POST request to:', API_BASE_URL + url);
          axios
            .post(API_BASE_URL + url, data, config)
            .then(res => {
              console.log('API Response:', res);
              console.log('Response Data:', res.data);
              resolve(res.data);
            })
            .catch(async err => {
              if (err.response) {
                console.log(err.response.status);
                if (err?.response?.status === 401) {
                  // Clear all auth related data
                  await Promise.all([
                    AsyncStorage.removeItem('userToken'),
                    AsyncStorage.removeItem('userInfo'),
                    AsyncStorage.removeItem('userDetail')
                  ]);
                  
                  // Only navigate if we're not already on an auth screen
                  const currentRoute = navigationRef.current?.getCurrentRoute();
                  const authRoutes = ['Login', 'Signup', 'ForgotPassword'];
                  
                  if (currentRoute && !authRoutes.includes(currentRoute.name)) {
                    reset('Auth');
                  }
                  
                  return reject('Session expired. Please login again.');
                }
                resolve(err.response.data);
              } else {
                reject(err);
              }
            });
        } else {
          reject('No internet connection');
        }
      },
      err => {
        reject(err);
      },
    );
  });
};

const Postwithimage = async (url, data, props = {}) => {
  return new Promise(function (resolve, reject) {
    ConnectionCheck.isConnected().then(
      async connected => {
        console.log('Connection status:', connected);
        if (connected) {
          // Get token from props or fallback to AsyncStorage
          let token = props?.headers?.Authorization?.replace('Bearer ', '') || await AsyncStorage.getItem('userToken');
          
          console.log('API URL:', API_BASE_URL + url);
          console.log('Using token:', token ? 'Yes' : 'No');
          
          if (!token) {
            console.error('No authentication token available');
            return reject('Authentication required. Please login again.');
          }
          
          // Prepare headers
          const headers = {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`,
            ...(props?.headers || {}) // Allow overriding headers from props
          };
          
          console.log('Request headers:', JSON.stringify(headers, null, 2));
          
          axios
            .post(API_BASE_URL + url, data, { headers })
            .then(res => {
              console.log(res);
              resolve(res);
            })
            .catch(async err => {
              if (err.response) {
                console.log(err.response.status);
                if (err?.response?.status === 401) {
                  // Clear all auth related data
                  await Promise.all([
                    AsyncStorage.removeItem('userToken'),
                    AsyncStorage.removeItem('userInfo'),
                    AsyncStorage.removeItem('userDetail')
                  ]);
                  
                  // Only navigate if we're not already on an auth screen
                  const currentRoute = navigationRef.current?.getCurrentRoute();
                  const authRoutes = ['Login', 'Signup', 'ForgotPassword'];
                  
                  if (currentRoute && !authRoutes.includes(currentRoute.name)) {
                    reset('Auth');
                  }
                  
                  return reject('Session expired. Please login again.');
                }
                resolve(err.response.data);
              } else {
                reject(err);
              }
            });
        } else {
          reject('No internet connection');
        }
      },
      err => {
        reject(err);
      },
    );
  });
};

const Put = async (url, data, props = {}, retryCount = 0) => {
  return new Promise(async function (resolve, reject) {
    try {
      console.log('[Put] Starting request to:', url);
      
      // Check internet connection
      const connected = await ConnectionCheck.isConnected();
      console.log('[Put] Internet connected:', connected);
      
      if (!connected) {
        console.log('[Put] No internet connection');
        return reject('No internet connection');
      }
      
      // Get token - first check props, then AsyncStorage
      let token = props?.token;
      
      if (!token) {
        try {
          token = await AsyncStorage.getItem('userToken');
          console.log('[Put] Token from AsyncStorage:', token ? 'Found' : 'Not found');
        } catch (storageError) {
          console.error('[Put] Error reading token from AsyncStorage:', storageError);
          return reject('Error reading authentication data');
        }
      } else {
        console.log('[Put] Using token from props');
      }
      
      console.log('[Put] API URL:', API_BASE_URL + url);
      
      if (!token) {
        console.log('[Put] No token available, retry attempt:', retryCount);
        // If no token and we haven't retried yet, wait a bit and try again
        if (retryCount < 2) {  // Increased max retries to 2
          const delay = 1000 * (retryCount + 1); // Increasing delay with each retry
          console.log(`[Put] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return Put(url, data, props, retryCount + 1)
            .then(resolve)
            .catch(reject);
        }
        console.error('[Put] Max retries reached, no token available');
        return reject('Please log in again to continue');
      }
      
      const response = await axios.put(API_BASE_URL + url, data, {
        headers: {
          'Authorization': `jwt ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 15000
      });
      
      console.log('API Response:', response.data);
      resolve(response.data);
      
    } catch (err) {
      console.error('API Error:', err.response?.data || err.message);
      
      if (err.response?.status === 401) {
        console.log('Session expired, clearing auth data...');
        
        // Clear all auth related data
        await Promise.all([
          AsyncStorage.removeItem('userToken'),
          AsyncStorage.removeItem('userInfo'),
          AsyncStorage.removeItem('userDetail')
        ]);
        
        // Only navigate if we're not already on an auth screen
        const currentRoute = navigationRef.current?.getCurrentRoute();
        const authRoutes = ['Login', 'Signup', 'ForgotPassword'];
        
        if (currentRoute && !authRoutes.includes(currentRoute.name)) {
          // Use replace to prevent going back to the expired session
          navigationRef.reset({
            index: 0,
            routes: [{ name: 'Auth' }],
          });
        }
        
        return reject('Session expired. Please login again.');
      }
      
      // For other errors, include the server's error message if available
      const errorMessage = err.response?.data?.message || err.message || 'Request failed';
      reject(errorMessage);
    }
  });
};

const Delete = async (url, data, props) => {
  return new Promise(function (resolve, reject) {
    ConnectionCheck.isConnected().then(
      async connected => {
        console.log(connected);
        if (connected) {
          const token = await AsyncStorage.getItem('userToken');
          console.log(API_BASE_URL + url);
          console.log(`jwt ${token}`);
          
          if (!token) {
            return reject('No authentication token found');
          }
          
          axios
            .delete(API_BASE_URL + url, {
              headers: {
                Authorization: `jwt ${token}`,
              },
            })
            .then(res => {
              console.log(res.data);
              resolve(res.data);
            })
            .catch(async err => {
              if (err.response) {
                if (err?.response?.status === 401) {
                  // Clear all auth related data
                  await Promise.all([
                    AsyncStorage.removeItem('userToken'),
                    AsyncStorage.removeItem('userInfo'),
                    AsyncStorage.removeItem('userDetail')
                  ]);
                  
                  // Only navigate if we're not already on an auth screen
                  const currentRoute = navigationRef.current?.getCurrentRoute();
                  const authRoutes = ['Login', 'Signup', 'ForgotPassword'];
                  
                  if (currentRoute && !authRoutes.includes(currentRoute.name)) {
                    reset('Auth');
                  }
                  
                  return reject('Session expired. Please login again.');
                }
                resolve(err.response.data);
              } else {
                reject(err);
              }
            });
        } else {
          reject('No internet connection');
        }
      },
      err => {
        reject(err);
      },
    );
  });
};


// const ApiFormData = async (img) => {
//   console.log('asddsdsada', img);
//   const user = await AsyncStorage.getItem('userDetail');
//   let userDetail = JSON.parse(user);
//   return new Promise((resolve, reject) => {
//     try {
//       RNFetchBlob.fetch(
//         'POST',
//         `${API_BASE_URL}user/fileupload`,
//         {
//           'Content-Type': 'multipart/form-data',
//           // Authorization: `jwt ${userDetail.token}`,
//         },
//         [
//           {
//             // name: 'file',
//             // filename: img.path.toString(),
//             // type: img.mime,
//             // data: RNFetchBlob.wrap(img.path),
//             name: 'file',
//             filename: img.fileName,
//             type: img.type,
//             data: RNFetchBlob.wrap(Platform.OS === 'ios' ? img.uri.replace('file:///', '') : img.uri),
//           },
//         ],
//       )
//         .then(resp => {
//           // console.log('res============>', resp);
//           resolve(JSON.parse(resp.data));
//         })
//         .catch(err => {
//           console.log(err);
//           reject(err);
//         });
//     } catch (err) {
//       console.log(err);
//       reject(err);
//     }
//   });
// };
// const ApiFormData = async (url, data) => {
//   // console.log(img);
//   const user = await AsyncStorage.getItem('userDetail');
//   let userDetail = JSON.parse(user);
//   return new Promise((resolve, reject) => {
//     try {
//       RNFetchBlob.fetch(
//         'POST',
//         `${API_BASE_URL}${url}`,
//         {
//           'Content-Type': 'multipart/form-data',
//           Authorization: `jwt ${userDetail.token}`,
//         },
//         data,

//       )
//         .then(resp => {
//           // console.log('res============>', resp);
//           resolve(JSON.parse(resp.data));
//         })
//         .catch(err => {
//           console.log(err);
//           reject(err);
//         });
//     } catch (err) {
//       console.log(err);
//       reject(err);
//     }
//   });
// };
// function getDefaultOffDays(year){ 
//   let offdays=new Array();
//  let i=0;
//   for(month=0;month<12;month++) { 
//      let tdays=new Date(year, month, 0).getDate(); 
//       for(date=1;date<=tdays;date++)     {
//           smonth=(month<9)?"0"+(month+1):(month+1);
//           sdate=(date<10)?"0"+date:date;
//           dd=year+"-"+smonth+"-"+sdate;
//           var day=new Date(year,month,date);
//           if(day.getDay() == 0 )              {
//               offdays[i++]=dd;
//           }
//         }
//       }
//       return offdays; 
//     }

// const Api = async (method, url, data) => {
//   return new Promise(function (resolve, reject) {
//     ConnectionCheck.isConnected().then(async connected => {
//       console.log(connected);
//       if (connected) {
//         const user = await AsyncStorage.getItem('userDetail');
//         let userDetail = JSON.parse(user);
//         axios({
//           method,
//           url: API_BASE_URL + url,
//           data,
//           headers: {Authorization: `jwt ${userDetail?.token}`},
//         }).then(
//           res => {
//             resolve(res);
//           },
//           err => {
//             if (err.response) {
//               resolve(err.response.data);
//             } else {
//               resolve(err);
//             }
//           },
//         );
//       } else {
//         reject('No internet connection');
//       }
//     });
//   });
// };

// const Services = async (url, method, props, data) => {
//   return new Promise(function (resolve, reject) {
//     ConnectionCheck.isConnected().then(async connected => {
//       console.log(connected);
//       if (connected) {
//         const user = await AsyncStorage.getItem('userDetail');
//         let userDetail = JSON.parse(user);
//         console.log(API_BASE_URL + url);
//         console.log(`jwt ${userDetail?.token}`);
//         axios[method](API_BASE_URL + url, data, {
//           headers: {
//             Authorization: `jwt ${userDetail?.token}`,
//           },
//         })
//           .then(res => {
//             console.log(res.data);
//             resolve(res.data);
//           })
//           .catch(err => {
//             if (err.response) {
//               console.log(err.response.status);
//               if (err?.response?.status === 401) {
//                 props.setInitial('Signin');
//                 props?.navigation?.navigate('Signin');
//               }
//               resolve(err.response.data);
//             } else {
//               reject(err);
//             }
//           });
//       } else {
//         reject('No internet connection');
//       }
//     });
//   });
// };

const ApiFormData = async (method, url, data, props = {}) => {
  console.log('=== ApiFormData called ===');
  console.log('Method:', method);
  console.log('URL:', url);
  console.log('Data type:', typeof data);
  
  if (data && data._parts) {
    console.log('FormData parts:');
    data._parts.forEach(([key, value], index) => {
      if (typeof value === 'object' && value.uri) {
        console.log(`  [${index}] ${key}:`, { 
          uri: value.uri,
          type: value.type,
          name: value.name,
          size: value.size || 'unknown'
        });
      } else {
        console.log(`  [${index}] ${key}:`, value);
      }
    });
  }
  
  try {
    // Check internet connection
    console.log('Checking internet connection...');
    const connected = await ConnectionCheck.isConnected();
    console.log('Internet connection:', connected ? 'Connected' : 'Disconnected');
    
    if (!connected) {
      throw new Error('No internet connection');
    }

    // Get token
    console.log('Retrieving auth token...');
    const user = await AsyncStorage.getItem('userDetail');
    const userDetail = user ? JSON.parse(user) : null;
    const token = userDetail?.token;

    if (!token) {
      console.error('No authentication token found in userDetail:', userDetail);
      throw new Error('No authentication token found');
    }

    // Set up headers with JWT token format
    const headers = {
      'Content-Type': 'multipart/form-data',
      'Authorization': `jwt ${token}`,  // Changed from Bearer to jwt
      'Accept': 'application/json',
      ...props.headers
    };
    
    console.log('Using token format:', headers.Authorization.split(' ')[0]); // Log token type

    // Log request details
    console.log('=== Request Details ===');
    console.log('Full URL:', API_BASE_URL + url);
    console.log('Method:', method.toUpperCase());
    console.log('Headers:', JSON.stringify(headers, null, 2));
    console.log('Data type:', data.constructor.name);
    
    // Make the request
    console.log('Sending request...');
    const source = axios.CancelToken.source();
    const timeout = setTimeout(() => {
      source.cancel('Request timeout after 30s');
      console.error('Request timed out after 30 seconds');
    }, 30000);

    const config = {
      method: method.toLowerCase(),
      url: API_BASE_URL + url,
      data: data,
      headers: headers,
      cancelToken: source.token,
      timeout: 30000, // 30 seconds timeout
      maxContentLength: 100 * 1024 * 1024, // 100MB
      maxBodyLength: 100 * 1024 * 1024, // 100MB
      validateStatus: function (status) {
        return status >= 200 && status < 500; // Handle all responses as success to handle errors in response
      }
    };

    console.log('Axios config:', JSON.stringify(config, (key, value) => {
      if (key === 'data' && value && value._parts) {
        return '[FormData]';
      }
      return value;
    }, 2));

    const response = await axios(config);
    clearTimeout(timeout);

    console.log('=== Response Received ===');
    console.log('Status:', response.status, response.statusText);
    console.log('Headers:', JSON.stringify(response.headers, null, 2));
    console.log('Response data:', response.data ? JSON.stringify(response.data).substring(0, 1000) : 'No data');
    
    return response.data;
    
  } catch (error) {
    console.error('=== API Error ===');
    
    if (axios.isCancel(error)) {
      console.error('Request was cancelled:', error.message);
      throw new Error('Request was cancelled: ' + error.message);
    } else if (error.response) {
      // Server responded with error status
      console.error('Response error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        headers: error.response.headers,
        data: error.response.data
      });
      throw new Error(
        error.response.data?.message || 
        `Request failed with status ${error.response.status}`
      );
    } else if (error.request) {
      // No response received
      console.error('No response received:', {
        message: error.message,
        code: error.code,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          timeout: error.config?.timeout,
          headers: error.config?.headers
        }
      });
      throw new Error('No response from server. Please check your internet connection.');
    } else {
      // Request setup error
      console.error('Request setup error:', {
        message: error.message,
        stack: error.stack,
        config: error.config
      });
      throw new Error('Failed to send request: ' + error.message);
    }
  } finally {
    console.log('=== ApiFormData completed ===\n');
  }
};

// Export individual functions
export { GetApi, Post, Put, Delete, Postwithimage, ApiFormData };

// Export as Api object for backward compatibility
export const Api = {
  get: GetApi,
  post: Post,
  put: Put,
  delete: Delete,
  postWithImage: Postwithimage
};
