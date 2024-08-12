import io from 'socket.io-client';
import constants from '../constants';
import * as types from './actionTypes';

const baseUrl = `http://monitor-scale.${constants.minikubeIp}.xip.io`;
const socket = io(baseUrl, { transports: ['websocket'] });

export function getPods() {
  return dispatch => {
    return fetch(`${baseUrl}/pods`)
      .then(resp => {
        if (!resp.ok) {
          throw new Error(`HTTP error! status: ${resp.status}`);
        }
        return resp.text();
      })
      .then(text => {
        try {
          const json = JSON.parse(text); 
          const pods = json.pods.map(pod => concatServiceName(pod.key));
          dispatch({ type: types.websocket.GET_PODS, pods });
        } catch (error) {
          console.error('Error parsing JSON:', error);
          console.log('Received text:', text);
          throw error;
        }
      })
      .catch(err => {
        console.error('Error fetching pods:', err);
        throw err;
      });
  };
}

export function connectToSocket () {
  return dispatch => {
    dispatch({ type: types.websocket.CONNECTION_LOADING });

    socket.on('connect', () => {
      console.log('Connected to WebSocket');
      dispatch({ type: 'CONNECT_TO_SOCKET' });
    });

    socket.on('pods', (data) => {
      console.log('Received pods data:', data); // Thêm log để kiểm tra dữ liệu nhận được

      if (data && data.pods) {
        const pods = data.pods.map(pod => concatServiceName(pod));
        console.log('Parsed pods:', pods);

        if (data.action === 'set') {
          dispatch({ type: types.websocket.POD_UP, pods });
        } else if (data.action === 'delete') {
          dispatch({ type: types.websocket.POD_DOWN, pods });
        } else {
          console.error('Unknown action:', data.action);
        }
      } else {
        console.error('data.pods is undefined or data is null');
      }
    });

    socket.on('hit', (data) => {
      console.log('Received hit data:', data); // Thêm log để kiểm tra dữ liệu nhận được

      if (data && data.podId) {
        const activeInstance = concatServiceName(data.podId);
        console.log('Active instance:', activeInstance);
        dispatch({ type: types.websocket.ACTIVE_INSTANCE, activeInstance });
      } else {
        console.error('data.podId is undefined or data is null');
      }
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
      dispatch({ type: 'DISCONNECT_FROM_SOCKET' });
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  };
}

export function disconnectFromSocket () {
  return dispatch => {
    socket.close(() => {
      console.log('Closed WebSocket connection');
      dispatch({ type: 'DISCONNECT_FROM_SOCKET' });
    });
  };
}

export function scale (data) {
  return dispatch => {
    const submission = JSON.stringify({ count: data });
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');

    return fetch(`${baseUrl}/scale`, {
      method: 'POST',
      headers,
      body: submission
    })
    .then(resp => {
      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`);
      }
      return resp.json();
    })
    .catch(err => {
      console.error('Error scaling pods:', err);
      throw err;
    });
  };
}

export function submitConcurrentRequests (count) {
  return dispatch => {
    const submission = JSON.stringify({ count });
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');

    return fetch(`${baseUrl}/loadtest/concurrent`, {
      method: 'POST',
      headers,
      body: submission
    })
    .then(resp => {
      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`);
      }
      return resp.json();
    })
    .catch(err => {
      console.error('Error submitting concurrent requests:', err);
      throw err;
    });
  };
}

export function submitConsecutiveRequests (count) {
  return dispatch => {
    const submission = JSON.stringify({ count });
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');

    return fetch(`${baseUrl}/loadtest/consecutive`, {
      method: 'POST',
      headers,
      body: submission
    })
    .then(resp => {
      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`);
      }
      return resp.json();
    })
    .catch(err => {
      console.error('Error submitting consecutive requests:', err);
      throw err;
    });
  };
}

function concatServiceName (name) {
  if (typeof name === 'string') {
    const parts = name.split('/');
    const serviceName = parts[parts.length - 1];
    console.log('Concatenated service name:', serviceName);
    return serviceName;
  } else {
    console.error('Invalid name format:', name);
    return '';
  }
}
