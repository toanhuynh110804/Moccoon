package com.moccoon.skincare.data.api;

import android.util.Log;
import com.moccoon.skincare.utils.Constants;
import io.socket.client.IO;
import io.socket.client.Socket;
import java.net.URI;
import java.util.Collections;

public class SocketManager {
    private static final String TAG = "SocketManager";
    private static Socket mSocket;

    public static synchronized Socket getSocket(String token) {
        if (mSocket == null || !mSocket.connected()) {
            try {
                IO.Options options = IO.Options.builder()
                        .setAuth(Collections.singletonMap("token", token))
                        .setReconnection(true)
                        .setReconnectionAttempts(5)
                        .setReconnectionDelay(1000)
                        .build();

                mSocket = IO.socket(URI.create(Constants.SOCKET_URL), options);
                mSocket.connect();
                Log.d(TAG, "Connecting to Socket.io at: " + Constants.SOCKET_URL);
            } catch (Exception e) {
                Log.e(TAG, "Socket connection error: " + e.getMessage());
            }
        }
        return mSocket;
    }

    public static void disconnect() {
        if (mSocket != null) {
            mSocket.disconnect();
            mSocket = null;
        }
    }
}
