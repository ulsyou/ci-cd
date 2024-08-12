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
        return resp.text(); // Change this line from resp.json() to resp.text()
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
      dispatch({ type: 'CONNECT_TO_SOCKET' });
    });
    socket.on('pods', (data) => {
      console.log('Received pods data:', data); // Thêm log để kiểm tra dữ liệu nhận được
      if (data.pods) {
        const pod = concatServiceName(data.pods);

        if (data.action === 'set') {
          dispatch({ type: types.websocket.POD_UP, pod });
        } else if (data.action === 'delete') {
          dispatch({ type: types.websocket.POD_DOWN, pod });
        }
      } else {
        console.error('data.pods is undefined');
      }
    });
    socket.on('hit', (data) => {
      console.log('Received hit data:', data); // Thêm log để kiểm tra dữ liệu nhận được
      if (data.podId) {
        const activeInstance = concatServiceName(data.podId);
        dispatch({ type: types.websocket.ACTIVE_INSTANCE, activeInstance });
      } else {
        console.error('data.podId is undefined');
      }
    });
  };
}

export function disconnectFromSocket () {
  return dispatch => {
    socket.close(() => {
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
    .catch(err => {
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
    .catch(err => {
      throw err;
    });
  };
}

function concatServiceName (name) {
  if (typeof name === 'string') {
    const parts = name.split('/');
    const serviceName = parts[parts.length - 1];
    return serviceName;
  } else {
    console.error('Invalid name format:', name);
    return '';
  }
}
