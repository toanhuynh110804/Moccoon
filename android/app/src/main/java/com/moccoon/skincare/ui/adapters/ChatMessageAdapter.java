package com.moccoon.skincare.ui.adapters;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.moccoon.skincare.R;
import com.moccoon.skincare.data.models.ChatMessage;
import java.util.ArrayList;
import java.util.List;

public class ChatMessageAdapter extends RecyclerView.Adapter<ChatMessageAdapter.MessageViewHolder> {
    private List<ChatMessage> messages = new ArrayList<>();

    public void setMessages(List<ChatMessage> messages) {
        this.messages = messages != null ? messages : new ArrayList<>();
        notifyDataSetChanged();
    }

    public void addMessage(ChatMessage message) {
        this.messages.add(message);
        notifyItemInserted(this.messages.size() - 1);
    }

    @NonNull
    @Override
    public MessageViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_chat_message, parent, false);
        return new MessageViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull MessageViewHolder holder, int position) {
        ChatMessage message = messages.get(position);
        boolean isCustomer = message.isCustomer();

        if (isCustomer) {
            holder.layoutCustomer.setVisibility(View.VISIBLE);
            holder.layoutAdmin.setVisibility(View.GONE);
            holder.tvCustomerText.setText(message.getMessageText());
            holder.tvCustomerTime.setText(formatTime(message.getCreatedAt()));
        } else {
            holder.layoutCustomer.setVisibility(View.GONE);
            holder.layoutAdmin.setVisibility(View.VISIBLE);
            holder.tvAdminText.setText(message.getMessageText());
            holder.tvAdminName.setText(message.getSenderName() != null ? message.getSenderName() : "Chuyên viên Moccoon");
            holder.tvAdminTime.setText(formatTime(message.getCreatedAt()));
        }
    }

    private String formatTime(String dateStr) {
        if (dateStr == null || dateStr.length() < 16) return "";
        try {
            return dateStr.substring(11, 16);
        } catch (Exception e) {
            return "";
        }
    }

    @Override
    public int getItemCount() {
        return messages.size();
    }

    static class MessageViewHolder extends RecyclerView.ViewHolder {
        LinearLayout layoutAdmin, layoutCustomer;
        TextView tvAdminName, tvAdminText, tvAdminTime;
        TextView tvCustomerText, tvCustomerTime;

        public MessageViewHolder(@NonNull View itemView) {
            super(itemView);
            layoutAdmin = itemView.findViewById(R.id.layoutAdminMessage);
            layoutCustomer = itemView.findViewById(R.id.layoutCustomerMessage);
            tvAdminName = itemView.findViewById(R.id.tvAdminSenderName);
            tvAdminText = itemView.findViewById(R.id.tvAdminMessageText);
            tvAdminTime = itemView.findViewById(R.id.tvAdminTime);
            tvCustomerText = itemView.findViewById(R.id.tvCustomerMessageText);
            tvCustomerTime = itemView.findViewById(R.id.tvCustomerTime);
        }
    }
}
