package com.moccoon.skincare.data.models;

import com.google.gson.annotations.SerializedName;

public class User {
    @SerializedName("id")
    private int id;

    @SerializedName("full_name")
    private String fullName;

    @SerializedName("email")
    private String email;

    @SerializedName("phone")
    private String phone;

    @SerializedName("role")
    private String role;

    @SerializedName("avatar_url")
    private String avatarUrl;

    @SerializedName("address")
    private String address;

    @SerializedName("is_active")
    private boolean isActive;

    public int getId() { return id; }
    public String getFullName() { return fullName; }
    public String getEmail() { return email; }
    public String getPhone() { return phone; }
    public String getRole() { return role; }
    public String getAvatarUrl() { return avatarUrl; }
    public String getAddress() { return address; }
    public boolean isActive() { return isActive; }
}
