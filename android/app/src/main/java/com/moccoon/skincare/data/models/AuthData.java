package com.moccoon.skincare.data.models;

import com.google.gson.annotations.SerializedName;

public class AuthData {
    @SerializedName("token")
    private String token;

    @SerializedName("user")
    private User user;

    public String getToken() { return token; }
    public User getUser() { return user; }
}
