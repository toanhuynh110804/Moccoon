package com.moccoon.skincare.utils;

public class Constants {
    // 10.0.2.2 là địa chỉ IP của máy chủ host khi chạy trên Android Emulator
    // Đối với máy thật chạy qua Wi-Fi nội bộ, thay bằng IP máy tính của bạn (VD: "http://192.168.1.5:5000/api/")
    public static final String BASE_URL = "http://10.0.2.2:5000/api/";
    public static final String SOCKET_URL = "http://10.0.2.2:5000";

    public static final String PREF_NAME = "moccoon_pref";
    public static final String KEY_TOKEN = "jwt_token";
    public static final String KEY_USER_ID = "user_id";
    public static final String KEY_FULL_NAME = "user_full_name";
    public static final String KEY_EMAIL = "user_email";
    public static final String KEY_PHONE = "user_phone";
    public static final String KEY_ROLE = "user_role";
    public static final String KEY_ADDRESS = "user_address";
    public static final String KEY_AVATAR = "user_avatar";
}
