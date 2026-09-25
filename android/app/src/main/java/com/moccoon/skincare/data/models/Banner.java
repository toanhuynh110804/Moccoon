package com.moccoon.skincare.data.models;

import com.google.gson.annotations.SerializedName;

public class Banner {
    @SerializedName("id")
    private int id;

    @SerializedName("title")
    private String title;

    @SerializedName("subtitle")
    private String subtitle;

    @SerializedName("image_url")
    private String imageUrl;

    @SerializedName("link_url")
    private String linkUrl;

    @SerializedName("badge_text")
    private String badgeText;

    public int getId() { return id; }
    public String getTitle() { return title; }
    public String getSubtitle() { return subtitle; }
    public String getImageUrl() { return imageUrl; }
    public String getLinkUrl() { return linkUrl; }
    public String getBadgeText() { return badgeText; }
}
