package com.moccoon.skincare.utils;

import android.content.Context;
import android.content.SharedPreferences;

public class SessionManager {
    private final SharedPreferences pref;
    private final SharedPreferences.Editor editor;

    public SessionManager(Context context) {
        pref = context.getSharedPreferences(Constants.PREF_NAME, Context.MODE_PRIVATE);
        editor = pref.edit();
    }

    public void saveAuth(String token, int userId, String fullName, String email, String phone, String role, String address, String avatar) {
        editor.putString(Constants.KEY_TOKEN, token);
        editor.putInt(Constants.KEY_USER_ID, userId);
        editor.putString(Constants.KEY_FULL_NAME, fullName);
        editor.putString(Constants.KEY_EMAIL, email);
        editor.putString(Constants.KEY_PHONE, phone);
        editor.putString(Constants.KEY_ROLE, role);
        editor.putString(Constants.KEY_ADDRESS, address);
        editor.putString(Constants.KEY_AVATAR, avatar);
        editor.apply();
    }

    public boolean isLoggedIn() {
        return pref.getString(Constants.KEY_TOKEN, null) != null;
    }

    public boolean isAdmin() {
        return "ADMIN".equalsIgnoreCase(pref.getString(Constants.KEY_ROLE, ""));
    }

    public String getToken() {
        return pref.getString(Constants.KEY_TOKEN, "");
    }

    public int getUserId() {
        return pref.getInt(Constants.KEY_USER_ID, 0);
    }

    public String getFullName() {
        return pref.getString(Constants.KEY_FULL_NAME, "Khách hàng");
    }

    public String getEmail() {
        return pref.getString(Constants.KEY_EMAIL, "");
    }

    public String getPhone() {
        return pref.getString(Constants.KEY_PHONE, "");
    }

    public String getAddress() {
        return pref.getString(Constants.KEY_ADDRESS, "");
    }

    public String getRole() {
        return pref.getString(Constants.KEY_ROLE, "CUSTOMER");
    }

    public void logout() {
        editor.clear();
        editor.apply();
    }
}
