package com.moccoon.skincare.data.models;

import com.google.gson.annotations.SerializedName;

public class ChatMessage {
    @SerializedName("id")
    private int id;

    @SerializedName("conversation_id")
    private int conversationId;

    @SerializedName("sender_id")
    private int senderId;

    @SerializedName("sender_type")
    private String senderType; // "CUSTOMER" or "ADMIN"

    @SerializedName("sender_name")
    private String senderName;

    @SerializedName("message_text")
    private String messageText;

    @SerializedName("image_url")
    private String imageUrl;

    @SerializedName("created_at")
    private String createdAt;

    public ChatMessage() {}

    public ChatMessage(int conversationId, int senderId, String senderType, String messageText) {
        this.conversationId = conversationId;
        this.senderId = senderId;
        this.senderType = senderType;
        this.messageText = messageText;
    }

    public int getId() { return id; }
    public int getConversationId() { return conversationId; }
    public int getSenderId() { return senderId; }
    public String getSenderType() { return senderType; }
    public String getSenderName() { return senderName; }
    public String getMessageText() { return messageText; }
    public String getImageUrl() { return imageUrl; }
    public String getCreatedAt() { return createdAt; }

    public boolean isCustomer() {
        return "CUSTOMER".equalsIgnoreCase(senderType);
    }
}
