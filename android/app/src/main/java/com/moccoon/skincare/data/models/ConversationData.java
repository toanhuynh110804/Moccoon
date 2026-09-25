package com.moccoon.skincare.data.models;

import com.google.gson.annotations.SerializedName;

public class ConversationData {
    @SerializedName("id")
    private int id;

    @SerializedName("customer_id")
    private int customerId;

    @SerializedName("last_message")
    private String lastMessage;

    public int getId() { return id; }
    public int getCustomerId() { return customerId; }
    public String getLastMessage() { return lastMessage; }
}
